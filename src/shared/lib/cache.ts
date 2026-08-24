import { metricsTracker } from "@/shared/utils/metrics";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Standard zero-dependency local in-memory cache helper.
 * Tracks expirations using timestamps.
 */
export class LocalMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Resolves a key. Returns null if expired or missing.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      metricsTracker.trackCacheMiss();
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      metricsTracker.trackCacheMiss();
      return null;
    }

    metricsTracker.trackCacheHit();
    return entry.value as T;
  }

  /**
   * Caches a value with a specific TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidates a key.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears the entire cache map.
   */
  clear(): void {
    this.cache.clear();
  }
}

export const localCache = new LocalMemoryCache();
