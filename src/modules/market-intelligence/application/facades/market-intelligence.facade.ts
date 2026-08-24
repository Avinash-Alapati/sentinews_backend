import { GetDashboardUseCase } from "../use-cases/get-dashboard.use-case";
import { GetMarketOverviewUseCase } from "../use-cases/get-market-overview.use-case";
import { GetMarketSummaryUseCase } from "../use-cases/get-market-summary.use-case";
import { GetSectorPerformanceUseCase } from "../use-cases/get-sector-performance.use-case";
import { GetInstitutionalActivityUseCase } from "../use-cases/get-institutional-activity.use-case";
import { GetTopMoversUseCase } from "../use-cases/get-top-movers.use-case";
import { DashboardDTO } from "../../dtos/dashboard.dto";
import { MarketOverviewDTO } from "../../dtos/market-overview.dto";
import { MarketSummaryDTO } from "../../dtos/market-summary.dto";
import { SectorPerformanceDTO } from "../../dtos/sector-performance.dto";
import { InstitutionalActivityDTO } from "../../dtos/institutional-activity.dto";
import { MarketMoversDTO } from "../../dtos/market-mover.dto";

/**
 * Facade pattern orchestrating Use Cases for external/controller accesses.
 */
export class MarketIntelligenceFacade {
  constructor(
    private getDashboardUseCase: GetDashboardUseCase,
    private getMarketOverviewUseCase: GetMarketOverviewUseCase,
    private getMarketSummaryUseCase: GetMarketSummaryUseCase,
    private getSectorPerformanceUseCase: GetSectorPerformanceUseCase,
    private getInstitutionalActivityUseCase: GetInstitutionalActivityUseCase,
    private getTopMoversUseCase: GetTopMoversUseCase
  ) {}

  async getDashboard(): Promise<DashboardDTO> {
    return this.getDashboardUseCase.execute();
  }

  async getMarketOverview(): Promise<MarketOverviewDTO> {
    return this.getMarketOverviewUseCase.execute();
  }

  async getMarketSummary(): Promise<MarketSummaryDTO> {
    return this.getMarketSummaryUseCase.execute();
  }

  async getSectorPerformance(): Promise<SectorPerformanceDTO[]> {
    return this.getSectorPerformanceUseCase.execute();
  }

  async getInstitutionalActivity(limit: number): Promise<InstitutionalActivityDTO[]> {
    return this.getInstitutionalActivityUseCase.execute(limit);
  }

  async getTopMovers(): Promise<MarketMoversDTO> {
    return this.getTopMoversUseCase.execute();
  }
}
