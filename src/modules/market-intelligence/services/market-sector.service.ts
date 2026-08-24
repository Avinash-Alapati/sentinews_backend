import { IMarketSnapshotRepository } from "../repositories/market-snapshot.repository.interface";
import { SectorPerformanceDTO } from "../dtos/sector-performance.dto";
import { localCache } from "@/shared/lib/cache";
import { CACHE_KEYS, REFRESH_INTERVALS } from "../constants/market.constants";

/**
 * Business Service orchestrating sector performance and rotations averages.
 */
export class MarketSectorService {
  constructor(
    private snapshotRepo: IMarketSnapshotRepository
  ) {}

  /**
   * Resolves the latest weighted average sectoral perform indices.
   */
  async getSectorPerformance(): Promise<SectorPerformanceDTO[]> {
    const cached = localCache.get<SectorPerformanceDTO[]>(CACHE_KEYS.SECTORS);
    if (cached) {
      return cached;
    }

    const snaps = await this.snapshotRepo.getLatestSectorPerformances();
    const dtos = snaps.map((s) => ({
      sectorName: s.sectorName,
      changePercent: s.changePercent,
      volume: s.volume,
      topGainer: {
        symbol: s.topGainerSymbol,
        changePercent: s.topGainerChange,
      },
      topLoser: {
        symbol: s.topLoserSymbol,
        changePercent: s.topLoserChange,
      },
      timestamp: s.timestamp.toISOString(),
    }));

    localCache.set(CACHE_KEYS.SECTORS, dtos, REFRESH_INTERVALS.SECTORS_SEC);
    return dtos;
  }
}
