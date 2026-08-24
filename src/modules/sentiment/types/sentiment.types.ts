export type SentimentClassification = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface ArticleSentiment {
  articleId: string;
  title: string;
  url: string;
  publishedAt: Date;
  sourceName: string;
  sentiment: SentimentClassification;
  summary: string;
  supportingFactors: string[];
  explanation: string;
}

export interface CompanySentiment {
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
  lastUpdated: Date;
}

export interface OverallSentimentOverview {
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
  timestamp: Date;
}
