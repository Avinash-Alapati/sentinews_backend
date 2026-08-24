export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: Date;
  imageUrl?: string;
}