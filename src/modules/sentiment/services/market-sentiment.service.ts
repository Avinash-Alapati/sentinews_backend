import { ISentimentRepository } from "../repositories/sentiment.repository.interface";
import { OverallSentimentOverviewDTO } from "../dtos/sentiment-overview.dto";
import { SENTIMENT_CONFIG } from "../constants/sentiment.constants";
import { SentimentClassification } from "../types/sentiment.types";
import { logger } from "@/shared/utils/logger";

/**
 * Service aggregating and calculating market-wide news sentiment snapshots dynamically.
 * Computes general market distributions and trending sector directions.
 */
export class MarketSentimentService {
  constructor(private readonly sentimentRepo: ISentimentRepository) {}

  /**
   * Aggregates overall market news sentiment statistics using stored article sentiments.
   * Performs dynamic percentage calculations and sector sorting without AI calls.
   */
  async getOverallSentimentOverview(days = 7, requestId?: string): Promise<OverallSentimentOverviewDTO> {
    if (requestId) {
      logger.info({ requestId, days }, "[MarketSentimentService] Aggregating overall market sentiment.");
    }

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.sentimentRepo.getMarketSentimentStats(startDate, endDate);
    const { totalArticles, positiveArticles, negativeArticles, neutralArticles } = stats;

    let dominantSentiment: SentimentClassification = "NEUTRAL";
    if (totalArticles > 0) {
      const positiveRatio = positiveArticles / totalArticles;
      const negativeRatio = negativeArticles / totalArticles;

      if (positiveRatio >= SENTIMENT_CONFIG.POSITIVE_THRESHOLD) {
        dominantSentiment = "POSITIVE";
      } else if (negativeRatio >= SENTIMENT_CONFIG.NEGATIVE_THRESHOLD) {
        dominantSentiment = "NEGATIVE";
      }
    }

    // Determine top positive and negative sectors based on article distribution
    const sectorStats = await this.sentimentRepo.getSectorSentimentStats(startDate, endDate);
    
    const topPositiveSectors = sectorStats
      .map(s => {
        const total = s.positive + s.negative + s.neutral;
        return { sector: s.sector, ratio: total > 0 ? s.positive / total : 0, total };
      })
      .filter(s => s.total > 0 && s.ratio >= 0.40)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(s => s.sector);

    const topNegativeSectors = sectorStats
      .map(s => {
        const total = s.positive + s.negative + s.neutral;
        return { sector: s.sector, ratio: total > 0 ? s.negative / total : 0, total };
      })
      .filter(s => s.total > 0 && s.ratio >= 0.40)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(s => s.sector);

    // Business Service layer derived numeric score
    const sentimentScore = totalArticles > 0 ? (positiveArticles - negativeArticles) / totalArticles : 0;

    const summary = `Overall market news sentiment for the past ${days} days is classified as ${dominantSentiment} based on ${totalArticles} analyzed articles.`;
    
    const positivePercent = totalArticles > 0 ? Math.round((positiveArticles / totalArticles) * 100) : 0;
    const negativePercent = totalArticles > 0 ? Math.round((negativeArticles / totalArticles) * 100) : 0;
    const neutralPercent = totalArticles > 0 ? Math.round((neutralArticles / totalArticles) * 100) : 0;

    const supportingFactors = [
      `Total market articles: ${totalArticles}`,
      `Market positive articles: ${positiveArticles} (${positivePercent}%)`,
      `Market negative articles: ${negativeArticles} (${negativePercent}%)`,
      `Market neutral articles: ${neutralArticles} (${neutralPercent}%)`
    ];

    const explanation = `Out of ${totalArticles} news articles analyzed across the market over the past ${days} days, ${positiveArticles} were positive (${positivePercent}%), ${negativeArticles} were negative (${negativePercent}%), and ${neutralArticles} were neutral (${neutralPercent}%). Applying a threshold of ${SENTIMENT_CONFIG.POSITIVE_THRESHOLD * 100}% for positive and ${SENTIMENT_CONFIG.NEGATIVE_THRESHOLD * 100}% for negative classifications, the overall sentiment resolves to ${dominantSentiment}. This analysis is informational only and does not contain buy/sell recommendations or price targets.`;

    return {
      sentimentScore,
      dominantSentiment,
      totalArticlesAnalyzed: totalArticles,
      positiveArticlesCount: positiveArticles,
      negativeArticlesCount: negativeArticles,
      neutralArticlesCount: neutralArticles,
      topPositiveSectors,
      topNegativeSectors,
      summary,
      supportingFactors,
      explanation,
      timestamp: new Date().toISOString(),
    };
  }
}
