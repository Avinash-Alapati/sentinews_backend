import { config } from "@/shared/config";
import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
  MarketMover,
} from "@/modules/market-intelligence/types/market-data.types";
import { IMarketProvider, CandleDataPoint } from "../interfaces/market-provider.interface";
import { FinnhubProvider } from "./finnhub.provider";
import { metricsTracker } from "@/shared/utils/metrics";
import { logger } from "@/shared/utils/logger";

interface TwelveDataSingleQuote {
  symbol?: string;
  name?: string;
  close?: string | number;
  change?: string | number;
  percent_change?: string | number;
  volume?: string | number;
  timestamp?: number;
  datetime?: string;
  code?: number;
  message?: string;
  status?: string;
}

type TwelveDataBatchQuoteResponse = Record<string, TwelveDataSingleQuote> | TwelveDataSingleQuote;

/**
 * Optimized Adapter for TwelveData REST API featuring 60s in-memory caching
 * and batch aggregation to respect free-tier rate limits (8 reqs/min).
 */
export class TwelveDataProvider implements IMarketProvider {
  private apiKey: string;
  private baseUrl = "https://api.twelvedata.com";
  private fallbackProvider: FinnhubProvider;

  // In-memory cache for quotes to prevent hitting TwelveData 8 reqs/min free tier limit
  private quoteCache: Map<string, { data: NormalizedQuote; expiresAt: number }> = new Map();
  private static CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

  private static consecutiveFailures = 0;
  private static cooldownUntil = 0;

  constructor() {
    this.apiKey = config.TWELVEDATA_API_KEY || "a34098392ad14a0e89000e2b442bba4a";
    this.fallbackProvider = new FinnhubProvider();
  }

  private checkHealth(): boolean {
    return Date.now() >= TwelveDataProvider.cooldownUntil;
  }

  private markFailure() {
    TwelveDataProvider.consecutiveFailures++;
    if (TwelveDataProvider.consecutiveFailures >= 3) {
      TwelveDataProvider.cooldownUntil = Date.now() + 2 * 60 * 1000; // 2 minute cooldown
      logger.warn(
        { provider: "TwelveData", consecutiveFailures: TwelveDataProvider.consecutiveFailures },
        `[TwelveDataProvider] Rate limit hit. Cooldown until ${new Date(TwelveDataProvider.cooldownUntil).toISOString()}`
      );
    }
  }

  private markSuccess() {
    TwelveDataProvider.consecutiveFailures = 0;
    TwelveDataProvider.cooldownUntil = 0;
  }

  private async fetchWithTimeout(url: string, retries = 1, timeoutMs = 5000): Promise<unknown> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = performance.now();

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("TwelveData API rate limit (8 req/min) exceeded");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        const duration = performance.now() - startTime;
        metricsTracker.trackProviderRequest(duration);

        logger.info(
          {
            provider: "TwelveData",
            durationMs: Math.round(duration),
            status: response.status,
          },
          `[PROVIDER_REQUEST] TwelveData request succeeded`
        );

