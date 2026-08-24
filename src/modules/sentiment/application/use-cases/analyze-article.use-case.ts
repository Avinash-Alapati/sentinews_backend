import { SentimentAnalysisService } from "../../services/sentiment-analysis.service";
import { ArticleSentimentDTO } from "../../dtos/article-sentiment.dto";

export interface AnalyzeArticleInput {
  articleId: string;
  forceReanalyze?: boolean;
}

/**
 * Use Case triggering news article sentiment analysis.
 * Supports forcing reanalysis for admin corrections or model upgrades.
 */
export class AnalyzeArticleUseCase {
  constructor(private readonly analysisService: SentimentAnalysisService) {}

  /**
   * Orchestrates the sentiment analysis workflow for a news article.
   */
  async execute(input: AnalyzeArticleInput, requestId?: string): Promise<ArticleSentimentDTO> {
    return this.analysisService.analyzeAndStoreArticleSentiment(
      input.articleId,
      input.forceReanalyze,
      requestId
    );
  }
}
