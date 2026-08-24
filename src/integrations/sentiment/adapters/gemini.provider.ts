import { config } from "@/shared/config";
import { SENTIMENT_CONFIG } from "@/modules/sentiment/constants/sentiment.constants";
import { ISentimentProvider } from "../interfaces/sentiment-provider.interface";
import { AISentimentResponse, articleAnalysisPrompt, aiSentimentResponseSchema } from "@/modules/sentiment/prompts/article-analysis.prompt";
import { metricsTracker } from "@/shared/utils/metrics";
import { logger } from "@/shared/utils/logger";

/**
 * Concrete integration provider for Gemini AI API with Circuit Breaker, Retries, Timeouts, and Telemetry.
 */
export class GeminiProvider implements ISentimentProvider {
  private readonly apiKey: string;
  private static consecutiveFailures = 0;
  private static cooldownUntil = 0;

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || "";
  }

  /**
   * Retrieves the current circuit breaker status for health auditing.
   */
  static getCircuitBreakerState(): "CLOSED" | "OPEN" {
    return Date.now() < GeminiProvider.cooldownUntil ? "OPEN" : "CLOSED";
  }

  /**
   * Assesses local breaker health.
   */
  private checkHealth(): boolean {
    if (Date.now() < GeminiProvider.cooldownUntil) {
      return false;
    }
    return true;
  }

  /**
   * Records a provider execution failure and trips circuit if threshold exceeded.
   */
  private markFailure(requestId?: string) {
    GeminiProvider.consecutiveFailures++;
    if (GeminiProvider.consecutiveFailures >= SENTIMENT_CONFIG.CIRCUIT_BREAKER_FAILURES) {
      GeminiProvider.cooldownUntil = Date.now() + SENTIMENT_CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS;
      logger.warn(
        {
          provider: "Gemini",
          requestId,
          consecutiveFailures: GeminiProvider.consecutiveFailures,
          cooldownUntil: new Date(GeminiProvider.cooldownUntil).toISOString(),
        },
        `[GeminiProvider] Circuit breaker tripped (OPEN). Cooldown initiated.`
      );
    }
  }

  /**
   * Resets the failure counter on success.
   */
  private markSuccess() {
    GeminiProvider.consecutiveFailures = 0;
    GeminiProvider.cooldownUntil = 0;
  }

  /**
   * Calls the Gemini API, handles retries, timeout gates, response validation, and structured logs.
   */
  async analyzeArticle(title: string, content: string, requestId?: string): Promise<AISentimentResponse> {
    if (!this.checkHealth()) {
      metricsTracker.trackAIFallback();
      throw new Error("Gemini provider is currently unhealthy (circuit breaker OPEN)");
    }

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }

    const promptText = articleAnalysisPrompt.build(title, content);
    const model = SENTIMENT_CONFIG.GEMINI_MODEL_NAME;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const maxRetries = SENTIMENT_CONFIG.MAX_RETRY_COUNT;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        metricsTracker.trackAIRetry();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SENTIMENT_CONFIG.PROVIDER_TIMEOUT_MS);
      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Gemini API request failed with status: ${response.status} ${response.statusText}`);
        }

        const responseBody = await response.json();
        const rawText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawText) {
          throw new Error("Gemini response did not contain candidates or text parts.");
        }

        const cleanJsonText = rawText.trim();
        const parsed = JSON.parse(cleanJsonText);

        // Validation workflow using Zod
        const validationResult = aiSentimentResponseSchema.safeParse(parsed);
        if (!validationResult.success) {
          metricsTracker.trackAIValidationFailure();
          const validationErrors = validationResult.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          throw new Error(`AI response validation failed: ${validationErrors}`);
        }

        const latency = performance.now() - startTime;
        metricsTracker.trackAIRequest(latency, true);
        this.markSuccess();

        logger.info(
          {
            requestId,
            provider: "Gemini",
            operation: "analyzeArticle",
            latency: Math.round(latency),
            retries: attempt - 1,
            status: "success",
          },
          `[GeminiProvider] Successfully analyzed article sentiment.`
        );

        return validationResult.data;

      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const latency = performance.now() - startTime;
        metricsTracker.trackAIRequest(latency, false);

        const isTimeout =
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error as Record<string, unknown>).name === "AbortError";

        if (isTimeout) {
          metricsTracker.trackAITimeout();
          lastError = new Error(`Gemini API request timed out after ${SENTIMENT_CONFIG.PROVIDER_TIMEOUT_MS}ms`);
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        logger.error(
          {
            requestId,
            provider: "Gemini",
            operation: "analyzeArticle",
            latency: Math.round(latency),
            attempt,
            error: lastError.message,
            status: "error",
          },
          `[GeminiProvider] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
        );

        this.markFailure(requestId);

        if (attempt < maxRetries) {
          const delayMs = 1000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`[GeminiProvider] Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }
}
