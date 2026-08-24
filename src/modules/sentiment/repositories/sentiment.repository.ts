import { prisma } from "@/shared/lib/prisma";
import { SentimentLabel } from "@prisma/client";
import { ISentimentRepository } from "./sentiment.repository.interface";
import { ArticleSentiment, SentimentClassification } from "../types/sentiment.types";

/**
 * Maps domain-specific sentiment classifications to database enums.
 */
function mapClassificationToLabel(classification: SentimentClassification): SentimentLabel {
  switch (classification) {
    case "POSITIVE":
      return SentimentLabel.BULLISH;
    case "NEGATIVE":
      return SentimentLabel.BEARISH;
    case "NEUTRAL":
      return SentimentLabel.NEUTRAL;
    default:
      throw new Error(`Unsupported sentiment classification: ${classification}`);
  }
}

/**
 * Maps database enums to domain-specific sentiment classifications.
 */
function mapLabelToClassification(label: SentimentLabel): SentimentClassification {
  switch (label) {
    case SentimentLabel.BULLISH:
      return "POSITIVE";
    case SentimentLabel.BEARISH:
      return "NEGATIVE";
    case SentimentLabel.NEUTRAL:
      return "NEUTRAL";
    default:
      throw new Error(`Unsupported sentiment label: ${label}`);
  }
}

interface SentimentScoreWithArticle {
  articleId: string;
  label: SentimentLabel;
  summary: string;
  supportingFactors: string[];
  explanation: string;
  article: {
    title: string;
    url: string;
    publishedAt: Date;
    sourceName: string;
  };
}

/**
 * Converts a database entity with its article relation to the ArticleSentiment domain type.
 */
function toDomain(score: SentimentScoreWithArticle): ArticleSentiment {
  return {
    articleId: score.articleId,
    title: score.article.title,
    url: score.article.url,
    publishedAt: score.article.publishedAt,
    sourceName: score.article.sourceName,
    sentiment: mapLabelToClassification(score.label),
    summary: score.summary,
    supportingFactors: score.supportingFactors,
    explanation: score.explanation,
  };
}

/**
 * Prisma implementation of the ISentimentRepository.
 * Manages database access for news article and company sentiments.
 */
export class SentimentRepository implements ISentimentRepository {
  /**
   * Persists a new article sentiment record.
   */
  async saveArticleSentiment(data: ArticleSentiment): Promise<ArticleSentiment> {
    const score = await prisma.sentimentScore.create({
      data: {
        articleId: data.articleId,
        polarityScore: 0.0, // Default compatibility field
        confidence: 1.0,    // Default compatibility field
        label: mapClassificationToLabel(data.sentiment),
        summary: data.summary,
        supportingFactors: data.supportingFactors,
        explanation: data.explanation,
      },
      include: {
        article: true,
      },
    });

    return toDomain(score);
  }

  /**
   * Updates an existing article sentiment record.
   */
  async updateArticleSentiment(articleId: string, data: Partial<ArticleSentiment>): Promise<ArticleSentiment> {
    const updateData: {
      label?: SentimentLabel;
      summary?: string;
      supportingFactors?: string[];
      explanation?: string;
    } = {};

    if (data.sentiment) {
      updateData.label = mapClassificationToLabel(data.sentiment);
    }
    if (data.summary !== undefined) {
      updateData.summary = data.summary;
    }
    if (data.supportingFactors !== undefined) {
      updateData.supportingFactors = data.supportingFactors;
    }
    if (data.explanation !== undefined) {
      updateData.explanation = data.explanation;
    }

    const score = await prisma.sentimentScore.update({
      where: { articleId },
      data: updateData,
      include: {
        article: true,
      },
    });

    return toDomain(score);
  }

