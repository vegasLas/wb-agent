/**
 * Cache Service
 * Simple in-memory cache with TTL support
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Map<string, CacheItem<unknown>> = new Map();

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get data from cache if not expired
   * @param key - Cache key
   * @param maxAge - Maximum age in milliseconds
   * @returns Cached data or null if expired/not found
   */
  get<T>(key: string, maxAge: number): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string, maxAge: number): boolean {
    return this.get(key, maxAge) !== null;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
