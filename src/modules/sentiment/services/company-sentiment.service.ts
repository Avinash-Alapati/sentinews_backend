import { ISentimentRepository } from "../repositories/sentiment.repository.interface";
import { CompanySentimentDTO } from "../dtos/company-sentiment.dto";
import { SENTIMENT_CONFIG } from "../constants/sentiment.constants";
import { SentimentClassification } from "../types/sentiment.types";
import { logger } from "@/shared/utils/logger";

/**
 * Service aggregating and calculating company-level sentiment insights dynamically.
 * Resolves the dominant sentiment based on strict percentage-based distribution thresholds.
 */
export class CompanySentimentService {
  constructor(private readonly sentimentRepo: ISentimentRepository) {}

  /**
   * Aggregates stored article sentiments for a company and resolves its dominant sentiment.
   * Contains no AI calls or speculative investment advice.
   */
  async getCompanySentiment(symbol: string, requestId?: string): Promise<CompanySentimentDTO> {
    if (requestId) {
      logger.info({ requestId, symbol }, "[CompanySentimentService] Aggregating company sentiment.");
    }

    const ticker = await this.sentimentRepo.getTickerDetails(symbol);
    const companyName = ticker ? ticker.name : symbol;

    const stats = await this.sentimentRepo.getCompanySentimentStats(symbol);
    const { totalArticles, positiveArticles, negativeArticles, neutralArticles } = stats;

    let sentiment: SentimentClassification = "NEUTRAL";
    if (totalArticles > 0) {
      const positiveRatio = positiveArticles / totalArticles;
      const negativeRatio = negativeArticles / totalArticles;

      if (positiveRatio >= SENTIMENT_CONFIG.POSITIVE_THRESHOLD) {
        sentiment = "POSITIVE";
      } else if (negativeRatio >= SENTIMENT_CONFIG.NEGATIVE_THRESHOLD) {
        sentiment = "NEGATIVE";
      }
    }

    const summary = `Overall news sentiment for ${companyName} is classified as ${sentiment} based on ${totalArticles} analyzed articles.`;
    
    const positivePercent = totalArticles > 0 ? Math.round((positiveArticles / totalArticles) * 100) : 0;
    const negativePercent = totalArticles > 0 ? Math.round((negativeArticles / totalArticles) * 100) : 0;
    const neutralPercent = totalArticles > 0 ? Math.round((neutralArticles / totalArticles) * 100) : 0;

    const supportingFactors = [
      `Total articles analyzed: ${totalArticles}`,
      `Positive articles: ${positiveArticles} (${positivePercent}%)`,
      `Negative articles: ${negativeArticles} (${negativePercent}%)`,
      `Neutral articles: ${neutralArticles} (${neutralPercent}%)`
    ];

    const explanation = `Out of ${totalArticles} news articles analyzed for ticker ${symbol}, ${positiveArticles} were positive (${positivePercent}%), ${negativeArticles} were negative (${negativePercent}%), and ${neutralArticles} were neutral (${neutralPercent}%). Applying a threshold of ${SENTIMENT_CONFIG.POSITIVE_THRESHOLD * 100}% for positive and ${SENTIMENT_CONFIG.NEGATIVE_THRESHOLD * 100}% for negative classifications, the overall sentiment resolves to ${sentiment}. This report is purely informational and does not constitute trading recommendations or financial advice.`;

    return {
      symbol,
      companyName,
      sentiment,
      articleCount: totalArticles,
      positiveCount: positiveArticles,
      negativeCount: negativeArticles,
      neutralCount: neutralArticles,
      summary,
      supportingFactors,
      explanation,
      lastUpdated: new Date().toISOString(),
    };
  }
}
