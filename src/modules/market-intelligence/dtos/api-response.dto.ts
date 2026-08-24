/**
 * Common envelope for all SentiNews API responses.
 * Unifies execution statuses and provides telemetry data freshness properties.
 */
export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  isLive: boolean;
  lastUpdated: string; // ISO 8601 string
  refreshInterval: number; // in seconds
  timestamp: string; // ISO 8601 string
}
