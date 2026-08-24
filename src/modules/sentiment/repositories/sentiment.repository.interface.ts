import { ArticleSentiment } from "../types/sentiment.types";

/**
 * Interface contract defining CRUD storage methods for article and company sentiments.
 */
export interface ISentimentRepository {
  /**
   * Persists the sentiment classification, summary, supporting factors, and explanation for a new article.
   * 
   * @param data The article sentiment domain object to save
   */
  saveArticleSentiment(data: ArticleSentiment): Promise<ArticleSentiment>;

  /**
   * Updates an existing article's sentiment details.
   * 
   * @param articleId The unique identifier of the article
   * @param data Partial domain object containing fields to update
   */
  updateArticleSentiment(articleId: string, data: Partial<ArticleSentiment>): Promise<ArticleSentiment>;

  /**
   * Retrieves the raw article details (title, content, url, publishedAt, sourceName).
   * 
   * @param articleId The unique identifier of the article
   */
  getArticleDetails(articleId: string): Promise<{
    id: string;
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    sourceName: string;
  } | null>;

  /**
   * Retrieves the sentiment classification details for a specific article.
   * 
   * @param articleId The unique identifier of the article
   */
  getArticleSentiment(articleId: string): Promise<ArticleSentiment | null>;

  /**
   * Retrieves all article sentiments mapped to a specific company symbol.
   * 
   * @param symbol The ticker symbol of the company
   */
  getArticleSentimentsBySymbol(symbol: string): Promise<ArticleSentiment[]>;

  /**
   * Retrieves ticker metadata details for a company ticker.
   * 
   * @param symbol The ticker symbol
   */
  getTickerDetails(symbol: string): Promise<{
    symbol: string;
    name: string;
    sector: string;
    industry: string;
  } | null>;

  /**
   * Retrieves historical sentiment data for articles published within a given range.
   * 
   * @param startDate The start date of the query range
   * @param endDate The end date of the query range
   */
  getArticleSentimentsByDateRange(startDate: Date, endDate: Date): Promise<ArticleSentiment[]>;

  /**
   * Aggregates raw sentiment counts (positive, negative, neutral, total) for a company symbol.
   * 
   * @param symbol The ticker symbol of the company
   */
  getCompanySentimentStats(symbol: string): Promise<{
    totalArticles: number;
    positiveArticles: number;
    negativeArticles: number;
    neutralArticles: number;
  }>;

  /**
   * Aggregates raw sentiment counts (positive, negative, neutral, total) across all articles in a date range.
   * 
   * @param startDate The start date of the query range
   * @param endDate The end date of the query range
   */
  getMarketSentimentStats(startDate: Date, endDate: Date): Promise<{
    totalArticles: number;
    positiveArticles: number;
    negativeArticles: number;
    neutralArticles: number;
  }>;

  /**
   * Retrieves raw sector sentiment counts (positive, negative, neutral) in a date range.
   * 
   * @param startDate The start date of the query range
   * @param endDate The end date of the query range
   */
  getSectorSentimentStats(startDate: Date, endDate: Date): Promise<{
    sector: string;
    positive: number;
    negative: number;
    neutral: number;
  }[]>;
}

