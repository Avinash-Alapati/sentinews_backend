import { MarketSummaryService } from "../../services/market-summary.service";
import { MarketSummaryDTO } from "../../dtos/market-summary.dto";

/**
 * Use Case compiling overall derived market signals.
 */
export class GetMarketSummaryUseCase {
  constructor(private summaryService: MarketSummaryService) {}

  async execute(): Promise<MarketSummaryDTO> {
    return this.summaryService.getMarketSummary();
  }
}
