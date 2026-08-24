import { SentimentClassification } from "../types/sentiment.types";

/**
 * DTO representing derived overall market-wide news sentiment metrics at a glance.
 */
export interface OverallSentimentOverviewDTO {
  sentimentScore: number; // net sentiment score from -1.0 to 1.0
  dominantSentiment: SentimentClassification;
  totalArticlesAnalyzed: number;
  positiveArticlesCount: number;
  negativeArticlesCount: number;
  neutralArticlesCount: number;
  topPositiveSectors: string[];
  topNegativeSectors: string[];
  summary: string;
  supportingFactors: string[];
  explanation: string;
  timestamp: string; // ISO 8601 string
}
