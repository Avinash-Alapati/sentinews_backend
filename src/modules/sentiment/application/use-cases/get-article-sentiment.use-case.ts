import { ArticleSentimentService } from "../../services/article-sentiment.service";
import { ArticleSentimentDTO } from "../../dtos/article-sentiment.dto";

/**
 * Use Case retrieving stored sentiment insights for a specific article.
 */
export class GetArticleSentimentUseCase {
  constructor(private readonly articleService: ArticleSentimentService) {}

  /**
   * Reads the pre-calculated sentiment data from persistence.
   */
  async execute(articleId: string, requestId?: string): Promise<ArticleSentimentDTO> {
    return this.articleService.getArticleSentiment(articleId, requestId);
  }
}
