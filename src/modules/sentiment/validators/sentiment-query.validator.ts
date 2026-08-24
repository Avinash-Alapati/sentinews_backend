import { z } from "zod";

/**
 * Validator schema for querying company-specific sentiment insights.
 */
export const companySentimentQuerySchema = z.object({
  symbol: z
    .string()
    .min(1, "Company ticker symbol is required")
    .trim()
    .toUpperCase(),
});

/**
 * Validator schema for querying article-specific sentiment details.
 */
export const articleSentimentQuerySchema = z.object({
  articleId: z
    .string()
    .min(1, "Article ID is required")
    .trim(),
});

/**
 * Validator schema for querying overall market-wide news sentiment over a past timeframe.
 */
export const sentimentOverviewQuerySchema = z.object({
  days: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().int().min(1).max(365)
    )
    .default(7),
});

export type CompanySentimentQueryInput = z.infer<typeof companySentimentQuerySchema>;
export type ArticleSentimentQueryInput = z.infer<typeof articleSentimentQuerySchema>;
export type SentimentOverviewQueryInput = z.infer<typeof sentimentOverviewQuerySchema>;
