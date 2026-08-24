import { prisma } from "../src/shared/lib/prisma";
import fs from "fs";
import path from "path";
import zlib from "zlib";

async function main() {
  const gzPath = path.join(__dirname, "..", "NSE.csv.gz");
  console.log("Reading Upstox instrument master file from:", gzPath);

  if (!fs.existsSync(gzPath)) {
    console.error("Error: NSE.csv.gz not found at", gzPath);
    process.exit(1);
  }

  const compressedBuf = fs.readFileSync(gzPath);
  const csvText = zlib.gunzipSync(compressedBuf).toString("utf-8");
  const lines = csvText.split("\n");

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

  const IPO_SYMBOLS = new Set(["AARTIPHARM", "SUDEEPPHAR", "SKYGOLD", "EIEL", "KCK", "KISSHT"]);

  const parsedStocks: {
    symbol: string;
    name: string;
    instrumentKey: string;
    exchange: string;
    sector: string;
    lastPrice: number;
    indices: string[];
    isIPO: boolean;
  }[] = [];

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

          parsedStocks.push({
            symbol: sym,
            name: name || sym,
            instrumentKey: instrument_key,
            exchange: "NSE",
            sector: "General Equities",
            lastPrice: price,
            indices: indices,
            isIPO: IPO_SYMBOLS.has(sym),
          });
        }
      }
    }
  }

  console.log(`Extracted ${parsedStocks.length} corporate equities. Upserting into Prisma Database table NseStock...`);

  let count = 0;
  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < parsedStocks.length; i += BATCH_SIZE) {
    const batch = parsedStocks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((stock) =>
        prisma.nseStock.upsert({
          where: { symbol: stock.symbol },
          update: {
            name: stock.name,
            instrumentKey: stock.instrumentKey,
            lastPrice: stock.lastPrice,
            indices: stock.indices,
            isIPO: stock.isIPO,
          },
          create: stock,
        })
      )
    );
    count += batch.length;
    console.log(`Upserted ${count} / ${parsedStocks.length} stocks into NseStock table...`);
  }

  console.log(`Successfully seeded ${count} NSE stocks into database table NseStock!`);
}

main()
  .catch((e) => {
    console.error("Error seeding NSE stocks:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
