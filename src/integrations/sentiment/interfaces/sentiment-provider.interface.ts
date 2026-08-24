import { AISentimentResponse } from "@/modules/sentiment/prompts/article-analysis.prompt";

/**
 * Interface contract defining methods required from external AI sentiment provider integrations.
 */
export interface ISentimentProvider {
  /**
   * Analyzes an article's title and content using AI, returning a structured response prompt-agnostic.
   * 
   * @param title The article title
   * @param content The article content
   * @param requestId Optional request ID for end-to-end telemetry tracing
   */
  analyzeArticle(title: string, content: string, requestId?: string): Promise<AISentimentResponse>;
}
