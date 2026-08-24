import { NextResponse } from "next/server";
import { ApiResponseEnvelope } from "@/modules/market-intelligence/dtos/api-response.dto";

/**
 * Serializes a standard success API envelope response.
 */
export function successResponse<T>(
  data: T,
  message = "Request completed successfully",
  isLive = false,
  lastUpdated = new Date().toISOString(),
  refreshInterval = 60
): NextResponse<ApiResponseEnvelope<T>> {
  return NextResponse.json({
    success: true,
    message,
    data,
    isLive,
    lastUpdated,
    refreshInterval,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Serializes and logs a structured API error response.
 */
export function errorResponse(
  message: string,
  status = 500,
  errors: unknown = null
): NextResponse {
  console.error(`[API_ERROR] Status ${status} - Message: ${message}`, errors || "");

  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      errors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
