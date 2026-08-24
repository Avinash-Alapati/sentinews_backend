import { config } from "@/shared/config";
import { ISentimentProvider } from "../interfaces/sentiment-provider.interface";
import { GeminiProvider } from "../adapters/gemini.provider";
import { MockSentimentProvider } from "../adapters/mock-sentiment.provider";

/**
 * Factory class resolving and caching concrete sentiment provider integration instances.
 */
export class SentimentProviderFactory {
  private gemini: ISentimentProvider | null = null;
  private mockProvider: ISentimentProvider | null = null;

  /**
   * Resolves and returns the active provider based on environment and config.
   * Falls back to MockSentimentProvider if GEMINI_API_KEY is not defined.
   */
  getProvider(): ISentimentProvider {
    if (process.env.NODE_ENV === "test" || !config.GEMINI_API_KEY) {
      if (!this.mockProvider) {
        this.mockProvider = new MockSentimentProvider();
      }
      return this.mockProvider;
    }

    if (!this.gemini) {
      this.gemini = new GeminiProvider();
    }
    return this.gemini;
  }
}
