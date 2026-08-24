/**
 * DTO representing an individual high-momentum stock.
 */
export interface MarketMoverDTO {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

/**
 * DTO grouping gainers and losers rankings.
 */
export interface MarketMoversDTO {
  gainers: MarketMoverDTO[];
  losers: MarketMoverDTO[];
  volumeShockers?: MarketMoverDTO[];
  timestamp: string; // ISO 8601 string
}
