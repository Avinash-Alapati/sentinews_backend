/**
 * DTO representing a single stock index quote metric.
 */
export interface MarketOverviewIndexDTO {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  timestamp: string; // ISO 8601 string
}

/**
 * DTO returned by the market indices overview API.
 */
export interface MarketOverviewDTO {
  indices: MarketOverviewIndexDTO[];
}
