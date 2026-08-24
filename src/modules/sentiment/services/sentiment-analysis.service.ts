import { ISentimentAnalysisService } from "../interfaces/sentiment-service.interface";
import { ISentimentRepository } from "../repositories/sentiment.repository.interface";
import { ISentimentProvider } from "@/integrations/sentiment";
import { ArticleSentimentDTO } from "../dtos/article-sentiment.dto";
import { metricsTracker } from "@/shared/utils/metrics";
import { logger } from "@/shared/utils/logger";

/**
 * Service orchestrating AI sentiment analysis, response validation, retry flows, and database writes.
 */
export class SentimentAnalysisService implements ISentimentAnalysisService {
  constructor(
    private readonly sentimentRepo: ISentimentRepository,
    private readonly sentimentProvider: ISentimentProvider
  ) {}

  /**
   * Performs automatic sentiment analysis on a news article.
   * If sentiment is already stored and forceReanalyze is false, returns it directly.
   * Leverages GeminiProvider for circuit breaker and internal retries.
   * Implements graceful degradation: falls back to stored sentiment if provider is unavailable.
   */
  async analyzeAndStoreArticleSentiment(
    articleId: string,
    forceReanalyze = false,
    requestId?: string
  ): Promise<ArticleSentimentDTO> {
    const article = await this.sentimentRepo.getArticleDetails(articleId);
    if (!article) {
      throw new Error(`Domain Error: Article not found with ID: ${articleId}`);
    }

    const existingSentiment = await this.sentimentRepo.getArticleSentiment(articleId);
    if (existingSentiment && !forceReanalyze) {
      return {
        articleId: existingSentiment.articleId,
        title: existingSentiment.title,
        url: existingSentiment.url,
        publishedAt: existingSentiment.publishedAt.toISOString(),
        sourceName: existingSentiment.sourceName,
        sentiment: existingSentiment.sentiment,
        summary: existingSentiment.summary,
        supportingFactors: existingSentiment.supportingFactors,
        explanation: existingSentiment.explanation,
      };
    }

    try {
      const validResponse = await this.sentimentProvider.analyzeArticle(article.title, article.content, requestId);

      // Persist or update in database repository
      let savedSentiment;
      if (existingSentiment) {
        savedSentiment = await this.sentimentRepo.updateArticleSentiment(articleId, {
          sentiment: validResponse.sentiment,
          summary: validResponse.summary,
          supportingFactors: validResponse.supportingFactors,
          explanation: validResponse.explanation,
        });
      } else {
        savedSentiment = await this.sentimentRepo.saveArticleSentiment({
          articleId,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt,
          sourceName: article.sourceName,
          sentiment: validResponse.sentiment,
          summary: validResponse.summary,
          supportingFactors: validResponse.supportingFactors,
          explanation: validResponse.explanation,
        });
      }

      return {
        articleId: savedSentiment.articleId,
        title: savedSentiment.title,
        url: savedSentiment.url,
        publishedAt: savedSentiment.publishedAt.toISOString(),
        sourceName: savedSentiment.sourceName,
        sentiment: savedSentiment.sentiment,
        summary: savedSentiment.summary,
        supportingFactors: savedSentiment.supportingFactors,
        explanation: savedSentiment.explanation,
      };

    } catch (err: unknown) {
      // Graceful Degradation: If provider is down/circuit breaker tripped, fall back to existing data
      if (existingSentiment) {
        metricsTracker.trackAIFallback();
        logger.warn(
          {
            articleId,
            requestId,
            error: err instanceof Error ? err.message : String(err),
          },
          "[SentimentAnalysisService] AI Provider failed. Falling back to existing stored sentiment."
        );
        return {
          articleId: existingSentiment.articleId,
          title: existingSentiment.title,
          url: existingSentiment.url,
          publishedAt: existingSentiment.publishedAt.toISOString(),
          sourceName: existingSentiment.sourceName,
          sentiment: existingSentiment.sentiment,
          summary: existingSentiment.summary,
          supportingFactors: existingSentiment.supportingFactors,
          explanation: existingSentiment.explanation,
        };
      }

      throw new Error(
        `Domain Error: Sentiment analysis failed for article ${articleId}. Reason: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
