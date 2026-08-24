import { ISentimentRepository } from "../repositories/sentiment.repository.interface";
import { ArticleSentimentDTO } from "../dtos/article-sentiment.dto";
import { logger } from "@/shared/utils/logger";

/**
 * Read-only business service to query pre-calculated article sentiments from the repository.
 * Contains no AI calls or dynamic calculations.
 */
export class ArticleSentimentService {
  constructor(private readonly sentimentRepo: ISentimentRepository) {}

  /**
   * Retrieves the sentiment classification record for a specific article.
   */
  async getArticleSentiment(articleId: string, requestId?: string): Promise<ArticleSentimentDTO> {
    if (requestId) {
      logger.info({ requestId, articleId }, "[ArticleSentimentService] Fetching article sentiment details.");
    }

    const sentiment = await this.sentimentRepo.getArticleSentiment(articleId);
    if (!sentiment) {
      throw new Error(`Domain Error: Sentiment record not found for article ID: ${articleId}`);
    }

    return {
      articleId: sentiment.articleId,
      title: sentiment.title,
      url: sentiment.url,
      publishedAt: sentiment.publishedAt.toISOString(),
      sourceName: sentiment.sourceName,
      sentiment: sentiment.sentiment,
      summary: sentiment.summary,
      supportingFactors: sentiment.supportingFactors,
      explanation: sentiment.explanation,
    };
  }
}
