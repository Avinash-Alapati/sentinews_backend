import { MarketOverviewService } from "../../services/market-overview.service";
import { MarketSummaryService } from "../../services/market-summary.service";
import { MarketMoverService } from "../../services/market-mover.service";
import { MarketSectorService } from "../../services/market-sector.service";
import { InstitutionalActivityService } from "../../services/institutional-activity.service";
import { DashboardDTO } from "../../dtos/dashboard.dto";

/**
 * Orchestrates parallel executions across all module services to return the unified dashboard DTO.
 */
export class GetDashboardUseCase {
  constructor(
    private overviewService: MarketOverviewService,
    private summaryService: MarketSummaryService,
    private moverService: MarketMoverService,
    private sectorService: MarketSectorService,
    private institutionalService: InstitutionalActivityService
  ) {}

  /**
   * Executes parallel retrievals and returns consolidated dashboard state.
   */
  async execute(): Promise<DashboardDTO> {
    const [overview, summary, movers, sectors, institutional] = await Promise.all([
      this.overviewService.getMarketOverview(),
      this.summaryService.getMarketSummary(),
      this.moverService.getMarketMovers(),
      this.sectorService.getSectorPerformance(),
      this.institutionalService.getInstitutionalActivity(5), // Preview last 5 days
    ]);

    return {
      overview,
      summary,
      movers,
      sectors,
      institutional,
      lastUpdated: new Date().toISOString(),
    };
  }
}
