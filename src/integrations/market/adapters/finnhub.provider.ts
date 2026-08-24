import { config } from "@/shared/config";
import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
} from "@/modules/market-intelligence/types/market-data.types";
import { IMarketProvider, CandleDataPoint } from "../interfaces/market-provider.interface";
import { AlphaVantageProvider } from "./alpha-vantage.provider";
import { metricsTracker } from "@/shared/utils/metrics";
import { logger } from "@/shared/utils/logger";

interface FinnhubQuoteResponse {
  c?: number;  // Current price
  d?: number;  // Change
  dp?: number; // Percent change
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;  // Timestamp
}

/**
 * Adapter integrating Finnhub Quotes REST API.
 * Integrates an internal AlphaVantageProvider fallback chain to satisfy Movers and EOD flows.
 */
export class FinnhubProvider implements IMarketProvider {
  private apiKey: string;
  private baseUrl = "https://finnhub.io/api/v1";
  private fallbackProvider: AlphaVantageProvider;

  private static consecutiveFailures = 0;
  private static cooldownUntil = 0;

  constructor() {
    this.apiKey = config.FINNHUB_API_KEY || "";
    this.fallbackProvider = new AlphaVantageProvider();
  }

  private checkHealth(): boolean {
    if (Date.now() < FinnhubProvider.cooldownUntil) {
      return false;
    }
    return true;
  }

  private markFailure() {
    FinnhubProvider.consecutiveFailures++;
    if (FinnhubProvider.consecutiveFailures >= 3) {
      FinnhubProvider.cooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes cooldown
      logger.warn(
        { provider: "Finnhub", consecutiveFailures: FinnhubProvider.consecutiveFailures },
        `[FinnhubProvider] Circuit breaker tripped. Cooldown until ${new Date(FinnhubProvider.cooldownUntil).toISOString()}`
      );
    }
  }

  private markSuccess() {
    FinnhubProvider.consecutiveFailures = 0;
    FinnhubProvider.cooldownUntil = 0;
  }

