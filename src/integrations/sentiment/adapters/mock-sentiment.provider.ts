import { ISentimentProvider } from "../interfaces/sentiment-provider.interface";
import { AISentimentResponse } from "@/modules/sentiment/prompts/article-analysis.prompt";

/**
 * Mock provider for local development or test environments.
 * Classifies mock text based on simple keywords.
 */
export class MockSentimentProvider implements ISentimentProvider {
  async analyzeArticle(title: string, content: string): Promise<AISentimentResponse> {
    const combined = `${title} ${content}`.toLowerCase();
    
    let sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" = "NEUTRAL";
    let summary = `Market synthesis: "${title.slice(0, 60)}${title.length > 60 ? "..." : ""}".`;
    let supportingFactors = [
      "Balanced fundamental disclosures across reporting channels",
      "Neutral sentiment trajectory detected across market statements"
    ];
    let explanation = "Article content exhibits balanced market indicators without explicit directional bias.";

    if (combined.includes("good") || combined.includes("profit") || combined.includes("rise") || combined.includes("up") || combined.includes("strong") || combined.includes("surge") || combined.includes("record")) {
      sentiment = "POSITIVE";
      summary = `Financial analysis highlights positive upside, growth signals, or revenue gains for "${title.slice(0, 50)}".`;
      supportingFactors = [
        "Positive guidance and strong operational metrics identified",
        "Bullish momentum signals highlighted in recent corporate developments"
      ];
      explanation = "Classified as POSITIVE due to clear growth indicators, expanding metrics, or revenue outperformance.";
    } else if (combined.includes("bad") || combined.includes("loss") || combined.includes("fall") || combined.includes("down") || combined.includes("weak") || combined.includes("decline") || combined.includes("drop")) {
      sentiment = "NEGATIVE";
      summary = `Financial analysis flags downward margin pressures or market headwinds regarding "${title.slice(0, 50)}".`;
      supportingFactors = [
        "Identified headwinds or margin contractions in recent disclosures",
        "Cautious tone detected regarding earnings or market outlook"
      ];
      explanation = "Classified as NEGATIVE due to identified downside risks, lower guidance, or cost inflation.";
    }

    return {
      sentiment,
      summary,
      supportingFactors,
      explanation,
    };
  }
}
