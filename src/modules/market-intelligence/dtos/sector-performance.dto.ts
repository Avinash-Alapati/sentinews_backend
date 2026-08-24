/**
 * DTO representing an outperforming or underperforming constituent stock in a sector.
 */
export interface SectorLeaderDTO {
  symbol: string;
  changePercent: number;
}

/**
 * DTO representing weighted sectoral capital rotations and respective leaders.
 */
export interface SectorPerformanceDTO {
  sectorName: string;
  changePercent: number;
  volume: number;
  topGainer: SectorLeaderDTO;
  topLoser: SectorLeaderDTO;
  timestamp: string; // ISO 8601 string
}