  /**
   * Retrieves the raw article details (title, content, url, publishedAt, sourceName).
   */
  async getArticleDetails(articleId: string): Promise<{
    id: string;
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    sourceName: string;
  } | null> {
    return prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        content: true,
        url: true,
        publishedAt: true,
        sourceName: true,
      },
    });
  }

  /**
   * Retrieves the sentiment details for a specific article.
   */
  async getArticleSentiment(articleId: string): Promise<ArticleSentiment | null> {
    const score = await prisma.sentimentScore.findUnique({
      where: { articleId },
      include: {
        article: true,
      },
    });

    if (!score) return null;
    return toDomain(score);
  }

  /**
   * Retrieves all article sentiments mapped to a specific company symbol.
   */
  async getArticleSentimentsBySymbol(symbol: string): Promise<ArticleSentiment[]> {
    const scores = await prisma.sentimentScore.findMany({
      where: {
        article: {
          tickers: {
            some: {
              symbol,
            },
          },
        },
      },
      include: {
        article: true,
      },
      orderBy: {
        article: {
          publishedAt: "desc",
        },
      },
    });

    return scores.map(toDomain);
  }

  /**
   * Retrieves ticker metadata details for a company ticker.
   */
  async getTickerDetails(symbol: string): Promise<{
    symbol: string;
    name: string;
    sector: string;
    industry: string;
  } | null> {
    return prisma.stockTicker.findUnique({
      where: { symbol },
      select: {
        symbol: true,
        name: true,
        sector: true,
        industry: true,
      },
    });
  }

  /**
   * Retrieves article sentiments published within a given range.
   */
  async getArticleSentimentsByDateRange(startDate: Date, endDate: Date): Promise<ArticleSentiment[]> {
    const scores = await prisma.sentimentScore.findMany({
      where: {
        article: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        article: true,
      },
      orderBy: {
        article: {
          publishedAt: "desc",
        },
      },
    });

    return scores.map(toDomain);
  }

  /**
   * Aggregates raw sentiment counts for a company symbol.
   */
  async getCompanySentimentStats(symbol: string): Promise<{
    totalArticles: number;
    positiveArticles: number;
    negativeArticles: number;
    neutralArticles: number;
  }> {
    const aggregations = await prisma.sentimentScore.groupBy({
      by: ["label"],
      where: {
        article: {
          tickers: {
            some: {
              symbol,
            },
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    let positiveArticles = 0;
    let negativeArticles = 0;
    let neutralArticles = 0;
    let totalArticles = 0;

    for (const group of aggregations) {
      const count = group._count._all;
      totalArticles += count;
      if (group.label === SentimentLabel.BULLISH) {
        positiveArticles = count;
      } else if (group.label === SentimentLabel.BEARISH) {
        negativeArticles = count;
      } else if (group.label === SentimentLabel.NEUTRAL) {
        neutralArticles = count;
      }
    }

    return {
      totalArticles,
      positiveArticles,
      negativeArticles,
      neutralArticles,
    };
  }

  /**
   * Aggregates raw sentiment counts across all articles in a date range.
   */
  async getMarketSentimentStats(startDate: Date, endDate: Date): Promise<{
    totalArticles: number;
    positiveArticles: number;
    negativeArticles: number;
    neutralArticles: number;
  }> {
    const aggregations = await prisma.sentimentScore.groupBy({
      by: ["label"],
      where: {
        article: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    let positiveArticles = 0;
    let negativeArticles = 0;
    let neutralArticles = 0;
    let totalArticles = 0;

    for (const group of aggregations) {
      const count = group._count._all;
      totalArticles += count;
      if (group.label === SentimentLabel.BULLISH) {
        positiveArticles = count;
      } else if (group.label === SentimentLabel.BEARISH) {
        negativeArticles = count;
      } else if (group.label === SentimentLabel.NEUTRAL) {
        neutralArticles = count;
      }
    }

    return {
      totalArticles,
      positiveArticles,
      negativeArticles,
      neutralArticles,
    };
  }

  /**
   * Retrieves raw sector sentiment counts in a date range.
   */
  async getSectorSentimentStats(startDate: Date, endDate: Date): Promise<{
    sector: string;
    positive: number;
    negative: number;
    neutral: number;
  }[]> {
    const scores = await prisma.sentimentScore.findMany({
      where: {
        article: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        label: true,
        article: {
          select: {
            tickers: {
              select: {
                ticker: {
                  select: {
                    sector: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const sectorCounts: Record<string, { positive: number; negative: number; neutral: number; }> = {};

    for (const score of scores) {
      const label = score.label;
      const tickers = score.article.tickers;
      for (const t of tickers) {
        const sector = t.ticker.sector;
        if (!sector) continue;
        if (!sectorCounts[sector]) {
          sectorCounts[sector] = { positive: 0, negative: 0, neutral: 0 };
        }
        if (label === SentimentLabel.BULLISH) {
          sectorCounts[sector].positive++;
        } else if (label === SentimentLabel.BEARISH) {
          sectorCounts[sector].negative++;
        } else if (label === SentimentLabel.NEUTRAL) {
          sectorCounts[sector].neutral++;
        }
      }
    }

    return Object.entries(sectorCounts).map(([sector, counts]) => ({
      sector,
      ...counts,
    }));
  }
}
