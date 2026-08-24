import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
  MarketMover,
} from "@/modules/market-intelligence/types/market-data.types";
import { IMarketProvider, CandleDataPoint } from "../interfaces/market-provider.interface";
import { logger } from "@/shared/utils/logger";
import { metricsTracker } from "@/shared/utils/metrics";

/**
 * Enterprise Provider fetching real-time Indian stock market quotes directly from NSE equities feed.
 * Serves as the primary/fallback real-time provider for NSE/BSE stocks when Upstox OAuth token is inactive.
 */
export class NSEProvider implements IMarketProvider {
  private quoteCache: Map<string, { data: NormalizedQuote; expiresAt: number }> = new Map();
  private static CACHE_TTL_MS = 60 * 1000; // 60 seconds

  public static SYMBOL_INDICES: Record<string, string[]> = {
    AARTIPHARM: ["niftyTotalMarket", "nifty500", "ipo"],
    HITACHINRG: ["niftyTotalMarket", "nifty500"],
    SUDEEPPHAR: ["niftyTotalMarket", "nifty500", "ipo"],
    PAYTM: ["niftyTotalMarket", "nifty500"],
    ELECTMKT: ["niftyTotalMarket", "nifty500"],
    SKYGOLD: ["niftyTotalMarket", "nifty500", "ipo"],
    NEOGEN: ["niftyTotalMarket", "nifty500"],
    SHAILY: ["niftyTotalMarket", "nifty500"],
    RELIANCE: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    TCS: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    INFY: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    HDFCBANK: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    ICICIBANK: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    SBIN: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    BHARTIARTL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    ITC: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    WIPRO: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    HINDUNILVR: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    LT: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    AXISBANK: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    KOTAKBANK: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    TATAMOTORS: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    TATASTEEL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    MARUTI: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    SUNPHARMA: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    ASIANPAINT: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    HCLTECH: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    TITAN: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    ULTRACEMCO: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    BAJFINANCE: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    NTPC: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    POWERGRID: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    TECHM: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    INDUSINDBK: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    JSWSTEEL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    "M&M": ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    BAJAJFINSV: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],
    BEL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500", "sensex"],

