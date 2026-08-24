import { RSSProvider, rssProvider } from "../providers/rss.provider";
import { NewsArticle } from "../types/news.types";

export class NewsRepository {
  constructor(
    private readonly provider: RSSProvider = rssProvider
  ) {}

  async getLatestNews(): Promise<NewsArticle[]> {
    const articles = await this.provider.fetchLatest();

    const uniqueArticles = this.removeDuplicates(articles);

    return this.sortByPublishedDate(uniqueArticles);
  }

  async getById(id: string): Promise<NewsArticle | null> {
    const articles = await this.getLatestNews();
    const match = articles.find((a) => a.id === id);
    if (match) return match;
    return articles.length > 0 ? articles[0] : null;
  }

  async getBySource(source: string, excludeId?: string): Promise<NewsArticle[]> {
    const articles = await this.getLatestNews();
    return articles
      .filter((a) => a.source === source && a.id !== excludeId)
      .slice(0, 4);
  }

  private removeDuplicates(
    articles: NewsArticle[]
  ): NewsArticle[] {
    const seen = new Map<string, NewsArticle>();

    for (const article of articles) {
      const key = this.generateDuplicateKey(article);

      if (!seen.has(key)) {
        seen.set(key, article);
      }
    }

    return Array.from(seen.values());
  }

  private generateDuplicateKey(article: NewsArticle): string {
    if (article.link.trim().length > 0) {
      return article.link.trim().toLowerCase();
    }

    return article.title.trim().toLowerCase();
  }

  private sortByPublishedDate(
    articles: NewsArticle[]
  ): NewsArticle[] {
    return [...articles].sort(
      (a, b) =>
        b.publishedAt.getTime() -
        a.publishedAt.getTime()
    );
  }
}

export const newsRepository = new NewsRepository();