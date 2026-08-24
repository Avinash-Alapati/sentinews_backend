import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { localCache } from "@/shared/lib/cache";
import { MarketProviderFactory } from "@/integrations/market/factories/market-provider.factory";
import { withObservability } from "@/shared/utils/observability";
import { metricsTracker } from "@/shared/utils/metrics";
import { config } from "@/shared/config";
import { SentimentProviderFactory } from "@/integrations/sentiment/factories/sentiment-provider.factory";
import { GeminiProvider } from "@/integrations/sentiment/adapters/gemini.provider";

export const dynamic = "force-dynamic";

/**
 * Diagnostics health check route assessing database, providers, cache, and telemetry.
 */
export const GET = withObservability(async () => {
  const healthDetails: Record<string, string> = {
    database: "unknown",
    provider: "unknown",
    cache: "unknown",
    sentimentProvider: "unknown",
  };

  let isHealthy = true;

  // 1. Audit database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthDetails.database = "healthy";
  } catch (err: unknown) {
    isHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    healthDetails.database = `unhealthy: ${msg}`;
  }

  // 2. Audit external market feed adapter
  try {
    const providerFactory = new MarketProviderFactory();
    const provider = providerFactory.getProvider();
    await provider.getRealTimeQuote("NIFTY50");
    healthDetails.provider = "healthy";
  } catch (err: unknown) {
    isHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    healthDetails.provider = `unhealthy: ${msg}`;
  }

  // 3. Audit memory cache functionality
  try {
    localCache.set("health-test-key", "ok", 5);
    const val = localCache.get("health-test-key");
    localCache.delete("health-test-key");
    
    if (val === "ok") {
      healthDetails.cache = "healthy";
    } else {
      throw new Error("Cache value retrieval mismatch");
    }
  } catch (err: unknown) {
    isHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    healthDetails.cache = `unhealthy: ${msg}`;
  }

  // 4. Audit Sentiment provider and Circuit Breaker state
  let sentimentCircuitBreakerState = "CLOSED";
  let activeSentimentProviderName = "Heuristic Rule-Based";
  try {
    const sentimentProviderFactory = new SentimentProviderFactory();
    const activeProvider = sentimentProviderFactory.getProvider();
    
    if (activeProvider instanceof GeminiProvider) {
      activeSentimentProviderName = "Gemini";
      sentimentCircuitBreakerState = GeminiProvider.getCircuitBreakerState();
    }
    
    if (!config.GEMINI_API_KEY && activeProvider instanceof GeminiProvider) {
      healthDetails.sentimentProvider = "unconfigured (missing GEMINI_API_KEY)";
    } else {
      healthDetails.sentimentProvider = sentimentCircuitBreakerState === "OPEN" ? "unhealthy (circuit open)" : "healthy";
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    healthDetails.sentimentProvider = `unhealthy: ${msg}`;
  }

  // Collect active metrics
  const metrics = metricsTracker.getMetrics();

  const status = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      success: isHealthy,
      message: isHealthy ? "System is fully operational" : "System degradation detected",
      status: isHealthy ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      details: {
        ...healthDetails,
        sentimentCircuitBreakerState,
        activeSentimentProviderName,
      },
      metrics,
    },
    { status }
  );
});
