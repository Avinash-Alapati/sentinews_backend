/**
 * Centralized Metrics Collector tracking cache hit/miss rates
 * and external provider call latencies, retries, and failures.
 */
class MetricsTracker {
  private cacheHits = 0;
  private cacheMisses = 0;
  
  private providerLatencies: number[] = [];
  private providerRetries = 0;
  private providerTimeouts = 0;
  private providerFailures = 0;

  private aiRequestsTotal = 0;
  private aiRequestsSuccess = 0;
  private aiRequestsFailure = 0;
  private aiValidationFailures = 0;
  private aiRetries = 0;
  private aiTimeouts = 0;
  private aiLatencies: number[] = [];
  private aiFallbackCount = 0;

  trackCacheHit() {
    this.cacheHits++;
  }

  trackCacheMiss() {
    this.cacheMisses++;
  }

  trackProviderRequest(latencyMs: number) {
    this.providerLatencies.push(latencyMs);
    if (this.providerLatencies.length > 500) {
      this.providerLatencies.shift();
    }
  }

  trackProviderRetry() {
    this.providerRetries++;
  }

  trackProviderTimeout() {
    this.providerTimeouts++;
  }

  trackProviderFailure() {
    this.providerFailures++;
  }

  trackAIRequest(latencyMs: number, success: boolean) {
    this.aiRequestsTotal++;
    if (success) {
      this.aiRequestsSuccess++;
    } else {
      this.aiRequestsFailure++;
    }
    this.aiLatencies.push(latencyMs);
    if (this.aiLatencies.length > 500) {
      this.aiLatencies.shift();
    }
  }

  trackAIValidationFailure() {
    this.aiValidationFailures++;
  }

  trackAIRetry() {
    this.aiRetries++;
  }

  trackAITimeout() {
    this.aiTimeouts++;
  }

  trackAIFallback() {
    this.aiFallbackCount++;
  }

  getMetrics() {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests === 0 ? 0 : this.cacheHits / totalCacheRequests;

    const avgProviderLatency = this.providerLatencies.length === 0
      ? 0
      : this.providerLatencies.reduce((a, b) => a + b, 0) / this.providerLatencies.length;

    const avgAiLatency = this.aiLatencies.length === 0
      ? 0
      : this.aiLatencies.reduce((a, b) => a + b, 0) / this.aiLatencies.length;

    return {
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: parseFloat((cacheHitRate * 100).toFixed(2)),
      },
      provider: {
        avgLatencyMs: Math.round(avgProviderLatency),
        retryCount: this.providerRetries,
        timeoutCount: this.providerTimeouts,
        failureCount: this.providerFailures,
      },
      sentiment: {
        totalRequests: this.aiRequestsTotal,
        successRequests: this.aiRequestsSuccess,
        failedRequests: this.aiRequestsFailure,
        validationFailures: this.aiValidationFailures,
        retryCount: this.aiRetries,
        timeoutCount: this.aiTimeouts,
        avgLatencyMs: Math.round(avgAiLatency),
        fallbackCount: this.aiFallbackCount,
      },
    };
  }
}

export const metricsTracker = new MetricsTracker();
