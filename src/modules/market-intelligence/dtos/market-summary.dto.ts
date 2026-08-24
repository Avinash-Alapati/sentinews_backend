import { MarketDirection, MarketBreadthStatus } from "../types/market-data.types";

/**
 * DTO representing derived overall market index indicators at a glance.
 */
export interface MarketSummaryDTO {
  overallDirection: MarketDirection;
  breadthStatus: MarketBreadthStatus;
  strongestSector: string;
  weakestSector: string;
  mostActiveIndex: string;
  lastUpdated: string; // ISO 8601 string
}