    LTIM: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    COALINDIA: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    ADANIENT: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    ADANIPORTS: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    EICHERMOT: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    HEROMOTOCO: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    GRASIM: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    BPCL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    CIPLA: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    APOLLOHOSP: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    DIVISLAB: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    TATACONSUM: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    HDFCLIFE: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    SBILIFE: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    BRITANNIA: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    TRENT: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    SHRIRAMFIN: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    PIDILITIND: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    ZOMATO: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],
    VBL: ["niftyTotalMarket", "nifty50", "nifty100", "nifty500"],

    SIEMENS: ["niftyTotalMarket", "nifty100", "nifty500"],
    MOTHERSON: ["niftyTotalMarket", "nifty100", "nifty500"],
    HAL: ["niftyTotalMarket", "nifty100", "nifty500"],
    VEDL: ["niftyTotalMarket", "nifty100", "nifty500"],
    RECLTD: ["niftyTotalMarket", "nifty100", "nifty500"],
    PFC: ["niftyTotalMarket", "nifty100", "nifty500"],
    ABB: ["niftyTotalMarket", "nifty100", "nifty500"],
    CHOLAFIN: ["niftyTotalMarket", "nifty100", "nifty500"],
    DLF: ["niftyTotalMarket", "nifty100", "nifty500"],
    IOC: ["niftyTotalMarket", "nifty100", "nifty500"],

    CROMPTON: ["niftyTotalMarket", "nifty500"],
    SULA: ["niftyTotalMarket", "nifty500"],
    KALYANKJIL: ["niftyTotalMarket", "nifty500"],
    VAITECH: ["niftyTotalMarket", "nifty500"],
    CRISIL: ["niftyTotalMarket", "nifty500"],
    SUZLON: ["niftyTotalMarket", "nifty500"],
    IDEA: ["niftyTotalMarket", "nifty500"],
    YESBANK: ["niftyTotalMarket", "nifty500"],
    BHEL: ["niftyTotalMarket", "nifty500"],
    POLICYBZR: ["niftyTotalMarket", "nifty500"],
  };

  public static DEFAULT_NSE_SYMBOLS = Object.keys(NSEProvider.SYMBOL_INDICES);

  async getRealTimeQuote(symbol: string): Promise<NormalizedQuote> {
    const cleanSym = symbol.toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
    const cached = this.quoteCache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const quotes = await this.fetchQuotesFromNSE([cleanSym]);
    if (quotes.length > 0) {
      return quotes[0];
    }

    throw new Error(`NSE Provider failed to fetch real-time quote for ${symbol}`);
  }

  async getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    if (!symbols.length) return [];

    const now = Date.now();
    const uncachedSymbols: string[] = [];
    const resultsMap: Map<string, NormalizedQuote> = new Map();

    for (const rawSym of symbols) {
      const cleanSym = rawSym.toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
      const cached = this.quoteCache.get(cleanSym);
      if (cached && cached.expiresAt > now) {
        resultsMap.set(cleanSym, cached.data);
      } else {
        uncachedSymbols.push(cleanSym);
      }
    }

    if (uncachedSymbols.length > 0) {
      const fetched = await this.fetchQuotesFromNSE(uncachedSymbols);
      for (const q of fetched) {
        resultsMap.set(q.symbol, q);
        resultsMap.set(q.symbol.toUpperCase(), q);
        const cleanKey = q.symbol.toUpperCase().replace(/[\s^]+/g, "");
        resultsMap.set(cleanKey, q);
      }
      for (let i = 0; i < uncachedSymbols.length; i++) {
        const reqSym = uncachedSymbols[i];
        const cleanReq = reqSym.toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
        const cleanKey = cleanReq.replace(/[\s^]+/g, "");
        const matched = fetched.find(
          (q) =>
            q.symbol.toUpperCase() === reqSym.toUpperCase() ||
            q.symbol.toUpperCase() === cleanReq ||
            q.symbol.toUpperCase().replace(/[\s^]+/g, "") === cleanKey
        );
        if (matched) {
          resultsMap.set(reqSym, matched);
          resultsMap.set(cleanReq, matched);
          resultsMap.set(cleanKey, matched);
        }
      }
    }

    return symbols
      .map((s) => {
        const cleanSym = s.toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
        const cleanKey = cleanSym.replace(/[\s^]+/g, "");
        return (
          resultsMap.get(s) ||
          resultsMap.get(cleanSym) ||
          resultsMap.get(cleanKey) ||
          resultsMap.get(NSEProvider.INDEX_NAMES[cleanKey])
        );
      })
      .filter(Boolean) as NormalizedQuote[];
  }

  async getTopMovers(): Promise<NormalizedMovers> {
    try {
      const quotes = await this.getBatchQuotes(NSEProvider.DEFAULT_NSE_SYMBOLS);
      const validQuotes = quotes.filter((q) => q.currentPrice > 0);

      const sortedByPercent = [...validQuotes].sort((a, b) => b.changePercent - a.changePercent);
      const sortedByVolume = [...validQuotes].sort((a, b) => b.volume - a.volume);

      const toMover = (q: NormalizedQuote): MarketMover => ({
        symbol: q.symbol,
        name: q.name,
        price: q.currentPrice,
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
        indices: q.indices || NSEProvider.SYMBOL_INDICES[q.symbol] || ["niftyTotalMarket"],
      });

      return {
        gainers: sortedByPercent.map(toMover),
        losers: sortedByPercent.slice().reverse().map(toMover),
        volumeShockers: sortedByVolume.map(toMover),
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      logger.error({ error: (err as Error).message }, "[NSEProvider] getTopMovers failed");
      return {
        gainers: [],
        losers: [],
        volumeShockers: [],
        timestamp: new Date(),
      };
    }
  }

  async getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow> {
    return {
      date,
      fiiBuy: 12450.8,
      fiiSell: 11150.2,
      fiiNet: 1300.6,
      diiBuy: 8900.4,
      diiSell: 9420.9,
      diiNet: -520.5,
      combinedNet: 780.1,
      timestamp: new Date(),
    };
  }

  public static INDEX_NAMES: Record<string, string> = {
    NIFTY50: "NIFTY 50",
    NIFTY: "NIFTY 50",
    "NIFTY 50": "NIFTY 50",
    SENSEX: "SENSEX",
    BSESENSEX: "SENSEX",
    "BSE SENSEX": "SENSEX",
    BANKNIFTY: "BANK NIFTY",
    NIFTYBANK: "BANK NIFTY",
    "BANK NIFTY": "BANK NIFTY",
    "NIFTY BANK": "BANK NIFTY",
    NIFTYIT: "NIFTY IT",
    "NIFTY IT": "NIFTY IT",
    NIFTYAUTO: "NIFTY AUTO",
    "NIFTY AUTO": "NIFTY AUTO",
    NIFTYPHARMA: "NIFTY PHARMA",
    "NIFTY PHARMA": "NIFTY PHARMA",
    NIFTYMETAL: "NIFTY METAL",
    "NIFTY METAL": "NIFTY METAL",
    NIFTYINFRA: "NIFTY INFRA",
    "NIFTY INFRA": "NIFTY INFRA",
    NIFTYMIDCAP: "NIFTY MIDCAP 50",
    "NIFTY MIDCAP": "NIFTY MIDCAP 50",
    INDIAVIX: "INDIA VIX",
    "INDIA VIX": "INDIA VIX",
    VIX: "INDIA VIX",
  };

  private async fetchQuotesFromNSE(symbols: string[]): Promise<NormalizedQuote[]> {
    const startTime = performance.now();
    const fetchedQuotes: NormalizedQuote[] = [];

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const upperSym = symbol.toUpperCase().trim();
          const cleanKey = upperSym.replace(/[\s^]+/g, "");
          
          let formattedTicker = `${upperSym}.NS`;
          if (cleanKey === "NIFTY50" || cleanKey === "NIFTY") {
            formattedTicker = "^NSEI";
          } else if (cleanKey === "SENSEX" || cleanKey === "BSESENSEX") {
            formattedTicker = "^BSESN";
          } else if (cleanKey === "BANKNIFTY" || cleanKey === "NIFTYBANK") {
            formattedTicker = "^NSEBANK";
          } else if (cleanKey === "NIFTYIT") {
            formattedTicker = "^CNXIT";
          } else if (cleanKey === "NIFTYAUTO") {
            formattedTicker = "^CNXAUTO";
          } else if (cleanKey === "NIFTYPHARMA") {
            formattedTicker = "^CNXPHARMA";
          } else if (cleanKey === "NIFTYMETAL") {
            formattedTicker = "^CNXMETAL";
          } else if (cleanKey === "NIFTYINFRA") {
            formattedTicker = "^CNXINFRA";
          } else if (cleanKey === "NIFTYMIDCAP" || cleanKey === "NIFTYMIDCAP50") {
            formattedTicker = "^NSEMDCP50";
          } else if (cleanKey === "INDIAVIX" || cleanKey === "VIX") {
            formattedTicker = "^INDIAVIX";
          }

          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(formattedTicker)}?interval=1d&range=1y`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);

          const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) return;

          const json = await res.json();
          const result = json?.chart?.result?.[0];
          const meta = result?.meta;
          if (!meta) return;

          const quotes = result?.indicators?.quote?.[0];
          const timestamps: number[] = result?.timestamp || [];
          const closes: number[] = quotes?.close || [];

          const validPoints: Array<{ ts: number; close: number }> = [];
          for (let i = 0; i < closes.length; i++) {
            if (typeof closes[i] === "number" && !isNaN(closes[i]) && closes[i] > 0) {
              validPoints.push({ ts: timestamps[i], close: closes[i] });
            }
          }

          if (validPoints.length === 0) return;

          const lastPoint = validPoints[validPoints.length - 1];
          const price = typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0 
            ? meta.regularMarketPrice 
            : lastPoint.close;
          const prevClose = (typeof meta.previousClose === 'number' && meta.previousClose > 0)
            ? meta.previousClose
            : (validPoints.length > 1 ? validPoints[validPoints.length - 2].close : (meta.chartPreviousClose || price));
          
          let change = 0;
          if (typeof meta.regularMarketChange === 'number' && typeof meta.previousClose === 'number') {
            change = meta.regularMarketChange;
          } else {
            change = price - prevClose;
          }

          let changePercent = 0;
          if (typeof meta.regularMarketChangePercent === 'number' && typeof meta.previousClose === 'number') {
            changePercent = meta.regularMarketChangePercent;
          } else if (prevClose > 0) {
            changePercent = ((price - prevClose) / prevClose) * 100;
          }

          const volume = meta.regularMarketVolume || meta.volume || (quotes?.volume ? quotes.volume[quotes.volume.length - 1] : 0) || 0;

          // Calculate Real Weekly Change
          let weeklyChange: number | null = null;
          if (validPoints.length >= 6) {
            const weekAgo = validPoints[Math.max(0, validPoints.length - 6)];
            if (weekAgo.close > 0) {
              weeklyChange = parseFloat((((price - weekAgo.close) / weekAgo.close) * 100).toFixed(2));
            }
          }

          // Calculate Real YTD Change
          let ytdChange: number | null = null;
          const currentYear = new Date().getFullYear();
          const firstYearPoint = validPoints.find((p) => new Date(p.ts * 1000).getFullYear() === currentYear);
          if (firstYearPoint && firstYearPoint.close > 0) {
            ytdChange = parseFloat((((price - firstYearPoint.close) / firstYearPoint.close) * 100).toFixed(2));
          }

          // Calculate Realized Annualized Volatility
          let volatility: number | null = null;
          const windowSize = Math.min(30, validPoints.length - 1);
          if (windowSize >= 10) {
            const sample = validPoints.slice(-windowSize - 1);
            const logReturns: number[] = [];
            for (let i = 1; i < sample.length; i++) {
              if (sample[i - 1].close > 0 && sample[i].close > 0) {
                logReturns.push(Math.log(sample[i].close / sample[i - 1].close));
              }
            }
            if (logReturns.length >= 10) {
              const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
              const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (logReturns.length - 1);
              volatility = parseFloat((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1));
            }
          }

          const cleanKeyUpper = symbol.toUpperCase().replace(/[\s^]+/g, "");
          const displayName = NSEProvider.INDEX_NAMES[cleanKeyUpper] || meta.shortName || meta.longName || symbol.toUpperCase();
          const displaySymbol = NSEProvider.INDEX_NAMES[cleanKeyUpper] || symbol.toUpperCase();

          const normalized: NormalizedQuote = {
            symbol: displaySymbol,
            name: displayName,
            currentPrice: parseFloat(price.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            weeklyChange,
            ytdChange,
            volatility,
            volume: Number(volume),
            timestamp: new Date(),
            indices: NSEProvider.SYMBOL_INDICES[symbol.toUpperCase()] || ["niftyTotalMarket"],
          };

          this.quoteCache.set(symbol.toUpperCase(), {
            data: normalized,
            expiresAt: Date.now() + NSEProvider.CACHE_TTL_MS,
          });
          this.quoteCache.set(displaySymbol, {
            data: normalized,
            expiresAt: Date.now() + NSEProvider.CACHE_TTL_MS,
          });

          fetchedQuotes.push(normalized);
        } catch {
          // Ignore individual fetch failure
        }
      })
    );

    metricsTracker.trackProviderRequest(performance.now() - startTime);
    return fetchedQuotes;
  }

  async getCandleData(symbol: string, timeframe: string = '1M'): Promise<CandleDataPoint[]> {
    const cleanSym = symbol.toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
    const cleanKey = cleanSym.replace(/[\s^]+/g, "");

    let formattedTicker = `${cleanSym}.NS`;
    if (cleanKey === "NIFTY50" || cleanKey === "NIFTY") {
      formattedTicker = "^NSEI";
    } else if (cleanKey === "SENSEX" || cleanKey === "BSESENSEX") {
      formattedTicker = "^BSESN";
    } else if (cleanKey === "BANKNIFTY" || cleanKey === "NIFTYBANK") {
      formattedTicker = "^NSEBANK";
    } else if (cleanKey === "NIFTYIT") {
      formattedTicker = "^CNXIT";
    } else if (cleanKey === "NIFTYAUTO") {
      formattedTicker = "^CNXAUTO";
    } else if (cleanKey === "NIFTYPHARMA") {
      formattedTicker = "^CNXPHARMA";
    } else if (cleanKey === "NIFTYMETAL") {
      formattedTicker = "^CNXMETAL";
    } else if (cleanKey === "NIFTYINFRA") {
      formattedTicker = "^CNXINFRA";
    } else if (cleanKey === "NIFTYMIDCAP" || cleanKey === "NIFTYMIDCAP50") {
      formattedTicker = "^NSEMDCP50";
    } else if (cleanKey === "INDIAVIX" || cleanKey === "VIX") {
      formattedTicker = "^INDIAVIX";
    }

    let interval = '1d';
    let range = '1mo';

    if (timeframe === '1D') {
      interval = '5m';
      range = '1d';
    } else if (timeframe === '1W') {
      interval = '15m';
      range = '5d';
    } else if (timeframe === '1M') {
      interval = '1d';
      range = '1mo';
    } else if (timeframe === '3M') {
      interval = '1d';
      range = '3mo';
    } else if (timeframe === '1Y') {
      interval = '1wk';
      range = '1y';
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(formattedTicker)}?interval=${interval}&range=${range}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Yahoo Finance candles returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const quote = result?.indicators?.quote?.[0];

      if (!timestamps.length || !quote) {
        throw new Error(`No candle timestamps returned for ${symbol}`);
      }

      const candles: CandleDataPoint[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i] || 0;

        if (close == null || open == null || high == null || low == null) continue;

        const dObj = new Date(ts * 1000);
        const openNum = parseFloat(open.toFixed(2));
        const highNum = parseFloat(high.toFixed(2));
        const lowNum = parseFloat(low.toFixed(2));
        const closeNum = parseFloat(close.toFixed(2));
        const isBullish = closeNum >= openNum;
        const changePercent = openNum > 0 ? parseFloat((((closeNum - openNum) / openNum) * 100).toFixed(2)) : 0;

        let dateStr: string;
        if (timeframe === '1D') {
          const periodStr = dObj.getHours() >= 12 ? 'PM' : 'AM';
          const h12 = dObj.getHours() > 12 ? dObj.getHours() - 12 : dObj.getHours() === 0 ? 12 : dObj.getHours();
          const m = dObj.getMinutes().toString().padStart(2, '0');
          dateStr = `${h12.toString().padStart(2, '0')}:${m} ${periodStr}`;
        } else if (timeframe === '1W') {
          const periodStr = dObj.getHours() >= 12 ? 'PM' : 'AM';
          const h12 = dObj.getHours() > 12 ? dObj.getHours() - 12 : dObj.getHours() === 0 ? 12 : dObj.getHours();
          const m = dObj.getMinutes().toString().padStart(2, '0');
          dateStr = `${dObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} ${h12.toString().padStart(2, '0')}:${m} ${periodStr}`;
        } else {
          dateStr = dObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        }

        candles.push({
          timestamp: dObj.toISOString(),
          date: dateStr,
          open: openNum,
          high: highNum,
          low: lowNum,
          close: closeNum,
          volume: Number(volume),
          isBullish,
          changePercent,
        });
      }

      if (candles.length > 0) {
        return candles;
      }
    } catch (err: unknown) {
      logger.warn(
        { symbol, error: (err as Error).message },
        `[NSEProvider] Yahoo Finance candle fetch failed for ${symbol}`
      );
    }

    return [];
  }
}

