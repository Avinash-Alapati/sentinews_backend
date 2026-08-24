import fs from "fs";
import path from "path";
import zlib from "zlib";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/utils/logger";

export interface StockMasterItem {
  symbol: string;
  name: string;
  instrument_key?: string;
  lastPrice?: number;
  isin?: string;
  exchange: "NSE" | "BSE";
  sector?: string;
  indices: string[];
  isIPO?: boolean;
  listingDate?: string;
}

/**
 * Enterprise Stock Master Service maintaining the official database registry of
 * 3,700+ Indian equities, index constituents, and newly listed IPO stocks
 * parsed directly from the local Upstox NSE.csv.gz master file and stored in PostgreSQL.
 */
export class StockMasterService {
  private masterCache: Map<string, StockMasterItem> = new Map();
  private lastSyncedAt: Date | null = null;
  private dailyRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initMasterCatalog();
    this.scheduleDailyRefresh();
  }

  /**
   * Schedules automatic daily refresh of Upstox Master File (every 24 hours).
   */
  private scheduleDailyRefresh() {
    if (this.dailyRefreshTimer) clearInterval(this.dailyRefreshTimer);
    this.dailyRefreshTimer = setInterval(() => {
      this.downloadAndRefreshMasterFile().catch((err) => {
        logger.error({ context: "StockMasterService" }, `Daily auto-refresh error: ${err?.message || err}`);
      });
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Downloads fresh NSE.csv.gz from Upstox CDN and updates master database catalog.
   */
  public async downloadAndRefreshMasterFile(): Promise<boolean> {
    try {
      logger.info({ context: "StockMasterService" }, "Downloading fresh Upstox NSE.csv.gz master file from CDN...");
      const res = await fetch("https://assets.upstox.com/market-quote/instruments/exchange/NSE.csv.gz");
      if (!res.ok) {
        throw new Error(`Upstox CDN HTTP ${res.status}: ${res.statusText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const gzPath = path.join(process.cwd(), "NSE.csv.gz");
      fs.writeFileSync(gzPath, buffer);
      logger.info({ context: "StockMasterService" }, `Saved fresh NSE.csv.gz (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

      await this.initMasterCatalog();
      await this.syncToDatabase();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ context: "StockMasterService" }, `Failed to download fresh Upstox master file: ${msg}`);
      return false;
    }
  }

  /**
   * Initializes master catalog by attempting to parse local NSE.csv.gz first,
   * falling back to default seed catalog if missing.
   */
  private async initMasterCatalog() {
    let parsedCount = 0;
    try {
      const gzPath = path.join(process.cwd(), "NSE.csv.gz");
      if (fs.existsSync(gzPath)) {
        logger.info({ context: "StockMasterService" }, `Parsing local Upstox master file at ${gzPath}`);
        const compressedBuf = fs.readFileSync(gzPath);
        const csvText = zlib.gunzipSync(compressedBuf).toString("utf-8");
        const lines = csvText.split("\n");

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ""));
          if (cols.length >= 12) {
            const [
              instrument_key,
              , // exchange_token
              tradingsymbol,
              name,
              last_price,
              , // expiry
              , // strike
              , // tick_size
              , // lot_size
              instrument_type,
              , // option_type
              exchange,
            ] = cols;

            if (instrument_type === "EQUITY" && exchange === "NSE_EQ") {
              const isBond =
                /^[0-9]+[A-Z]+[0-9]+$/.test(tradingsymbol) ||
                name.startsWith("SDL ") ||
                name.startsWith("GS ") ||
                name.startsWith("GOI STRIPS");

              if (!isBond && tradingsymbol) {
                const sym = tradingsymbol.toUpperCase();
                const price = parseFloat(last_price) || 0;

                // Determine default index mappings
                const indices: string[] = ["niftyTotalMarket"];
                if (NIFTY50_SYMBOLS.has(sym)) {
                  indices.push("nifty50", "nifty100", "nifty500", "sensex");
                } else if (NIFTY100_SYMBOLS.has(sym)) {
                  indices.push("nifty100", "nifty500");
                } else if (NIFTY500_SYMBOLS.has(sym)) {
                  indices.push("nifty500");
                }

                if (IPO_SYMBOLS.has(sym)) {
                  indices.push("ipo");
                }

                this.masterCache.set(sym, {
                  symbol: sym,
                  name: name || sym,
                  instrument_key: instrument_key,
                  lastPrice: price,
                  exchange: "NSE",
                  sector: inferSector(sym, name || sym),
                  indices: indices,
                  isIPO: IPO_SYMBOLS.has(sym),
                });
                parsedCount++;
              }
            }
          }
        }
        this.lastSyncedAt = new Date();
        logger.info({ context: "StockMasterService" }, `Successfully loaded ${parsedCount} equities from NSE.csv.gz`);

        // Async sync to database table NseStock
        this.syncToDatabase().catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          logger.error({ context: "StockMasterService" }, `Database sync background error: ${msg}`);
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ context: "StockMasterService" }, `Error parsing NSE.csv.gz: ${msg}`);
    }

    if (this.masterCache.size === 0) {
      this.seedDefaultBroadMarketCatalog();
    }
  }

  /**
   * Syncs in-memory stock catalog into database table NseStock in batches.
   */
  public async syncToDatabase(): Promise<number> {
    const items = Array.from(this.masterCache.values());
    if (items.length === 0) return 0;

    let syncedCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((item) =>
          prisma.nseStock.upsert({
            where: { symbol: item.symbol },
            update: {
              name: item.name,
              instrumentKey: item.instrument_key,
              lastPrice: item.lastPrice || 0,
              indices: item.indices,
              isIPO: item.isIPO || false,
              sector: item.sector || "General Equities",
            },
            create: {
              symbol: item.symbol,
              name: item.name,
              instrumentKey: item.instrument_key,
              exchange: "NSE",
              sector: item.sector || "General Equities",
              lastPrice: item.lastPrice || 0,
              indices: item.indices,
              isIPO: item.isIPO || false,
            },
          })
        )
      );
      syncedCount += batch.length;
    }

    logger.info({ context: "StockMasterService" }, `Successfully synced ${syncedCount} stocks to PostgreSQL database NseStock table.`);
    return syncedCount;
  }

  /**
   * Default fallback catalog in case NSE.csv.gz is missing or unreadable.
   */
  private seedDefaultBroadMarketCatalog() {
    const catalog: StockMasterItem[] = [
      { symbol: "AARTIPHARM", name: "Aarti Pharmalabs Ltd.", exchange: "NSE", sector: "Healthcare & Pharma", indices: ["niftyTotalMarket", "nifty500", "ipo"], isIPO: true },
      { symbol: "HITACHINRG", name: "Hitachi Energy India Ltd.", exchange: "NSE", sector: "Capital Goods", indices: ["niftyTotalMarket", "nifty500"], isIPO: false },
      { symbol: "SUDEEPPHAR", name: "Sudeep Pharma Ltd.", exchange: "NSE", sector: "Healthcare & Pharma", indices: ["niftyTotalMarket", "nifty500", "ipo"], isIPO: true },
      { symbol: "PAYTM", name: "One97 Communications Ltd (Paytm)", exchange: "NSE", sector: "Consumer Tech", indices: ["niftyTotalMarket", "nifty500"], isIPO: false },
      { symbol: "ELECTMKT", name: "Electronics Mart India Ltd.", exchange: "NSE", sector: "Consumer Retail", indices: ["niftyTotalMarket", "nifty500"], isIPO: false },
      { symbol: "SKYGOLD", name: "Sky Gold and Diamonds Ltd.", exchange: "NSE", sector: "Consumer Retail", indices: ["niftyTotalMarket", "nifty500", "ipo"], isIPO: true },
      { symbol: "NEOGEN", name: "Neogen Chemicals Ltd.", exchange: "NSE", sector: "Chemicals", indices: ["niftyTotalMarket", "nifty500"], isIPO: false },
      { symbol: "SHAILY", name: "Shaily Engineering Plastics Ltd.", exchange: "NSE", sector: "Industrial", indices: ["niftyTotalMarket", "nifty500"], isIPO: false },
      { symbol: "RELIANCE", name: "Reliance Industries Ltd.", exchange: "NSE", sector: "Energy & Oil", indices: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"] },
      { symbol: "TCS", name: "Tata Consultancy Services Ltd.", exchange: "NSE", sector: "Information Tech", indices: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"] },
      { symbol: "INFY", name: "Infosys Limited", exchange: "NSE", sector: "Information Tech", indices: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"] },
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", sector: "Banking & Finance", indices: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"] },
    ];

    for (const item of catalog) {
      this.masterCache.set(item.symbol, item);
    }
    this.lastSyncedAt = new Date();
  }

  public getAllStocks(): StockMasterItem[] {
    return Array.from(this.masterCache.values());
  }

  public getStocksCount(): number {
    return this.masterCache.size;
  }

  public getStocksByIndex(indexKey: string): StockMasterItem[] {
    if (indexKey === "niftyTotalMarket" || indexKey === "all") {
      return this.getAllStocks();
    }
    if (indexKey === "ipo") {
      return this.getAllStocks().filter((item) => Boolean(item.isIPO) || item.indices.includes("ipo"));
    }
    return this.getAllStocks().filter((item) => item.indices.includes(indexKey));
  }

  public getStockBySymbol(symbol: string): StockMasterItem | undefined {
    return this.masterCache.get(symbol.toUpperCase());
  }

  public getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }
}

