import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";
import { logger } from "./logger";
import { metricsTracker } from "./metrics";

export type InstrumentedHandler = (
  req: NextRequest,
  context: { params: unknown; requestId: string }
) => Promise<NextResponse>;

/**
 * Higher-Order Function wrapping route handlers to add Request ID tracing,
 * execution timing performance audits, structured logs, and error mapping status boundaries.
 */
export function withObservability(handler: InstrumentedHandler) {
  return async (req: NextRequest, context: unknown) => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    try {
      const parsedContext = typeof context === "object" && context !== null ? context : {};
      const params = (parsedContext as Record<string, unknown>).params;
      const response = await handler(req, { ...parsedContext, params, requestId });
      const duration = performance.now() - startTime;
      
      // Inject trace headers
      response.headers.set("x-request-id", requestId);
      
      const metrics = metricsTracker.getMetrics();

      logger.info(
        {
          requestId,
          route,
          method,
          durationMs: Math.round(duration),
          statusCode: response.status,
          cacheHits: metrics.cache.hits,
          cacheMisses: metrics.cache.misses,
          providerLatencyAvg: metrics.provider.avgLatencyMs,
        },
        `[API_SUCCESS] ${method} ${route}`
      );

      return response;
    } catch (err: unknown) {
      const duration = performance.now() - startTime;
      const errorObject = err instanceof Error ? err : new Error(String(err));
      const status = mapErrorToStatus(errorObject);
      
      logger.error(
        {
          requestId,
          route,
          method,
          durationMs: Math.round(duration),
          statusCode: status,
          error: errorObject.message,
          stack: errorObject.stack || "",
        },
        `[API_ERROR] ${method} ${route} - ${errorObject.message}`
      );

      const res = errorResponse(errorObject.message, status, { requestId });
      res.headers.set("x-request-id", requestId);
      return res;
    }
  };
}

/**
 * Translates application layer errors into standardized HTTP status codes.
 */
function mapErrorToStatus(err: unknown): number {
  if (!(err instanceof Error)) {
    return 500;
  }
  const errMsg = err.message;
  if (err.name === "ZodError" || errMsg.includes("validation") || errMsg.includes("invalid")) {
    return 400;
  }
  if (errMsg.includes("not found") || errMsg.includes("missing")) {
    return 404;
  }
  if (errMsg.includes("rate limit") || errMsg.includes("Too Many Requests") || errMsg.includes("Note")) {
    return 429;
  }
  if (errMsg.includes("timeout") || errMsg.includes("aborted") || err.name === "AbortError") {
    return 504;
  }
  if (errMsg.includes("Gemini") || errMsg.includes("provider") || errMsg.includes("AI response")) {
    return 502;
  }
  return 500;
}
