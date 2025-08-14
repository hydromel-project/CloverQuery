/**
 * Simple in-memory cache with TTL support
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    const valid = entries.filter(([_, entry]) => now - entry.timestamp <= entry.ttl);
    const expired = entries.filter(([_, entry]) => now - entry.timestamp > entry.ttl);

    return {
      totalEntries: entries.length,
      validEntries: valid.length,
      expiredEntries: expired.length,
      cacheKeys: entries.map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
        expired: now - entry.timestamp > entry.ttl,
      })),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// Global cache instance
export const globalCache = new SimpleCache();

/**
 * Cache decorator function for async operations
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = globalCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  globalCache.set(key, result, ttl);
  return result;
}