import { config } from "@/shared/config";
import { IMarketProvider } from "../interfaces/market-provider.interface";
import { AlphaVantageProvider } from "../adapters/alpha-vantage.provider";
import { FinnhubProvider } from "../adapters/finnhub.provider";
import { TwelveDataProvider } from "../adapters/twelvedata.provider";
import { UpstoxProvider } from "../adapters/upstox.provider";
import { MockMarketProvider } from "../adapters/mock-market.provider";

/**
 * Factory class resolving and caching the concrete market provider integration instances.
 */
export class MarketProviderFactory {
  private alphaVantage: IMarketProvider | null = null;
  private finnhub: IMarketProvider | null = null;
  private twelveData: IMarketProvider | null = null;
  private upstox: UpstoxProvider | null = null;
  private mockProvider: IMarketProvider | null = null;

  /**
   * Resolves and returns the active provider based on configuration.
   */
  getProvider(): IMarketProvider {
    if (process.env.NODE_ENV === "test") {
      if (!this.mockProvider) {
        this.mockProvider = new MockMarketProvider();
      }
      return this.mockProvider;
    }

    const providerType = config.MARKET_PROVIDER || "upstox";

    switch (providerType) {
      case "upstox":
        if (!this.upstox) {
          this.upstox = new UpstoxProvider();
        }
        return this.upstox;
      case "twelvedata":
        if (!this.twelveData) {
          this.twelveData = new TwelveDataProvider();
        }
        return this.twelveData;
      case "finnhub":
        if (!this.finnhub) {
          this.finnhub = new FinnhubProvider();
        }
        return this.finnhub;
      case "alphavantage":
        if (!this.alphaVantage) {
          this.alphaVantage = new AlphaVantageProvider();
        }
        return this.alphaVantage;
      default:
        if (!this.upstox) {
          this.upstox = new UpstoxProvider();
        }
        return this.upstox;
    }
  }
}

