import { config } from "@/shared/config";
import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
} from "@/modules/market-intelligence/types/market-data.types";
import { IMarketProvider, CandleDataPoint } from "../interfaces/market-provider.interface";
import { metricsTracker } from "@/shared/utils/metrics";
import { logger } from "@/shared/utils/logger";

interface AlphaVantageGlobalQuote {
  "Global Quote"?: {
    "05. price"?: string;
    "06. volume"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
  };
}

interface AlphaVantageMover {
  ticker?: string;
  price?: string;
  change_amount?: string;
  change_percentage?: string;
  volume?: string;
}

interface AlphaVantageMoversResponse {
  top_gainers?: AlphaVantageMover[];
  top_losers?: AlphaVantageMover[];
}

interface AlphaVantageCandleItem {
  "1. open"?: string;
  "2. high"?: string;
  "3. low"?: string;
  "4. close"?: string;
  "5. volume"?: string;
}

type AlphaVantageTimeSeriesResponse = Record<string, Record<string, AlphaVantageCandleItem> | Record<string, string> | undefined>;

/**
 * Adapter integrating AlphaVantage quotes and movers APIs.
 * Ensures all API-specific formats are normalized to internal models.
 */
export class AlphaVantageProvider implements IMarketProvider {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";

  private static consecutiveFailures = 0;
  private static cooldownUntil = 0;

  constructor() {
    this.apiKey = config.ALPHAVANTAGE_API_KEY || "demo";
  }

  private checkHealth(): boolean {
    if (Date.now() < AlphaVantageProvider.cooldownUntil) {
      return false;
    }
    return true;
  }

  private markFailure() {
    AlphaVantageProvider.consecutiveFailures++;
    if (AlphaVantageProvider.consecutiveFailures >= 3) {
      AlphaVantageProvider.cooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes cooldown
      logger.warn(
        { provider: "AlphaVantage", consecutiveFailures: AlphaVantageProvider.consecutiveFailures },
        `[AlphaVantageProvider] Circuit breaker tripped. Cooldown until ${new Date(AlphaVantageProvider.cooldownUntil).toISOString()}`
      );
    }
  }

  private markSuccess() {
    AlphaVantageProvider.consecutiveFailures = 0;
    AlphaVantageProvider.cooldownUntil = 0;
  }

