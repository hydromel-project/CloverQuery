/**
 * Cache management utilities
 */

import { globalCache } from './cache';

export class CacheManager {
  /**
   * Clear all customer caches
   */
  static clearCustomerCaches(): number {
    const stats = globalCache.getStats();
    let cleared = 0;
    
    stats.cacheKeys.forEach(({ key }) => {
      if (key.startsWith('customers_')) {
        globalCache.delete(key);
        cleared++;
      }
    });
    
    return cleared;
  }

  /**
   * Clear specific merchant cache
   */
  static clearMerchantCache(merchantId: string, currency: string): boolean {
    const key = `customers_${merchantId}_${currency}`;
    return globalCache.delete(key);
  }

  /**
   * Refresh all customer caches by clearing them
   */
  static async refreshCustomerCaches(): Promise<number> {
    return this.clearCustomerCaches();
  }

  /**
   * Get detailed cache information
   */
  static getCacheInfo() {
    const stats = globalCache.getStats();
    const customerCaches = stats.cacheKeys.filter(({ key }) => key.startsWith('customers_'));
    
    return {
      ...stats,
      customerCaches: customerCaches.map(cache => ({
        ...cache,
        merchantInfo: this.parseCacheKey(cache.key),
      })),
    };
  }

  /**
   * Parse cache key to extract merchant info
   */
  private static parseCacheKey(key: string) {
    const match = key.match(/customers_(.+)_(.+)/);
    if (match) {
      return {
        merchantId: match[1],
        currency: match[2],
      };
    }
    return null;
  }

  /**
   * Force cache cleanup
   */
  static cleanup(): number {
    return globalCache.cleanup();
  }
}

/**
 * Cache warming function
 */
export async function warmCache(merchantClients: any[]) {
  const promises = merchantClients.map(async (client) => {
    try {
      await client.getCustomersWithCards();
      return { success: true, merchant: client.config };
    } catch (error) {
      return { success: false, merchant: client.config, error };
    }
  });

  return Promise.all(promises);
}