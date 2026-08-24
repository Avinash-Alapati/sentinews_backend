import { ArticleSentimentDTO } from "../dtos/article-sentiment.dto";
import { CompanySentimentDTO } from "../dtos/company-sentiment.dto";
import { OverallSentimentOverviewDTO } from "../dtos/sentiment-overview.dto";

/**
 * Service contract for querying pre-calculated news and company sentiment metrics (read-only APIs).
 */
export interface ISentimentIntelligenceService {
  /**
   * Retrieves the overall market sentiment overview.
   */
  getOverallSentimentOverview(days?: number, requestId?: string): Promise<OverallSentimentOverviewDTO>;

  /**
   * Retrieves the aggregated sentiment metrics for a company symbol.
   */
  getCompanySentiment(symbol: string, requestId?: string): Promise<CompanySentimentDTO>;

  /**
   * Retrieves the pre-calculated sentiment details for an article.
   */
  getArticleSentiment(articleId: string, requestId?: string): Promise<ArticleSentimentDTO>;
}

/**
 * Service contract for performing automated background sentiment analysis and classification.
 */
export interface ISentimentAnalysisService {
  /**
   * Triggers automatic sentiment analysis and classification for a newly ingested article.
   */
  analyzeAndStoreArticleSentiment(
    articleId: string,
    forceReanalyze?: boolean,
    requestId?: string
  ): Promise<ArticleSentimentDTO>;
}
