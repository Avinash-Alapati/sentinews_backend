import { CompanySentimentService } from "../../services/company-sentiment.service";
import { CompanySentimentDTO } from "../../dtos/company-sentiment.dto";

/**
 * Use Case aggregating news sentiments and calculating dominant sentiment for a company.
 */
export class GetCompanySentimentUseCase {
  constructor(private readonly companyService: CompanySentimentService) {}

  /**
   * Triggers sector/company aggregations and resolves metrics.
   */
  async execute(symbol: string, requestId?: string): Promise<CompanySentimentDTO> {
    return this.companyService.getCompanySentiment(symbol, requestId);
  }
}
