import { prisma } from "@/config/database";
import { safeDecrypt } from "@/utils/encryption";
import { logger } from "@/utils/logger";

interface ApiKeyUsage {
  userId: number;
  apiKey: string;
  requestTimes: number[];
  lastUsed: number;
  blockedUntil?: number;
}

/**
 * Service for managing API key rotation and rate limiting
 * Uses singleton pattern to maintain state across requests
 *
 * Rate limiting rules:
 * - Max 6 requests per minute per API key
 * - Round-robin selection for load distribution
 * - Automatic cleanup of old request times
 * - Temporary blocking for rate limit violations
 */
export class ApiKeyRateLimiterService {
  private static instance: ApiKeyRateLimiterService;
  private apiKeyUsage = new Map<number, ApiKeyUsage>();
  private readonly MAX_REQUESTS_PER_MINUTE = 6;
  private readonly MINUTE_IN_MS = 60 * 1000;
  private currentKeyIndex = 0;

  static getInstance(): ApiKeyRateLimiterService {
    if (!this.instance) {
      this.instance = new ApiKeyRateLimiterService();
    }
    return this.instance;
  }

  /**
   * Load active API keys from database
   */
  private async loadActiveApiKeys(): Promise<ApiKeyUsage[]> {
    try {
      const technicalModeUserIds = process.env.TECHNICAL_MODE_USER_IDS;

      let whereCondition: Record<string, unknown> = { isActive: true };

      // In technical mode, only load specified users' API keys
      if (technicalModeUserIds) {
        logger.info(
          `Technical mode enabled for user IDs: ${technicalModeUserIds}`,
        );
        whereCondition = {
          userId: {
            in: technicalModeUserIds.split(',').map((id) => parseInt(id)),
          },
          isActive: true,
        };
      }

      let apiKeys;
      try {
        apiKeys = await prisma.supplierApiKey.findMany({
          where: whereCondition,
          orderBy: { updatedAt: 'asc' },
        });
      } catch (error) {
        // Fallback if isActive field doesn't exist
        const fallbackWhere = technicalModeUserIds
          ? {
              userId: {
                in: technicalModeUserIds.split(',').map((id) => parseInt(id)),
              },
            }
          : {};
        apiKeys = await prisma.supplierApiKey.findMany({
          where: fallbackWhere,
          orderBy: { updatedAt: 'asc' },
        });
      }

      return apiKeys
        .map((key: { userId: number; apiKey: string }) => {
          const decryptedKey = safeDecrypt(key.apiKey);
          if (!decryptedKey) {
            logger.warn(`Failed to decrypt API key for user ${key.userId}`);
            return null;
          }

          return {
            userId: key.userId,
            apiKey: decryptedKey,
            requestTimes: [],
            lastUsed: 0,
          };
        })
        .filter(Boolean) as ApiKeyUsage[];
    } catch (error) {
      logger.error('Error loading API keys:', error);
      return [];
    }
  }

  /**
   * Clean old requests outside the time window
   */
  private cleanOldRequests(usage: ApiKeyUsage): void {
    const now = Date.now();
    usage.requestTimes = usage.requestTimes.filter(
      (time) => now - time < this.MINUTE_IN_MS,
    );
  }

