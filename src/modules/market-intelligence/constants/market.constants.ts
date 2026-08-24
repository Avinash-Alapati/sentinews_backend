export const SUPPORTED_INDICES = {
  NIFTY50: { symbol: "NIFTY50", name: "Nifty 50" },
  SENSEX: { symbol: "SENSEX", name: "BSE Sensex" },
  BANKNIFTY: { symbol: "BANKNIFTY", name: "Nifty Bank" },
  INDIAVIX: { symbol: "INDIAVIX", name: "India VIX" },
} as const;

export const CACHE_KEYS = {
  STATUS: "market:status",
  OVERVIEW: "market:overview",
  BREADTH: "market:breadth",
  SECTORS: "market:sectors",
  MOVERS: "market:movers",
  INSTITUTIONAL: "market:institutional",
} as const;

export const REFRESH_INTERVALS = {
  STATUS_SEC: 300,      // 5 minutes
  OVERVIEW_SEC: 60,     // 1 minute
  BREADTH_SEC: 300,     // 5 minutes
  SECTORS_SEC: 3600,    // 1 hour
  MOVERS_SEC: 300,      // 5 minutes
  INSTITUTIONAL_SEC: 7200, // 2 hours
} as const;

export const NSE_SESSION_CONFIG = {
  EXCHANGE: "NSE",
  TIMEZONE: "Asia/Kolkata",
  PRE_MARKET_START: "09:00",
  REGULAR_START: "09:15",
  REGULAR_END: "15:30",
  POST_MARKET_END: "16:00",
} as const;
