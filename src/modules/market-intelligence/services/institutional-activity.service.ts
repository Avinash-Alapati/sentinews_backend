import { IMarketProvider } from "@/integrations/market";
import { IMarketSnapshotRepository } from "../repositories/market-snapshot.repository.interface";
import { InstitutionalActivityDTO } from "../dtos/institutional-activity.dto";
import { localCache } from "@/shared/lib/cache";
import { CACHE_KEYS, REFRESH_INTERVALS } from "../constants/market.constants";

/**
 * Business Service orchestrating Foreign and Domestic flow data.
 */
export class InstitutionalActivityService {
  constructor(
    private marketProvider: IMarketProvider,
    private snapshotRepo: IMarketSnapshotRepository
  ) {}

  /**
   * Fetches EOD flows from provider, saves to DB, and returns DTO list.
   * Gracefully falls back to local DB snaps if provider feeds drop.
   */
  async getInstitutionalActivity(limit: number): Promise<InstitutionalActivityDTO[]> {
    const cacheKey = `${CACHE_KEYS.INSTITUTIONAL}:${limit}`;
    const cached = localCache.get<InstitutionalActivityDTO[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const today = new Date();
      const flow = await this.marketProvider.getInstitutionalActivity(today);
      await this.snapshotRepo.saveInstitutionalActivity({
        date: flow.date,
        fiiBuy: flow.fiiBuy,
        fiiSell: flow.fiiSell,
        fiiNet: flow.fiiNet,
        diiBuy: flow.diiBuy,
        diiSell: flow.diiSell,
        diiNet: flow.diiNet,
        combinedNet: flow.combinedNet,
      });
    } catch (err) {
      console.warn("[InstitutionalActivityService] External provider failed. Serving DB snapshot fallback.", err);
    }

    const snaps = await this.snapshotRepo.getInstitutionalActivityList(limit);
    const dtos = snaps.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      fii: {
        buyValue: s.fiiBuy,
        sellValue: s.fiiSell,
        netValue: s.fiiNet,
      },
      dii: {
        buyValue: s.diiBuy,
        sellValue: s.diiSell,
        netValue: s.diiNet,
      },
      combinedNetValue: s.combinedNet,
      timestamp: s.timestamp.toISOString(),
    }));

    localCache.set(cacheKey, dtos, REFRESH_INTERVALS.INSTITUTIONAL_SEC);
    return dtos;
  }
}
