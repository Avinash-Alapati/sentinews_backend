export interface NormalizedQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  indices?: string[];
  weeklyChange?: number | null;
  ytdChange?: number | null;
  volatility?: number | null;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  indices?: string[];
}

export interface NormalizedMovers {
  gainers: MarketMover[];
  losers: MarketMover[];
  volumeShockers?: MarketMover[];
  timestamp: Date;
}

export interface NormalizedInstitutionalFlow {
  date: Date;
  fiiBuy: number;
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
  combinedNet: number;
  timestamp: Date;
}

export interface NormalizedBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  ratio: number;
  timestamp: Date;
}

export interface SectorLeader {
  symbol: string;
  changePercent: number;
}

export interface NormalizedSectorPerformance {
  sectorName: string;
  changePercent: number;
  volume: number;
  topGainer: SectorLeader;
  topLoser: SectorLeader;
  timestamp: Date;
}

export type MarketSession = "PRE_MARKET" | "REGULAR" | "POST_MARKET" | "CLOSED";

export interface MarketStatus {
  isOpen: boolean;
  session: MarketSession;
  exchange: string;
  timezone: string;
  lastChecked: Date;
}

export type MarketDirection = "BULLISH" | "BEARISH" | "SIDEWAYS";
export type MarketBreadthStatus = "ACCUMULATION" | "DISTRIBUTION" | "CONSOLIDATION";

export interface MarketSummary {
  overallDirection: MarketDirection;
  breadthStatus: MarketBreadthStatus;
  strongestSector: string;
  weakestSector: string;
  mostActiveIndex: string;
  lastUpdated: Date;
}
