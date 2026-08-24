import { z } from "zod";

/**
 * Zod schema to validate the structured JSON response from the AI provider.
 */
export const aiSentimentResponseSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  summary: z.string().min(1, "Summary is required"),
  supportingFactors: z.array(z.string()).min(1, "At least one supporting factor is required"),
  explanation: z.string().min(1, "Explanation is required"),
});

export type AISentimentResponse = z.infer<typeof aiSentimentResponseSchema>;

/**
 * Prompts construction module for Gemini sentiment analysis.
 * Isolates prompt wording and output format from provider code.
 */
export const articleAnalysisPrompt = {
  /**
   * Generates prompt text with regulatory guidelines and target JSON output schema.
   */
  build(title: string, content: string): string {
    return `
You are a highly conservative financial news sentiment analyzer.
Analyze only the supplied news article. Do not use any external knowledge.

Article Title: "${title}"
Article Content:
"""
${content}
"""

Instructions:
1. Classify the overall sentiment of this article into exactly one of: "POSITIVE", "NEGATIVE", or "NEUTRAL".
   - Use "POSITIVE" if the news is clearly bullish or positive for the companies/market.
   - Use "NEGATIVE" if the news is clearly bearish or negative for the companies/market.
   - Use "NEUTRAL" if the news is balanced, holds no significant directional sentiment, or contains mixed signals.
2. Provide a concise "summary" of the article content (maximum 3 sentences).
3. Detail exactly 3 to 5 "supportingFactors" as a list of strings representing the key reasons or facts in the text that support your classification.
4. Provide a brief natural-language "explanation" of the analysis. The explanation must be strictly informational and derived solely from the provided article text.

CRITICAL Regulatory Compliance Rules:
- DO NOT generate or include any confidence scores, probabilities, or percentage values.
- DO NOT generate or include any buy, sell, or hold recommendations or trading signals.
- DO NOT suggest any target prices, investment advice, or future financial forecasts/predictions.
- Do not mention external companies or information not explicitly present in the article.

Return the response as a single, valid JSON object matching the following structure:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "summary": "string",
  "supportingFactors": ["string"],
  "explanation": "string"
}
`;
  }
};
