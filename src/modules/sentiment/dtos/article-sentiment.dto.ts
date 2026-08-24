import { SentimentClassification } from "../types/sentiment.types";

/**
 * DTO representing natural-language AI sentiment classification details for an ingested article.
 */
export interface ArticleSentimentDTO {
  articleId: string;
  title: string;
  url: string;
  publishedAt: string; // ISO 8601 string
  sourceName: string;
  sentiment: SentimentClassification;
  summary: string;
  supportingFactors: string[];
  explanation: string;
}
