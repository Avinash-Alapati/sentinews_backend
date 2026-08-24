import { MarketStatusDTO } from "../dtos/market-status.dto";
import { MarketOverviewDTO } from "../dtos/market-overview.dto";
import { MarketBreadthDTO } from "../dtos/market-breadth.dto";
import { MarketMoversDTO } from "../dtos/market-mover.dto";
import { InstitutionalActivityDTO } from "../dtos/institutional-activity.dto";
import { SectorPerformanceDTO } from "../dtos/sector-performance.dto";
import { MarketSummaryDTO } from "../dtos/market-summary.dto";

/**
 * Service contract orchestrating live telemetry, status indicators, and snapshots.
 */
export interface IMarketIntelligenceService {
  getMarketStatus(): Promise<MarketStatusDTO>;
  getMarketOverview(): Promise<MarketOverviewDTO>;
  getMarketBreadth(): Promise<MarketBreadthDTO>;
  getMarketMovers(): Promise<MarketMoversDTO>;
  getInstitutionalActivity(limit: number): Promise<InstitutionalActivityDTO[]>;
  getMarketSummary(): Promise<MarketSummaryDTO>;
}

/**
 * Service contract for computing sectoral averages and ranking constituent metrics.
 */
export interface ISectorAnalysisService {
  getSectorPerformance(): Promise<SectorPerformanceDTO[]>;
  calculateSectorAggregates(): Promise<void>;
}