const NIFTY50_SYMBOLS = new Set([
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "WIPRO", "HINDUNILVR",
  "LT", "AXISBANK", "KOTAKBANK", "TATAMOTORS", "TATASTEEL", "MARUTI", "SUNPHARMA", "ASIANPAINT", "HCLTECH",
  "TITAN", "ULTRACEMCO", "BAJFINANCE", "NTPC", "POWERGRID", "TECHM", "INDUSINDBK", "JSWSTEEL", "M&M",
  "BAJAJFINSV", "BEL", "LTIM", "COALINDIA", "ADANIENT", "ADANIPORTS", "EICHERMOT", "HEROMOTOCO", "GRASIM",
  "BPCL", "CIPLA", "APOLLOHOSP", "DIVISLAB", "TATACONSUM", "HDFCLIFE", "SBILIFE", "BRITANNIA", "TRENT",
  "SHRIRAMFIN", "PIDILITIND", "ZOMATO", "VBL"
]);

const NIFTY100_SYMBOLS = new Set([
  ...Array.from(NIFTY50_SYMBOLS),
  "SIEMENS", "MOTHERSON", "HAL", "VEDL", "RECLTD", "PFC", "ABB", "CHOLAFIN", "DLF", "IOC"
]);

const NIFTY500_SYMBOLS = new Set([
  ...Array.from(NIFTY100_SYMBOLS),
  "AARTIPHARM", "HITACHINRG", "SUDEEPPHAR", "PAYTM", "ELECTMKT", "SKYGOLD", "NEOGEN", "SHAILY",
  "CROMPTON", "SULA", "KALYANKJIL", "VAITECH", "CRISIL", "SUZLON", "YESBANK", "IDEA", "BHEL", "POLICYBZR"
]);

