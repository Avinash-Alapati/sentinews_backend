export const SENTIMENT_LABELS = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;

export const CACHE_KEYS = {
  OVERVIEW: "sentiment:overview",
  COMPANY: "sentiment:company",
  ARTICLE: "sentiment:article",
} as const;

export const REFRESH_INTERVALS = {
  OVERVIEW_SEC: 300,  // 5 minutes
  ARTICLE_SEC: 60,    // 1 minute
  COMPANY_SEC: 1800,  // 30 minutes
} as const;

// Operational Configuration Constants for Sentiment module
export const SENTIMENT_CONFIG = {
  POSITIVE_THRESHOLD: 0.60,         // 60% threshold for positive sentiment
  NEGATIVE_THRESHOLD: 0.60,         // 60% threshold for negative sentiment
  GEMINI_MODEL_NAME: "gemini-1.5-flash",
  PROVIDER_TIMEOUT_MS: 15000,
  MAX_RETRY_COUNT: 3,
  
  // Circuit Breaker Parameters
  CIRCUIT_BREAKER_FAILURES: 3,
  CIRCUIT_BREAKER_COOLDOWN_MS: 300000, // 5 minutes
} as const;
