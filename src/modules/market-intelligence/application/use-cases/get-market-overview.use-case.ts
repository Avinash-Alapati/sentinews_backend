import { MarketOverviewService } from "../../services/market-overview.service";
import { MarketOverviewDTO } from "../../dtos/market-overview.dto";

/**
 * Use case resolving live/cached overview parameters of stock indices.
 */
export class GetMarketOverviewUseCase {
  constructor(private overviewService: MarketOverviewService) {}

  async execute(): Promise<MarketOverviewDTO> {
    return this.overviewService.getMarketOverview();
  }
}