  /**
   * Check if a request can be made with this key
   */
  private canMakeRequest(usage: ApiKeyUsage): boolean {
    // Check if key is temporarily blocked
    if (usage.blockedUntil && Date.now() < usage.blockedUntil) {
      return false;
    }

    this.cleanOldRequests(usage);
    return usage.requestTimes.length < this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * Record a request for tracking
   */
  private recordRequest(usage: ApiKeyUsage): void {
    const now = Date.now();
    usage.requestTimes.push(now);
    usage.lastUsed = now;
  }

  /**
   * Get an available API key using round-robin
   */
  async getAvailableApiKey(): Promise<{
    userId: number;
    apiKey: string;
  } | null> {
    await this.loadAndUpdateKeys();

    if (this.apiKeyUsage.size === 0) {
      return null;
    }

    const usageArray = Array.from(this.apiKeyUsage.values());
    const startIndex = this.currentKeyIndex;

    for (let i = 0; i < usageArray.length; i++) {
      const index = (startIndex + i) % usageArray.length;
      const usage = usageArray[index];

      if (this.canMakeRequest(usage)) {
        this.recordRequest(usage);
        this.currentKeyIndex = (index + 1) % usageArray.length;
        return {
          userId: usage.userId,
          apiKey: usage.apiKey,
        };
      }
    }

    return null;
  }

  /**
   * Deactivate an API key
   */
  async deactivateApiKey(userId: number): Promise<void> {
    try {
      try {
        await prisma.supplierApiKey.update({
          where: { userId },
          data: { isActive: false },
        });
      } catch (error) {
        // Fallback to delete if isActive doesn't exist
        await prisma.supplierApiKey.delete({
          where: { userId },
        });
      }

      this.apiKeyUsage.delete(userId);
      logger.info(`Deactivated API key for user ${userId}`);
    } catch (error) {
      logger.error(
        `Failed to deactivate/delete API key for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Mark a key as used (update last used time)
   */
  markKeyAsUsed(userId: number): void {
    const usage = this.apiKeyUsage.get(userId);
    if (usage) {
      usage.lastUsed = Date.now();
    }
  }

  /**
   * Temporarily block an API key
   */
  temporarilyBlockApiKey(userId: number, durationHours = 72): void {
    const usage = this.apiKeyUsage.get(userId);
    if (usage) {
      usage.blockedUntil = Date.now() + durationHours * 60 * 60 * 1000;
      logger.info(
        `Temporarily blocked API key for user ${userId} for ${durationHours} hours`,
      );
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    userId: number;
    requestsInLastMinute: number;
    lastUsed: number;
  }[] {
    return Array.from(this.apiKeyUsage.values()).map((usage) => {
      this.cleanOldRequests(usage);
      return {
        userId: usage.userId,
        requestsInLastMinute: usage.requestTimes.length,
        lastUsed: usage.lastUsed,
      };
    });
  }

  /**
   * Get count of active keys
   */
  getActiveKeyCount(): number {
    return this.apiKeyUsage.size;
  }

  /**
   * Get optimal interval between requests
   */
  getOptimalInterval(): number {
    const activeKeyCount = this.apiKeyUsage.size;

    if (activeKeyCount === 0) {
      return 10000; // Default 10 seconds if no keys
    }

    // Calculate optimal interval: 60 seconds / (6 requests per key * number of keys)
    const totalRequestsPerMinute =
      this.MAX_REQUESTS_PER_MINUTE * activeKeyCount;
    const optimalIntervalMs = (60 * 1000) / totalRequestsPerMinute;

    // Ensure minimum interval of 150ms
    return Math.max(150, Math.ceil(optimalIntervalMs));
  }

  /**
   * Check if should wait before next request
   */
  async shouldWaitBeforeNextRequest(): Promise<{
    shouldWait: boolean;
    waitTime: number;
  }> {
    await this.loadAndUpdateKeys();

    const availableKey = this.getAvailableApiKeySync();

    if (availableKey) {
      return { shouldWait: false, waitTime: 0 };
    }

    const nextAvailableTime = this.getNextAvailableTime();
    if (nextAvailableTime === null) {
      return { shouldWait: true, waitTime: 10000 };
    }

    return {
      shouldWait: true,
      waitTime: Math.max(150, nextAvailableTime),
    };
  }

  getNextAvailableTime(): number | null {
    const usageArray = Array.from(this.apiKeyUsage.values());

    if (usageArray.length === 0) {
      return null;
    }

    let earliestAvailable = Infinity;

    for (const usage of usageArray) {
      this.cleanOldRequests(usage);

      if (usage.requestTimes.length < this.MAX_REQUESTS_PER_MINUTE) {
        return 0;
      }

      const oldestRequest = Math.min(...usage.requestTimes);
      const availableAt = oldestRequest + this.MINUTE_IN_MS;
      earliestAvailable = Math.min(earliestAvailable, availableAt);
    }

    return earliestAvailable === Infinity
      ? null
      : earliestAvailable - Date.now();
  }

  private async loadAndUpdateKeys(): Promise<void> {
    const activeKeys = await this.loadActiveApiKeys();

    for (const key of activeKeys) {
      if (!this.apiKeyUsage.has(key.userId)) {
        this.apiKeyUsage.set(key.userId, key);
      }
    }

    // Remove keys that are no longer active
    for (const [userId] of this.apiKeyUsage) {
      if (!activeKeys.find((key) => key.userId === userId)) {
        this.apiKeyUsage.delete(userId);
      }
    }
  }

  private getAvailableApiKeySync(): { userId: number; apiKey: string } | null {
    const usageArray = Array.from(this.apiKeyUsage.values());
    const startIndex = this.currentKeyIndex;

    for (let i = 0; i < usageArray.length; i++) {
      const index = (startIndex + i) % usageArray.length;
      const usage = usageArray[index];

      if (this.canMakeRequest(usage)) {
        return {
          userId: usage.userId,
          apiKey: usage.apiKey,
        };
      }
    }

    return null;
  }
}

export const apiKeyRateLimiterService = ApiKeyRateLimiterService.getInstance();
