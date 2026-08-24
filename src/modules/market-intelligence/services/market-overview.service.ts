import { IMarketProvider } from "@/integrations/market";
import { IMarketSnapshotRepository } from "../repositories/market-snapshot.repository.interface";
import { MarketOverviewDTO } from "../dtos/market-overview.dto";
import { localCache } from "@/shared/lib/cache";
import { CACHE_KEYS, REFRESH_INTERVALS } from "../constants/market.constants";

/**
 * Business Service orchestrating indices overview snapshots.
 */
export class MarketOverviewService {
  constructor(
    private marketProvider: IMarketProvider,
    private snapshotRepo: IMarketSnapshotRepository
  ) {}

  /**
   * Fetches core indexes from provider, updates cache, writes snapshot entries, and returns DTO.
   */
  async getMarketOverview(): Promise<MarketOverviewDTO> {
    const cached = localCache.get<MarketOverviewDTO>(CACHE_KEYS.OVERVIEW);
    if (cached) {
      return cached;
    }

    const symbols = [
      "NIFTY50",
      "SENSEX",
      "BANKNIFTY",
      "NIFTYIT",
      "NIFTYAUTO",
      "NIFTYPHARMA",
      "NIFTYMETAL",
      "NIFTYINFRA",
      "INDIAVIX",
    ];
    
    // Fetch index quotes in parallel
    const quotes = await this.marketProvider.getBatchQuotes(symbols);

    // Persist snapshot logs (prevent duplicates for same price/fresh timestamp within 60 seconds)
    await Promise.all(
      quotes.map(async (q) => {
        const latest = await this.snapshotRepo.getLatestIndexSnapshot(q.symbol);
        if (!latest || latest.price !== q.currentPrice || Date.now() - latest.timestamp.getTime() > 60000) {
          await this.snapshotRepo.saveIndexSnapshot({
            symbol: q.symbol,
            price: q.currentPrice,
            change: q.change,
            changePercent: q.changePercent,
          });
        }
      })
    );

    const dto: MarketOverviewDTO = {
      indices: quotes.map((q) => ({
        symbol: q.symbol,
        name: q.name,
        currentPrice: q.currentPrice,
        change: q.change,
        changePercent: q.changePercent,
        timestamp: q.timestamp.toISOString(),
      })),
    };

    localCache.set(CACHE_KEYS.OVERVIEW, dto, REFRESH_INTERVALS.OVERVIEW_SEC);
    return dto;
  }
}
