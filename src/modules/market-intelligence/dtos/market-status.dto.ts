import { MarketSession } from "../types/market-data.types";

/**
 * DTO representing the active trading session state of exchanges.
 */
export interface MarketStatusDTO {
  isOpen: boolean;
  session: MarketSession;
  exchange: string;
  timezone: string;
  lastChecked: string; // ISO 8601 string
}
