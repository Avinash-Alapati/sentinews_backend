import { SentimentRepository } from "../repositories/sentiment.repository";
import { SentimentProviderFactory } from "@/integrations/sentiment";
import { SentimentAnalysisService } from "../services/sentiment-analysis.service";
import { ArticleSentimentService } from "../services/article-sentiment.service";
import { CompanySentimentService } from "../services/company-sentiment.service";
import { MarketSentimentService } from "../services/market-sentiment.service";
import { AnalyzeArticleUseCase } from "./use-cases/analyze-article.use-case";
import { GetArticleSentimentUseCase } from "./use-cases/get-article-sentiment.use-case";
import { GetCompanySentimentUseCase } from "./use-cases/get-company-sentiment.use-case";
import { GetMarketSentimentUseCase } from "./use-cases/get-market-sentiment.use-case";
import { SentimentIntelligenceFacade } from "./facades/sentiment-intelligence.facade";

/**
 * Dependency container initializing and wiring the layers of the Sentiment Intelligence module.
 */
class SentimentIntelligenceContainer {
  private static facadeInstance: SentimentIntelligenceFacade | null = null;

  /**
   * Resolves and returns the facade singleton instance.
   */
  static getFacade(): SentimentIntelligenceFacade {
    if (this.facadeInstance) {
      return this.facadeInstance;
    }

    // 1. Initialize repository persistence layer
    const sentimentRepo = new SentimentRepository();

    // 2. Initialize integration provider
    const providerFactory = new SentimentProviderFactory();
    const activeProvider = providerFactory.getProvider();

    // 3. Initialize business services
    const analysisService = new SentimentAnalysisService(sentimentRepo, activeProvider);
    const articleService = new ArticleSentimentService(sentimentRepo);
    const companyService = new CompanySentimentService(sentimentRepo);
    const marketService = new MarketSentimentService(sentimentRepo);

    // 4. Initialize use cases
    const analyzeArticleUseCase = new AnalyzeArticleUseCase(analysisService);
    const getArticleSentimentUseCase = new GetArticleSentimentUseCase(articleService);
    const getCompanySentimentUseCase = new GetCompanySentimentUseCase(companyService);
    const getMarketSentimentUseCase = new GetMarketSentimentUseCase(marketService);

    // 5. Initialize facade singleton
    this.facadeInstance = new SentimentIntelligenceFacade(
      analyzeArticleUseCase,
      getArticleSentimentUseCase,
      getCompanySentimentUseCase,
      getMarketSentimentUseCase
    );

    return this.facadeInstance;
  }
}

export const sentimentIntelligenceFacade = SentimentIntelligenceContainer.getFacade();
