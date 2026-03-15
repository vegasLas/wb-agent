import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface ApiKeyInfo {
  userId: number;
  apiKey: string;
  lastUsed: Date;
  requestCount: number;
  isBlocked: boolean;
  blockedUntil?: Date;
}

/**
 * Service for managing API key rotation and rate limiting
 * Uses singleton pattern to maintain state across requests
 */
export class ApiKeyRateLimiterService {
  private apiKeys: Map<number, ApiKeyInfo> = new Map();
  private lastLoadTime: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get next available API key using round-robin
   */
  async getAvailableApiKey(): Promise<{ userId: number; apiKey: string } | null> {
    // Reload API keys if cache expired or not loaded
    if (!this.lastLoadTime || Date.now() - this.lastLoadTime.getTime() > this.CACHE_TTL_MS) {
      await this.loadApiKeys();
    }

    const now = new Date();

    // Find first available (non-blocked) key
    for (const [userId, keyInfo] of this.apiKeys) {
      // Skip blocked keys
      if (keyInfo.isBlocked && keyInfo.blockedUntil && keyInfo.blockedUntil > now) {
        continue;
      }

      // Unblock if block period expired
      if (keyInfo.isBlocked && keyInfo.blockedUntil && keyInfo.blockedUntil <= now) {
        keyInfo.isBlocked = false;
        keyInfo.blockedUntil = undefined;
        keyInfo.requestCount = 0;
        logger.info(`Unblocked API key for user ${userId}`);
      }

      return { userId, apiKey: keyInfo.apiKey };
    }

    return null;
  }

  /**
   * Load all active API keys from database
   */
  private async loadApiKeys(): Promise<void> {
    try {
      const apiKeys = await prisma.supplierApiKey.findMany({
        where: { isActive: true },
      });

      // Preserve existing key info (block status, etc.) while reloading
      const existingKeys = new Map(this.apiKeys);
      this.apiKeys.clear();

      for (const key of apiKeys) {
        const existing = existingKeys.get(key.userId);
        this.apiKeys.set(key.userId, {
          userId: key.userId,
          apiKey: key.apiKey,
          lastUsed: existing?.lastUsed || new Date(),
          requestCount: existing?.requestCount || 0,
          isBlocked: existing?.isBlocked || false,
          blockedUntil: existing?.blockedUntil,
        });
      }

      this.lastLoadTime = new Date();
      logger.info(`Loaded ${apiKeys.length} API keys for rate limiting`);
    } catch (error) {
      logger.error('Error loading API keys:', error);
    }
  }

  /**
   * Deactivate an API key permanently
   */
  async deactivateApiKey(userId: number): Promise<void> {
    this.apiKeys.delete(userId);

    try {
      await prisma.supplierApiKey.update({
        where: { userId },
        data: { isActive: false },
      });
      logger.info(`Deactivated API key for user ${userId}`);
    } catch (error) {
      logger.error(`Error deactivating API key for user ${userId}:`, error);
    }
  }

  /**
   * Temporarily block an API key for specified seconds
   */
  temporarilyBlockApiKey(userId: number, seconds: number): void {
    const keyInfo = this.apiKeys.get(userId);
    if (keyInfo) {
      keyInfo.isBlocked = true;
      keyInfo.blockedUntil = new Date(Date.now() + seconds * 1000);
      logger.info(`Temporarily blocked API key for user ${userId} for ${seconds}s`);
    }
  }

  /**
   * Get next available time for any blocked key
   * Returns milliseconds until next key is available, or null if no keys are blocked
   */
  getNextAvailableTime(): number | null {
    const now = new Date();
    let earliestUnblock: Date | null = null;

    for (const keyInfo of this.apiKeys.values()) {
      if (keyInfo.isBlocked && keyInfo.blockedUntil) {
        if (!earliestUnblock || keyInfo.blockedUntil < earliestUnblock) {
          earliestUnblock = keyInfo.blockedUntil;
        }
      }
    }

    if (earliestUnblock) {
      return Math.max(0, earliestUnblock.getTime() - now.getTime());
    }

    return null;
  }

  /**
   * Mark key as used (update lastUsed timestamp)
   */
  markKeyAsUsed(userId: number): void {
    const keyInfo = this.apiKeys.get(userId);
    if (keyInfo) {
      keyInfo.lastUsed = new Date();
      keyInfo.requestCount++;
    }
  }

  /**
   * Get stats for all API keys (for monitoring)
   */
  getKeyStats(): Array<{
    userId: number;
    isBlocked: boolean;
    blockedUntil?: Date;
    requestCount: number;
    lastUsed: Date;
  }> {
    return Array.from(this.apiKeys.values()).map((key) => ({
      userId: key.userId,
      isBlocked: key.isBlocked,
      blockedUntil: key.blockedUntil,
      requestCount: key.requestCount,
      lastUsed: key.lastUsed,
    }));
  }

  /**
   * Force refresh API keys from database
   */
  async refreshKeys(): Promise<void> {
    this.lastLoadTime = null;
    await this.loadApiKeys();
  }
}

export const apiKeyRateLimiterService = new ApiKeyRateLimiterService();
