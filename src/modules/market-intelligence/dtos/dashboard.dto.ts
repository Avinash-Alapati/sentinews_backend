import { MarketOverviewDTO } from "./market-overview.dto";
import { MarketSummaryDTO } from "./market-summary.dto";
import { MarketMoversDTO } from "./market-mover.dto";
import { SectorPerformanceDTO } from "./sector-performance.dto";
import { InstitutionalActivityDTO } from "./institutional-activity.dto";

/**
 * DTO grouping all relevant MVP metrics for the landing dashboard layout.
 */
export interface DashboardDTO {
  overview: MarketOverviewDTO;
  summary: MarketSummaryDTO;
  movers: MarketMoversDTO;
  sectors: SectorPerformanceDTO[];
  institutional: InstitutionalActivityDTO[];
  lastUpdated: string; // ISO 8601 string
}
