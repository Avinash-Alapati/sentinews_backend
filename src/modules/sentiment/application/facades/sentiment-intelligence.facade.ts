import { AnalyzeArticleUseCase, AnalyzeArticleInput } from "../use-cases/analyze-article.use-case";
import { GetArticleSentimentUseCase } from "../use-cases/get-article-sentiment.use-case";
import { GetCompanySentimentUseCase } from "../use-cases/get-company-sentiment.use-case";
import { GetMarketSentimentUseCase } from "../use-cases/get-market-sentiment.use-case";
import { ArticleSentimentDTO } from "../../dtos/article-sentiment.dto";
import { CompanySentimentDTO } from "../../dtos/company-sentiment.dto";
import { OverallSentimentOverviewDTO } from "../../dtos/sentiment-overview.dto";

/**
 * Facade pattern orchestrating Use Cases for external accesses.
 * API controllers/routes should consume only this class.
 */
export class SentimentIntelligenceFacade {
  constructor(
    private readonly analyzeArticleUseCase: AnalyzeArticleUseCase,
    private readonly getArticleSentimentUseCase: GetArticleSentimentUseCase,
    private readonly getCompanySentimentUseCase: GetCompanySentimentUseCase,
    private readonly getMarketSentimentUseCase: GetMarketSentimentUseCase
  ) {}

  /**
   * Orchestrates the sentiment analysis workflow for a news article.
   */
  async analyzeArticle(input: AnalyzeArticleInput, requestId?: string): Promise<ArticleSentimentDTO> {
    return this.analyzeArticleUseCase.execute(input, requestId);
  }

  /**
   * Retrieves the pre-calculated sentiment classification details for a specific article.
   */
  async getArticleSentiment(articleId: string, requestId?: string): Promise<ArticleSentimentDTO> {
    return this.getArticleSentimentUseCase.execute(articleId, requestId);
  }

  /**
   * Retrieves the aggregated sentiment metrics and factors for a specific company symbol.
   */
  async getCompanySentiment(symbol: string, requestId?: string): Promise<CompanySentimentDTO> {
    return this.getCompanySentimentUseCase.execute(symbol, requestId);
  }

  /**
   * Retrieves the overall sentiment overview across all articles analyzed within a given time range.
   */
  async getMarketSentiment(days?: number, requestId?: string): Promise<OverallSentimentOverviewDTO> {
    return this.getMarketSentimentUseCase.execute(days, requestId);
  }
}
