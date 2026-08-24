import { SentimentClassification } from "../types/sentiment.types";

/**
 * DTO representing aggregated sentiment metrics for a specific company symbol.
 */
export interface CompanySentimentDTO {
  symbol: string;
  companyName: string;
  sentiment: SentimentClassification;
  articleCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  summary: string;
  supportingFactors: string[];
  explanation: string;
  lastUpdated: string; // ISO 8601 string
}
