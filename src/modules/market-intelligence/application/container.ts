import { MarketSnapshotRepository } from "../repositories/market-snapshot.repository";
import { MarketProviderFactory } from "@/integrations/market/factories/market-provider.factory";
import { MarketOverviewService } from "../services/market-overview.service";
import { MarketSectorService } from "../services/market-sector.service";
import { InstitutionalActivityService } from "../services/institutional-activity.service";
import { MarketMoverService } from "../services/market-mover.service";
import { MarketSummaryService } from "../services/market-summary.service";
import { GetDashboardUseCase } from "./use-cases/get-dashboard.use-case";
import { GetMarketOverviewUseCase } from "./use-cases/get-market-overview.use-case";
import { GetMarketSummaryUseCase } from "./use-cases/get-market-summary.use-case";
import { GetSectorPerformanceUseCase } from "./use-cases/get-sector-performance.use-case";
import { GetInstitutionalActivityUseCase } from "./use-cases/get-institutional-activity.use-case";
import { GetTopMoversUseCase } from "./use-cases/get-top-movers.use-case";
import { MarketIntelligenceFacade } from "./facades/market-intelligence.facade";

/**
 * Dependency container initializing the layers of the Market Intelligence module.
 */
class MarketIntelligenceContainer {
  private static facadeInstance: MarketIntelligenceFacade | null = null;

  /**
   * Resolves and returns the facade singleton instance.
   */
  static getFacade(): MarketIntelligenceFacade {
    if (this.facadeInstance) {
      return this.facadeInstance;
    }

    // Initialize repository persistence layer
    const snapshotRepo = new MarketSnapshotRepository();

    // Initialize integration factory resolving active feed provider
    const providerFactory = new MarketProviderFactory();
    const activeProvider = providerFactory.getProvider();

    // Initialize services
    const overviewService = new MarketOverviewService(activeProvider, snapshotRepo);
    const sectorService = new MarketSectorService(snapshotRepo);
    const institutionalService = new InstitutionalActivityService(activeProvider, snapshotRepo);
    const moverService = new MarketMoverService(activeProvider, snapshotRepo);
    const summaryService = new MarketSummaryService(snapshotRepo);

    // Initialize use cases
    const getDashboardUseCase = new GetDashboardUseCase(
      overviewService,
      summaryService,
      moverService,
      sectorService,
      institutionalService
    );
    const getMarketOverviewUseCase = new GetMarketOverviewUseCase(overviewService);
    const getMarketSummaryUseCase = new GetMarketSummaryUseCase(summaryService);
    const getSectorPerformanceUseCase = new GetSectorPerformanceUseCase(sectorService);
    const getInstitutionalActivityUseCase = new GetInstitutionalActivityUseCase(institutionalService);
    const getTopMoversUseCase = new GetTopMoversUseCase(moverService);

    // Initialize facade entrypoint
    this.facadeInstance = new MarketIntelligenceFacade(
      getDashboardUseCase,
      getMarketOverviewUseCase,
      getMarketSummaryUseCase,
      getSectorPerformanceUseCase,
      getInstitutionalActivityUseCase,
      getTopMoversUseCase
    );

    return this.facadeInstance;
  }
}

export const marketIntelligenceFacade = MarketIntelligenceContainer.getFacade();
