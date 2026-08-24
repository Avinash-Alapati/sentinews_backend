import { MarketSentimentService } from "../../services/market-sentiment.service";
import { OverallSentimentOverviewDTO } from "../../dtos/sentiment-overview.dto";

/**
 * Use Case aggregating overall market news sentiment statistics.
 */
export class GetMarketSentimentUseCase {
  constructor(private readonly marketService: MarketSentimentService) {}

  /**
   * Triggers market-wide aggregations over the specified past day range.
   */
  async execute(days?: number, requestId?: string): Promise<OverallSentimentOverviewDTO> {
    return this.marketService.getOverallSentimentOverview(days, requestId);
  }
}
