import { IMarketProvider } from "@/integrations/market";
import { IMarketSnapshotRepository } from "../repositories/market-snapshot.repository.interface";
import { MarketMoversDTO } from "../dtos/market-mover.dto";
import { localCache } from "@/shared/lib/cache";
import { CACHE_KEYS, REFRESH_INTERVALS } from "../constants/market.constants";

/**
 * Business Service orchestrating top gainers and losers rankings.
 */
export class MarketMoverService {
  constructor(
    private marketProvider: IMarketProvider,
    private snapshotRepo: IMarketSnapshotRepository
  ) {}

  /**
   * Fetches latest movers batch, saves snapshots to DB, and returns DTO.
   */
  async getMarketMovers(): Promise<MarketMoversDTO> {
    const cached = localCache.get<MarketMoversDTO>(CACHE_KEYS.MOVERS);
    if (cached) {
      return cached;
    }

    let movers;
    try {
      movers = await this.marketProvider.getTopMovers();
      
      const dbMovers = [
        ...movers.gainers.map((m) => ({
          symbol: m.symbol,
          name: m.name,
          price: m.price,
          change: m.change,
          changePercent: m.changePercent,
          volume: BigInt(m.volume),
          isGainer: true,
        })),
        ...movers.losers.map((m) => ({
          symbol: m.symbol,
          name: m.name,
          price: m.price,
          change: m.change,
          changePercent: m.changePercent,
          volume: BigInt(m.volume),
          isGainer: false,
        })),
      ];

      // Prevent duplicate mover writes if saved within the last 5 minutes
      const latestDbMovers = await this.snapshotRepo.getLatestMarketMovers(true, 1);
      if (!latestDbMovers || latestDbMovers.length === 0 || Date.now() - latestDbMovers[0].timestamp.getTime() > 290000) {
        await this.snapshotRepo.saveMarketMovers(dbMovers);
      }
    } catch (err) {
      console.warn("[MarketMoverService] Provider failed. Serving DB snapshot fallback.", err);
      
      const dbGainers = await this.snapshotRepo.getLatestMarketMovers(true, 10);
      const dbLosers = await this.snapshotRepo.getLatestMarketMovers(false, 10);
      
      movers = {
        gainers: dbGainers.map((g) => ({
          symbol: g.symbol,
          name: g.name,
          price: g.price,
          change: g.change,
          changePercent: g.changePercent,
          volume: Number(g.volume),
        })),
        losers: dbLosers.map((l) => ({
          symbol: l.symbol,
          name: l.name,
          price: l.price,
          change: l.change,
          changePercent: l.changePercent,
          volume: Number(l.volume),
        })),
        timestamp: dbGainers[0]?.timestamp || new Date(),
      };
    }

    const dto: MarketMoversDTO = {
      gainers: movers.gainers.map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        change: m.change,
        changePercent: m.changePercent,
        volume: m.volume,
      })),
      losers: movers.losers.map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        change: m.change,
        changePercent: m.changePercent,
        volume: m.volume,
      })),
      volumeShockers: (movers.volumeShockers || []).map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        change: m.change,
        changePercent: m.changePercent,
        volume: m.volume,
      })),
      timestamp: movers.timestamp.toISOString(),
    };

    localCache.set(CACHE_KEYS.MOVERS, dto, REFRESH_INTERVALS.MOVERS_SEC);
    return dto;
  }
}