  /**
   * Helper executing fetch query with retry rules and timeout gates.
   */
  private async fetchWithTimeout(url: string, retries = 2, timeoutMs = 5000): Promise<unknown> {
    if (!this.checkHealth()) {
      throw new Error("AlphaVantage provider is currently unhealthy (circuit breaker OPEN)");
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      if (attempt > 1) {
        metricsTracker.trackProviderRetry();
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = performance.now();

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as Record<string, unknown>;
        
        // AlphaVantage maps rate limits inside success JSON bodies
        if (data["Note"] || data["Information"]) {
          throw new Error(`AlphaVantage API message: ${data["Note"] || data["Information"]}`);
        }

        const duration = performance.now() - startTime;
        metricsTracker.trackProviderRequest(duration);
        this.markSuccess();

        // Resolve endpoint function from URL query parameters
        let endpoint = "unknown";
        try {
          const urlObj = new URL(url);
          endpoint = urlObj.searchParams.get("function") || "unknown";
        } catch {
          // ignore
        }

        logger.info(
          {
            provider: "AlphaVantage",
            endpoint,
            durationMs: Math.round(duration),
            status: response.status,
            retryCount: attempt - 1,
          },
          `[PROVIDER_REQUEST] AlphaVantage request succeeded`
        );

        return data;
      } catch (err: unknown) {
        clearTimeout(id);
        this.markFailure();
        
        const errorObject = err instanceof Error ? err : new Error(String(err));
        const isTimeout = errorObject.name === "AbortError" || errorObject.message.includes("aborted");
        if (isTimeout) {
          metricsTracker.trackProviderTimeout();
        } else {
          metricsTracker.trackProviderFailure();
        }

        // Resolve endpoint function from URL query parameters
        let endpoint = "unknown";
        try {
          const urlObj = new URL(url);
          endpoint = urlObj.searchParams.get("function") || "unknown";
        } catch {
          // ignore
        }

        logger.error(
          {
            provider: "AlphaVantage",
            endpoint,
            error: errorObject.message,
            retryCount: attempt - 1,
          },
          `[PROVIDER_REQUEST_FAIL] AlphaVantage request failed`
        );

        if (attempt === retries) {
          throw new Error(`[AlphaVantageProvider] Failed after ${retries} attempts. Error: ${errorObject.message}`);
        }
        // Wait before execution retry (exponential backoff helper)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  async getRealTimeQuote(symbol: string): Promise<NormalizedQuote> {
    const mappedSymbol = this.mapToProviderSymbol(symbol);
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${mappedSymbol}&apikey=${this.apiKey}`;
    const rawData = await this.fetchWithTimeout(url);
    return this.normalizeQuote(rawData, symbol);
  }

  async getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    return Promise.all(symbols.map((sym) => this.getRealTimeQuote(sym)));
  }

  async getTopMovers(): Promise<NormalizedMovers> {
    const url = `${this.baseUrl}?function=TOP_GAINERS_LOSERS&apikey=${this.apiKey}`;
    const rawData = await this.fetchWithTimeout(url);
    return this.normalizeMovers(rawData);
  }

  async getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow> {
    // EOD FII/DII activities are mock-resolved in the AlphaVantage V1 adapter
    return {
      date,
      fiiBuy: 12000.5,
      fiiSell: 11000.2,
      fiiNet: 1000.3,
      diiBuy: 8000.4,
      diiSell: 8500.9,
      diiNet: -500.5,
      combinedNet: 499.8,
      timestamp: new Date(),
    };
  }

  async getCandleData(symbol: string, timeframe: string = "1M"): Promise<CandleDataPoint[]> {
    const mappedSymbol = this.mapToProviderSymbol(symbol);
    let intervalFunc = "TIME_SERIES_DAILY";
    if (timeframe === "1D") {
      intervalFunc = "TIME_SERIES_INTRADAY&interval=5min";
    } else if (timeframe === "1W") {
      intervalFunc = "TIME_SERIES_INTRADAY&interval=60min";
    } else if (timeframe === "1Y") {
      intervalFunc = "TIME_SERIES_WEEKLY";
    }

    const url = `${this.baseUrl}?function=${intervalFunc}&symbol=${mappedSymbol}&apikey=${this.apiKey}`;
    try {
      const rawData = (await this.fetchWithTimeout(url)) as AlphaVantageTimeSeriesResponse;
      const timeSeriesKey = Object.keys(rawData || {}).find((k) => k.includes("Time Series"));
      if (timeSeriesKey && rawData[timeSeriesKey]) {
        const series = rawData[timeSeriesKey] as Record<string, AlphaVantageCandleItem>;
        const dates = Object.keys(series).slice(
          0,
          timeframe === "1D" ? 78 : timeframe === "1W" ? 35 : timeframe === "3M" ? 90 : 30
        );
        const points: CandleDataPoint[] = dates.map((dStr) => {
          const item = series[dStr] || {};
          const open = parseFloat(item["1. open"] || "0");
          const high = parseFloat(item["2. high"] || "0");
          const low = parseFloat(item["3. low"] || "0");
          const close = parseFloat(item["4. close"] || "0");
          const volume = parseInt(item["5. volume"] || "0", 10) || 0;
          const dObj = new Date(dStr);
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
    } catch (err: unknown) {
      logger.warn({ symbol, error: (err as Error).message }, "[AlphaVantageProvider] getCandleData failed");
    }

    return [];
  }

  /**
   * Translates internal index symbol codes to provider-compatible symbols.
   */
  private mapToProviderSymbol(symbol: string): string {
    switch (symbol) {
      case "NIFTY50":
        return "NSE:NIFTY50";
      case "SENSEX":
        return "BSE:SENSEX";
      case "BANKNIFTY":
        return "NSE:NIFTYBANK";
      case "INDIAVIX":
        return "NSE:INDIAVIX";
      default:
        return symbol;
    }
  }

  /**
   * Maps AlphaVantage "Global Quote" properties to NormalizedQuote entity.
   */
  private normalizeQuote(data: unknown, originalSymbol: string): NormalizedQuote {
    const payload = data as AlphaVantageGlobalQuote;
    const quote = payload["Global Quote"];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`[AlphaVantageProvider] No data returned for symbol: ${originalSymbol}`);
    }

    const price = parseFloat(quote["05. price"] || "0");
    const change = parseFloat(quote["09. change"] || "0");
    const changePercent = parseFloat((quote["10. change percent"] || "0").replace("%", ""));
    const volume = parseInt(quote["06. volume"] || "0", 10) || 0;

    return {
      symbol: originalSymbol,
      name: originalSymbol === "NIFTY50" ? "Nifty 50" : originalSymbol === "SENSEX" ? "BSE Sensex" : originalSymbol,
      currentPrice: isNaN(price) ? 0 : price,
      change: isNaN(change) ? 0 : change,
      changePercent: isNaN(changePercent) ? 0 : changePercent,
      volume: isNaN(volume) ? 0 : volume,
      timestamp: new Date(),
    };
  }

  /**
   * Maps AlphaVantage Movers properties to NormalizedMovers entity.
   */
  private normalizeMovers(data: unknown): NormalizedMovers {
    const payload = data as AlphaVantageMoversResponse;
    const gainers = (payload.top_gainers || []).map((g) => this.normalizeMover(g));
    const losers = (payload.top_losers || []).map((l) => this.normalizeMover(l));
    return {
      gainers,
      losers,
      timestamp: new Date(),
    };
  }

  private normalizeMover(mover: AlphaVantageMover): {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  } {
    const price = parseFloat(mover.price || "0");
    const change = parseFloat(mover.change_amount || "0");
    const changePercent = parseFloat((mover.change_percentage || "0").replace("%", ""));
    const volume = parseInt(mover.volume || "0", 10) || 0;

    return {
      symbol: mover.ticker || "",
      name: mover.ticker || "",
      price: isNaN(price) ? 0 : price,
      change: isNaN(change) ? 0 : change,
      changePercent: isNaN(changePercent) ? 0 : changePercent,
      volume: isNaN(volume) ? 0 : volume,
    };
  }
}
