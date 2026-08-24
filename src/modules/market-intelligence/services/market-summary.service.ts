import { IMarketSnapshotRepository } from "../repositories/market-snapshot.repository.interface";
import { MarketSummaryDTO } from "../dtos/market-summary.dto";
import { MarketDirection, MarketBreadthStatus } from "../types/market-data.types";
import { localCache } from "@/shared/lib/cache";

/**
 * Business Service executing real-time metrics computations.
 */
export class MarketSummaryService {
  constructor(
    private snapshotRepo: IMarketSnapshotRepository
  ) {}

  /**
   * Compiles the derived summary indices from database snapshot histories.
   */
  async getMarketSummary(): Promise<MarketSummaryDTO> {
    const cached = localCache.get<MarketSummaryDTO>("market:summary");
    if (cached) {
      return cached;
    }

    // 1. Overall Direction (check Nifty 50 snapshot threshold)
    const nifty = await this.snapshotRepo.getLatestIndexSnapshot("NIFTY50");
    let overallDirection: MarketDirection = "SIDEWAYS";
    if (nifty) {
      if (nifty.changePercent > 0.5) {
        overallDirection = "BULLISH";
      } else if (nifty.changePercent < -0.5) {
        overallDirection = "BEARISH";
      }
    }

    // 2. Breadth Status (Count advances/declines from movers list)
    const advances = await this.snapshotRepo.getLatestMarketMovers(true, 100);
    const declines = await this.snapshotRepo.getLatestMarketMovers(false, 100);
    const advCount = advances.length;
    const decCount = declines.length;
    const ratio = decCount === 0 ? advCount : advCount / decCount;

    let breadthStatus: MarketBreadthStatus = "CONSOLIDATION";
    if (ratio > 1.5) {
      breadthStatus = "ACCUMULATION";
    } else if (ratio < 0.7) {
      breadthStatus = "DISTRIBUTION";
    }

    // 3. Strongest & Weakest Sectors
    const sectors = await this.snapshotRepo.getLatestSectorPerformances();
    let strongestSector = "N/A";
    let weakestSector = "N/A";
    if (sectors.length > 0) {
      const sortedSectors = [...sectors].sort((a, b) => b.changePercent - a.changePercent);
      const strongest = sortedSectors[0];
      const weakest = sortedSectors[sortedSectors.length - 1];
      
      strongestSector = `${strongest.sectorName} (${strongest.changePercent > 0 ? "+" : ""}${strongest.changePercent}%)`;
      weakestSector = `${weakest.sectorName} (${weakest.changePercent > 0 ? "+" : ""}${weakest.changePercent}%)`;
    }

    // 4. Most Active Index (Volume multiplier comparison)
    const nifty50 = await this.snapshotRepo.getLatestIndexSnapshot("NIFTY50");
    const banknifty = await this.snapshotRepo.getLatestIndexSnapshot("BANKNIFTY");
    
    let mostActiveIndex = "NIFTY50";
    if (banknifty && nifty50 && banknifty.price > nifty50.price) {
      mostActiveIndex = "BANKNIFTY";
    }

    const dto: MarketSummaryDTO = {
      overallDirection,
      breadthStatus,
      strongestSector,
      weakestSector,
      mostActiveIndex,
      lastUpdated: new Date().toISOString(),
    };

    localCache.set("market:summary", dto, 60); // 1 minute local cache TTL
    return dto;
  }
}