  /**
   * Helper executing fetch query with retry rules and timeout gates.
   */
  private async fetchWithTimeout(url: string, retries = 2, timeoutMs = 5000): Promise<unknown> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (attempt > 1) {
        metricsTracker.trackProviderRetry();
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = performance.now();

      // Parse endpoint from path
      let endpoint = "unknown";
      try {
        const pathSegments = url.split("?")[0].split("/");
        endpoint = `/${pathSegments[pathSegments.length - 1]}`;
      } catch {
        // ignore
      }

      try {
        const separator = url.includes("?") ? "&" : "?";
        const finalUrl = `${url}${separator}token=${this.apiKey}`;
        const response = await fetch(finalUrl, { signal: controller.signal });
        clearTimeout(id);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Finnhub API rate limit exceeded");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as Record<string, unknown>;
        const duration = performance.now() - startTime;
        metricsTracker.trackProviderRequest(duration);

        logger.info(
          {
            provider: "Finnhub",
            endpoint,
            durationMs: Math.round(duration),
            status: response.status,
            retryCount: attempt - 1,
          },
          `[PROVIDER_REQUEST] Finnhub request succeeded`
        );

        return data;
      } catch (err: unknown) {
        clearTimeout(id);
        const errorObject = err instanceof Error ? err : new Error(String(err));
        const isTimeout = errorObject.name === "AbortError" || errorObject.message.includes("aborted");
        
        if (isTimeout) {
          metricsTracker.trackProviderTimeout();
        } else {
          metricsTracker.trackProviderFailure();
        }

        logger.error(
          {
            provider: "Finnhub",
            endpoint,
            error: errorObject.message,
            retryCount: attempt - 1,
          },
          `[PROVIDER_REQUEST_FAIL] Finnhub request failed`
        );

        if (attempt === retries) {
          throw new Error(`[FinnhubProvider] Failed after ${retries} attempts. Error: ${errorObject.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  async getRealTimeQuote(symbol: string): Promise<NormalizedQuote> {
    const mappedSymbol = this.mapToFinnhubSymbol(symbol);
    const url = `${this.baseUrl}/quote?symbol=${mappedSymbol}`;

    try {
      if (!this.checkHealth()) {
        throw new Error("Finnhub provider is currently unhealthy (circuit breaker OPEN)");
      }

      if (!this.apiKey) {
        throw new Error("FINNHUB_API_KEY is not configured");
      }

      const rawData = await this.fetchWithTimeout(url) as FinnhubQuoteResponse;

      // Validate Finnhub response structure
      if (!rawData.c || rawData.c === 0) {
        throw new Error(`[FinnhubProvider] Invalid quote response for symbol: ${symbol}`);
      }

      this.markSuccess();

      return {
        symbol,
        name: symbol === "NIFTY50" ? "Nifty 50" : symbol === "SENSEX" ? "BSE Sensex" : symbol,
        currentPrice: rawData.c,
        change: rawData.d || 0,
        changePercent: rawData.dp || 0,
        volume: 0, // Finnhub quote does not provide volume parameters
        timestamp: new Date((rawData.t || Date.now() / 1000) * 1000),
      };
    } catch (err: unknown) {
      this.markFailure();
      const errorObject = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        { symbol, error: errorObject.message },
        `[FinnhubProvider] Failed to fetch quote for ${symbol}. Falling back to AlphaVantage.`
      );
      return this.fallbackProvider.getRealTimeQuote(symbol);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    return Promise.all(symbols.map((sym) => this.getRealTimeQuote(sym)));
  }

  async getTopMovers(): Promise<NormalizedMovers> {
    logger.info({}, "[FinnhubProvider] Movers requested. Redirecting to AlphaVantage fallback.");
    return this.fallbackProvider.getTopMovers();
  }

  async getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow> {
    logger.info({ date: date.toISOString() }, "[FinnhubProvider] Institutional Activity requested. Redirecting to AlphaVantage fallback.");
    return this.fallbackProvider.getInstitutionalActivity(date);
  }

  async getCandleData(symbol: string, timeframe: string = "1M"): Promise<CandleDataPoint[]> {
    const mappedSymbol = this.mapToFinnhubSymbol(symbol);
    const to = Math.floor(Date.now() / 1000);
    let daysBack = 30;
    let resolution = "D";

    if (timeframe === "1D") {
      daysBack = 1;
      resolution = "5";
    } else if (timeframe === "1W") {
      daysBack = 7;
      resolution = "30";
    } else if (timeframe === "1M") {
      daysBack = 30;
      resolution = "D";
    } else if (timeframe === "3M") {
      daysBack = 90;
      resolution = "D";
    } else if (timeframe === "1Y") {
      daysBack = 365;
      resolution = "W";
    }

    const from = to - daysBack * 24 * 60 * 60;
    const url = `${this.baseUrl}/stock/candle?symbol=${mappedSymbol}&resolution=${resolution}&from=${from}&to=${to}`;

    try {
      if (this.checkHealth() && this.apiKey) {
        const rawData = (await this.fetchWithTimeout(url)) as {
          c?: number[];
          h?: number[];
          l?: number[];
          o?: number[];
          t?: number[];
          v?: number[];
          s?: string;
        };

        if (rawData.s === "ok" && Array.isArray(rawData.t) && rawData.t.length > 0) {
          const points: CandleDataPoint[] = [];
          for (let i = 0; i < rawData.t.length; i++) {
            const open = rawData.o?.[i] || 0;
            const high = rawData.h?.[i] || 0;
            const low = rawData.l?.[i] || 0;
            const close = rawData.c?.[i] || 0;
            const volume = rawData.v?.[i] || 0;
            const ts = rawData.t[i];
            const dObj = new Date(ts * 1000);
            const dateStr =
              timeframe === "1D" || timeframe === "1W"
                ? `${dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ${dObj.getHours().toString().padStart(2, "0")}:${dObj.getMinutes().toString().padStart(2, "0")}`
                : dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
            points.push({
              timestamp: dObj.toISOString(),
              date: dateStr,
              open,
              high,
              low,
              close,
              volume,
              isBullish: close >= open,
              changePercent: open > 0 ? parseFloat((((close - open) / open) * 100).toFixed(2)) : 0,
            });
          }
          return points;
        }
      }
    } catch (err: unknown) {
      logger.warn({ symbol, error: (err as Error).message }, "[FinnhubProvider] getCandleData failed. Falling back to AlphaVantage.");
    }

    return this.fallbackProvider.getCandleData(symbol, timeframe);
  }

  /**
   * Translates internal symbol codes to standard Yahoo/Finnhub format.
   */
  private mapToFinnhubSymbol(symbol: string): string {
    switch (symbol) {
      case "NIFTY50":
        return "^NSEI";
      case "SENSEX":
        return "^BSESN";
      case "BANKNIFTY":
        return "^NSEBANK";
      case "INDIAVIX":
        return "INDIAVIX.NS";
      default:
        return symbol;
    }
  }
}
