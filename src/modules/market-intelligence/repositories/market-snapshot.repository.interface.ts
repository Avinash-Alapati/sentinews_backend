import {
  MarketSnapshot,
  SectorSnapshot,
  InstitutionalActivity,
  MarketMover,
} from "@prisma/client";

/**
 * Interface contract defining CRUD storage methods for market snapshots.
 */
export interface IMarketSnapshotRepository {
  /**
   * Persists a single index value snapshot.
   */
  saveIndexSnapshot(
    data: Omit<MarketSnapshot, "id" | "timestamp">
  ): Promise<MarketSnapshot>;

  /**
   * Retrieves the most recent index quote by symbol.
   */
  getLatestIndexSnapshot(symbol: string): Promise<MarketSnapshot | null>;

  /**
   * Persists a single sector performance average entry.
   */
  saveSectorSnapshot(
    data: Omit<SectorSnapshot, "id" | "timestamp">
  ): Promise<SectorSnapshot>;

  /**
   * Retrieves the most recent performance logs for all sectors.
   */
  getLatestSectorPerformances(): Promise<SectorSnapshot[]>;

  /**
   * Persists a daily FII/DII End-of-Day flow record.
   */
  saveInstitutionalActivity(
    data: Omit<InstitutionalActivity, "id" | "timestamp">
  ): Promise<InstitutionalActivity>;

  /**
   * Retrieves a list of historical daily EOD flows.
   */
  getInstitutionalActivityList(limit: number): Promise<InstitutionalActivity[]>;

  /**
   * Persists top gainers and losers in bulk.
   */
  saveMarketMovers(
    movers: Omit<MarketMover, "id" | "timestamp">[]
  ): Promise<void>;

  /**
   * Retrieves the latest list of top gainers or losers.
   */
  getLatestMarketMovers(isGainer: boolean, limit: number): Promise<MarketMover[]>;

  /**
   * Removes fine-grained snapshots older than a specific date.
   */
  pruneSnapshotsOlderThan(cutoff: Date): Promise<number>;
}
