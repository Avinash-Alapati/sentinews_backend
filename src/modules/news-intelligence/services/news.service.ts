import {
  CompanyNewsDto,
  PaginationDto,
  SearchNewsDto,
  SectorNewsDto,
} from "../dtos/news.dto";
import {
  NewsArticle,
} from "../types/news.types";
import {
  NewsRepository,
  newsRepository,
} from "../repositories/news.repository";

export class NewsService {
  constructor(
    private readonly repository: NewsRepository = newsRepository
  ) {}

  async getLatestNews(
    pagination?: PaginationDto
  ): Promise<NewsArticle[]> {
    const articles = await this.repository.getLatestNews();

    return this.paginate(articles, pagination);
  }

  async searchNews(
    dto: SearchNewsDto
  ): Promise<NewsArticle[]> {
    const articles = await this.repository.getLatestNews();

    if (!dto.q?.trim()) {
      return this.paginate(articles, dto);
    }

    const keyword = dto.q.toLowerCase();

    const filtered = articles.filter((article) => {
      return (
        article.title.toLowerCase().includes(keyword) ||
        article.description.toLowerCase().includes(keyword)
      );
    });

    return this.paginate(filtered, dto);
  }

  async getCompanyNews(
    dto: CompanyNewsDto
  ): Promise<NewsArticle[]> {
    const articles = await this.repository.getLatestNews();

    const keyword = dto.company.toLowerCase();

    const filtered = articles.filter((article) => {
      return (
        article.title.toLowerCase().includes(keyword) ||
        article.description.toLowerCase().includes(keyword)
      );
    });

    return this.paginate(filtered, dto);
  }

  async getSectorNews(
    dto: SectorNewsDto
  ): Promise<NewsArticle[]> {
    const articles = await this.repository.getLatestNews();

    const keyword = dto.sector.toLowerCase();

    const filtered = articles.filter((article) => {
      return (
        article.title.toLowerCase().includes(keyword) ||
        article.description.toLowerCase().includes(keyword)
      );
    });

    return this.paginate(filtered, dto);
  }

  async getTrendingNews(
    pagination?: PaginationDto
  ): Promise<NewsArticle[]> {
    const articles = await this.repository.getLatestNews();

    return this.paginate(articles.slice(0, 20), pagination);
  }

  private paginate(
    articles: NewsArticle[],
    pagination?: PaginationDto
  ): NewsArticle[] {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const start = (page - 1) * limit;

    return articles.slice(start, start + limit);
  }
}

export const newsService = new NewsService();