import { prisma } from "@/shared/lib/prisma";
import { IMarketSnapshotRepository } from "./market-snapshot.repository.interface";
import {
  MarketSnapshot,
  SectorSnapshot,
  InstitutionalActivity,
  MarketMover,
} from "@prisma/client";

/**
 * Encapsulated Prisma implementation for market snapshots storage access.
 */
export class MarketSnapshotRepository implements IMarketSnapshotRepository {
  /**
   * Persists a single index snapshot value to the database.
   */
  async saveIndexSnapshot(
    data: Omit<MarketSnapshot, "id" | "timestamp">
  ): Promise<MarketSnapshot> {
    return prisma.marketSnapshot.create({ data });
  }

  /**
   * Resolves the last inserted index quote value by matching symbol.
   */
  async getLatestIndexSnapshot(symbol: string): Promise<MarketSnapshot | null> {
    return prisma.marketSnapshot.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });
  }

  /**
   * Persists a single sector performance average entry.
   */
  async saveSectorSnapshot(
    data: Omit<SectorSnapshot, "id" | "timestamp">
  ): Promise<SectorSnapshot> {
    return prisma.sectorSnapshot.create({ data });
  }

  /**
   * Fetches the latest computed performance metrics across all active sectors.
   */
  async getLatestSectorPerformances(): Promise<SectorSnapshot[]> {
    return prisma.sectorSnapshot.findMany({
      distinct: ["sectorName"],
      orderBy: [
        { sectorName: "asc" },
        { timestamp: "desc" },
      ],
    });
  }

  /**
   * Persists a daily FII/DII End-of-Day flow record (upserts if date match triggers).
   */
  async saveInstitutionalActivity(
    data: Omit<InstitutionalActivity, "id" | "timestamp">
  ): Promise<InstitutionalActivity> {
    return prisma.institutionalActivity.upsert({
      where: { date: data.date },
      update: data,
      create: data,
    });
  }

  /**
   * Fetches list of historic daily EOD flow activities sorted by date descending.
   */
  async getInstitutionalActivityList(limit: number): Promise<InstitutionalActivity[]> {
    return prisma.institutionalActivity.findMany({
      take: limit,
      orderBy: { date: "desc" },
    });
  }

  /**
   * Saves top movers records in bulk.
   */
  async saveMarketMovers(
    movers: Omit<MarketMover, "id" | "timestamp">[]
  ): Promise<void> {
    if (movers.length === 0) return;
    await prisma.marketMover.createMany({ data: movers });
  }

  /**
   * Fetches the latest batch of top gainer/loser movers.
   */
  async getLatestMarketMovers(isGainer: boolean, limit: number): Promise<MarketMover[]> {
    const latestMover = await prisma.marketMover.findFirst({
      where: { isGainer },
      orderBy: { timestamp: "desc" },
    });

    if (!latestMover) return [];

    return prisma.marketMover.findMany({
      where: {
        isGainer,
        timestamp: latestMover.timestamp,
      },
      take: limit,
      orderBy: { changePercent: isGainer ? "desc" : "asc" },
    });
  }

  /**
   * Deletes telemetry records older than a cutoff threshold to prevent DB bloat.
   */
  async pruneSnapshotsOlderThan(cutoff: Date): Promise<number> {
    const [indexDeleted, moversDeleted, sectorDeleted] = await prisma.$transaction([
      prisma.marketSnapshot.deleteMany({
        where: { timestamp: { lt: cutoff } },
      }),
      prisma.marketMover.deleteMany({
        where: { timestamp: { lt: cutoff } },
      }),
      prisma.sectorSnapshot.deleteMany({
        where: { timestamp: { lt: cutoff } },
      }),
    ]);

    return indexDeleted.count + moversDeleted.count + sectorDeleted.count;
  }
}