        return data;
      } catch (err: unknown) {
        clearTimeout(id);
        const errorObject = err instanceof Error ? err : new Error(String(err));
        
        if (attempt === retries) {
          throw errorObject;
        }
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  async getRealTimeQuote(symbol: string): Promise<NormalizedQuote> {
    const cached = this.quoteCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const mapped = this.mapSymbol(symbol);
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(mapped)}&apikey=${this.apiKey}`;

    try {
      if (!this.checkHealth()) {
        throw new Error("TwelveData provider is currently in cooldown");
      }

      const raw = (await this.fetchWithTimeout(url)) as TwelveDataSingleQuote;

      if (raw.code || raw.status === "error" || !raw.close) {
        throw new Error(`Invalid quote response for ${symbol}: ${raw.message || "No close price"}`);
      }

      this.markSuccess();

      const normalized: NormalizedQuote = {
        symbol,
        name: raw.name || symbol,
        currentPrice: parseFloat(String(raw.close)) || 0,
        change: parseFloat(String(raw.change)) || 0,
        changePercent: parseFloat(String(raw.percent_change)) || 0,
        volume: parseInt(String(raw.volume), 10) || 0,
        timestamp: raw.timestamp ? new Date(raw.timestamp * 1000) : new Date(),
      };

      this.quoteCache.set(symbol, {
        data: normalized,
        expiresAt: Date.now() + TwelveDataProvider.CACHE_TTL_MS,
      });

      return normalized;
    } catch (err: unknown) {
      this.markFailure();
      logger.warn(
        { symbol, error: (err as Error).message },
        `[TwelveDataProvider] Direct quote failed for ${symbol}. Using fallback.`
      );
      return this.fallbackProvider.getRealTimeQuote(symbol);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    if (!symbols.length) return [];

    // Filter out cached symbols
    const now = Date.now();
    const uncachedSymbols: string[] = [];
    const resultsMap: Map<string, NormalizedQuote> = new Map();

    for (const sym of symbols) {
      const cached = this.quoteCache.get(sym);
      if (cached && cached.expiresAt > now) {
        resultsMap.set(sym, cached.data);
      } else {
        uncachedSymbols.push(sym);
      }
    }

    if (uncachedSymbols.length > 0 && this.checkHealth()) {
      const mappedList = uncachedSymbols.map((s) => this.mapSymbol(s));
      const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(mappedList.join(","))}&apikey=${this.apiKey}`;

      try {
        const raw = (await this.fetchWithTimeout(url)) as TwelveDataBatchQuoteResponse;
        this.markSuccess();

        for (const origSymbol of uncachedSymbols) {
          const mapped = this.mapSymbol(origSymbol);
          const item = (raw as Record<string, TwelveDataSingleQuote>)[mapped] || (raw as TwelveDataSingleQuote);

          if (item && item.close && !item.code) {
            const normalized: NormalizedQuote = {
              symbol: origSymbol,
              name: item.name || origSymbol,
              currentPrice: parseFloat(String(item.close)) || 0,
              change: parseFloat(String(item.change)) || 0,
              changePercent: parseFloat(String(item.percent_change)) || 0,
              volume: parseInt(String(item.volume), 10) || 0,
              timestamp: item.timestamp ? new Date(item.timestamp * 1000) : new Date(),
            };

            this.quoteCache.set(origSymbol, {
              data: normalized,
              expiresAt: now + TwelveDataProvider.CACHE_TTL_MS,
            });
            resultsMap.set(origSymbol, normalized);
          }
        }
      } catch (err: unknown) {
        this.markFailure();
        logger.warn({ error: (err as Error).message }, "[TwelveDataProvider] Batch fetch failed. Falling back for missing symbols.");
      }
    }

    // Fill any missing symbols from fallback provider
    for (const sym of symbols) {
      if (!resultsMap.has(sym)) {
        try {
          const fallbackQuote = await this.fallbackProvider.getRealTimeQuote(sym);
          resultsMap.set(sym, fallbackQuote);
        } catch {
          // ignore
        }
      }
    }

    return symbols.map((sym) => resultsMap.get(sym)!).filter(Boolean);
  }

  async getTopMovers(): Promise<NormalizedMovers> {
    const trackedSymbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "INFY"];

    try {
      const quotes = await this.getBatchQuotes(trackedSymbols);
      const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);

      const toMover = (q: NormalizedQuote): MarketMover => ({
        symbol: q.symbol,
        name: q.name,
        price: q.currentPrice,
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
      });

      return {
        gainers: sorted.slice(0, 4).map(toMover),
        losers: sorted.slice(-4).reverse().map(toMover),
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      logger.warn({ error: (err as Error).message }, "[TwelveDataProvider] Top movers failed. Using fallback.");
      return this.fallbackProvider.getTopMovers();
    }
  }

  async getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow> {
    return this.fallbackProvider.getInstitutionalActivity(date);
  }

  async getCandleData(symbol: string, timeframe: string = "1M"): Promise<CandleDataPoint[]> {
    const mapped = this.mapSymbol(symbol);
    let interval = "1day";
    let outputsize = "30";

    if (timeframe === "1D") {
      interval = "5min";
      outputsize = "78";
    } else if (timeframe === "1W") {
      interval = "30min";
      outputsize = "70";
    } else if (timeframe === "1M") {
      interval = "1day";
      outputsize = "30";
    } else if (timeframe === "3M") {
      interval = "1day";
      outputsize = "90";
    } else if (timeframe === "1Y") {
      interval = "1week";
      outputsize = "52";
    }

    const url = `${this.baseUrl}/time_series?symbol=${encodeURIComponent(mapped)}&interval=${interval}&outputsize=${outputsize}&apikey=${this.apiKey}`;

    try {
      if (this.checkHealth()) {
        const raw = (await this.fetchWithTimeout(url)) as {
          values?: Array<{
            datetime: string;
            open: string;
            high: string;
            low: string;
            close: string;
            volume: string;
          }>;
        };

        if (Array.isArray(raw?.values) && raw.values.length > 0) {
          const points: CandleDataPoint[] = raw.values.map((v) => {
            const open = parseFloat(v.open) || 0;
            const high = parseFloat(v.high) || 0;
            const low = parseFloat(v.low) || 0;
            const close = parseFloat(v.close) || 0;
            const volume = parseInt(v.volume, 10) || 0;
            const dObj = new Date(v.datetime);
            const dateStr =
              timeframe === "1D" || timeframe === "1W"
                ? `${dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ${dObj.getHours().toString().padStart(2, "0")}:${dObj.getMinutes().toString().padStart(2, "0")}`
                : dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
            return {
              timestamp: dObj.toISOString(),
              date: dateStr,
              open,
              high,
              low,
              close,
              volume,
              isBullish: close >= open,
              changePercent: open > 0 ? parseFloat((((close - open) / open) * 100).toFixed(2)) : 0,
            };
          });
          return points.reverse();
        }
      }
    } catch (err: unknown) {
      logger.warn({ symbol, error: (err as Error).message }, "[TwelveDataProvider] getCandleData failed. Redirecting to fallback.");
    }

    return this.fallbackProvider.getCandleData(symbol, timeframe);
  }

  private mapSymbol(symbol: string): string {
    const clean = symbol.toUpperCase().trim();
    switch (clean) {
      case "NIFTY50":
      case "NIFTY":
        return "INFY";
      case "SENSEX":
        return "INFY";
      default:
        return clean;
    }
  }
}
