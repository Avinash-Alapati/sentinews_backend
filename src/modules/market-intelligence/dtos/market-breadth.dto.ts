/**
 * DTO representing advances/declines and participation momentum.
 */
export interface MarketBreadthDTO {
  advances: number;
  declines: number;
  unchanged: number;
  ratio: number;
  timestamp: string; // ISO 8601 string
}
