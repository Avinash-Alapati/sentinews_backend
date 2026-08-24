import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
} from "@/modules/market-intelligence/types/market-data.types";

export interface CandleDataPoint {
  timestamp: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBullish: boolean;
  changePercent: number;
}

/**
 * Interface contract defining methods required from external market data provider integrations.
 */
export interface IMarketProvider {
  /**
   * Fetches real-time or delayed quotes for a single symbol.
   */
  getRealTimeQuote(symbol: string): Promise<NormalizedQuote>;

  /**
   * Fetches batch quotes for multiple symbols.
   */
  getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]>;

  /**
   * Fetches the top gainers and losers in the market.
   */
  getTopMovers(): Promise<NormalizedMovers>;

  /**
   * Fetches End-of-Day institutional (FII/DII) cash flows for a specific date.
   */
  getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow>;

  /**
   * Fetches historical candlestick data for a symbol and timeframe.
   */
  getCandleData(symbol: string, timeframe?: string): Promise<CandleDataPoint[]>;
}