const IPO_SYMBOLS = new Set([
  "AARTIPHARM", "SUDEEPPHAR", "SKYGOLD", "EIEL", "KCK", "KISSHT"
]);

export function inferSector(symbol: string, name: string): string {
  const s = (symbol || "").toUpperCase();
  const n = (name || "").toUpperCase();

  if (SECTOR_DIRECTORY[s]) return SECTOR_DIRECTORY[s];

  if (
    n.includes("BANK") || n.includes("FINANCE") || n.includes("FINANCIAL") ||
    n.includes("CAPITAL") || n.includes("INSURANCE") || n.includes("INVESTMENT") ||
    n.includes("SECURITIES") || n.includes("HOLDINGS") || n.includes("CREDIT") ||
    n.includes("LEASING") || n.includes("HOUSING") || n.includes("MUTUAL") ||
    s.endsWith("BANK") || s.endsWith("FIN")
  ) {
    return "Banking & Financial Services";
  }

  if (
    n.includes("TECH") || n.includes("SOFTWARE") || n.includes("INFOTECH") ||
    n.includes("COMPUTERS") || n.includes("DIGITAL") || n.includes("SYSTEMS") ||
    n.includes("NETWORKS") || n.includes("CYBER") || n.includes("INFO") ||
    n.includes("DATA") || s.startsWith("TECH")
  ) {
    return "Information Technology";
  }

  if (
    n.includes("PHARMA") || n.includes("HEALTH") || n.includes("HOSPITAL") ||
    n.includes("LABORATOR") || n.includes("DRUG") || n.includes("BIOTECH") ||
    n.includes("REMEDIES") || n.includes("LIFE SCIENCE") || n.includes("MEDICINE") ||
    n.includes("CLINIC") || n.includes("DIAGNOSTIC")
  ) {
    return "Healthcare & Pharma";
  }

  if (
    n.includes("MOTOR") || n.includes("AUTO") || n.includes("ENGINE") ||
    n.includes("TYRE") || n.includes("TIRE") || n.includes("BEARING") ||
    n.includes("MACHINERY") || n.includes("EQUIPMENT") || n.includes("CASTING") ||
    n.includes("FORGING") || n.includes("VALVE") || n.includes("PUMP")
  ) {
    return "Automotive & Industrial";
  }

  if (
    n.includes("CONSUMER") || n.includes("FOOD") || n.includes("RETAIL") ||
    n.includes("JEWEL") || n.includes("GOLD") || n.includes("FOOTWEAR") ||
    n.includes("FASHION") || n.includes("TEXTILE") || n.includes("BEVERAGE") ||
    n.includes("BREWER") || n.includes("DAIRY") || n.includes("SUGAR") ||
    n.includes("PACKAGING") || n.includes("TEA") || n.includes("APPAREL")
  ) {
    return "Consumer Goods & Retail";
  }

  if (
    n.includes("POWER") || n.includes("ENERGY") || n.includes("OIL") ||
    n.includes("GAS") || n.includes("PETRO") || n.includes("RENEWABLE") ||
    n.includes("SOLAR") || n.includes("WIND") || n.includes("COAL") ||
    n.includes("GRID") || n.includes("ELECTRIC")
  ) {
    return "Energy & Oil";
  }

  if (
    n.includes("INFRA") || n.includes("BUILD") || n.includes("CONSTRUCT") ||
    n.includes("STEEL") || n.includes("METAL") || n.includes("MINING") ||
    n.includes("CEMENT") || n.includes("DEVELOPER") || n.includes("REALTY") ||
    n.includes("HOUSING") || n.includes("PIPE") || n.includes("ALUMINIUM") ||
    n.includes("COPPER") || n.includes("IRON")
  ) {
    return "Infrastructure & Metals";
  }

  if (n.includes("TELECOM") || n.includes("COMMUNICATION") || n.includes("MOBILE")) {
    return "Telecom & Communications";
  }

  return "Diversified Equities";
}

const SECTOR_DIRECTORY: Record<string, string> = {
  RELIANCE: "Energy & Oil",
  TCS: "Information Technology",
  INFY: "Information Technology",
  HDFCBANK: "Banking & Financial Services",
  ICICIBANK: "Banking & Financial Services",
  SBIN: "Banking & Financial Services",
  PAYTM: "Banking & Financial Services",
  AARTIPHARM: "Healthcare & Pharma",
  HITACHINRG: "Automotive & Industrial",
  SUDEEPPHAR: "Healthcare & Pharma",
  ELECTMKT: "Consumer Goods & Retail",
  SKYGOLD: "Consumer Goods & Retail",
  NEOGEN: "Chemicals & Materials",
  SHAILY: "Automotive & Industrial",
};

export const stockMasterService = new StockMasterService();
