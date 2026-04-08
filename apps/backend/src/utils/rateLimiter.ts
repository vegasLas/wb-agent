import { prisma } from '@/config/database';
import { RateLimit } from '@prisma/client';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  type: 'message' | 'command' | 'callback';
}

/**
 * Persistent rate limiter using database storage
 * Used for Telegram bot rate limiting
 */
export class RateLimiter {
  private rules: RateLimitRule;

  constructor(
    windowMs: number,
    maxRequests: number,
    type: 'message' | 'command' | 'callback',
  ) {
    this.rules = { windowMs, maxRequests, type };
  }

  async isRateLimited(userId: string): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.rules.windowMs);

    // Clean up old rate limit records periodically
    if (Math.random() < 0.1) {
      // 10% chance to clean up on each check
      await this.cleanup();
    }

    // Get or create rate limit record
    const rateLimit = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findFirst({
        where: {
          userId,
          type: this.rules.type,
        },
      });

      if (!existing) {
        return tx.rateLimit.create({
          data: {
            userId,
            type: this.rules.type,
            timestamps: [now],
          },
        });
      }

      return existing;
    });

    // Filter out old timestamps
    const validTimestamps = rateLimit.timestamps.filter(
      (timestamp: Date) => timestamp.getTime() > windowStart.getTime(),
    );

    if (validTimestamps.length >= this.rules.maxRequests) {
      return true;
    }

    // Add new timestamp
    validTimestamps.push(now);

    // Update rate limit record
    await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: {
        timestamps: validTimestamps,
        updatedAt: now,
      },
    });

    return false;
  }

  async getRemainingTime(userId: string): Promise<number> {
    const rateLimit = await prisma.rateLimit.findFirst({
      where: {
        userId,
        type: this.rules.type,
      },
    });

    if (!rateLimit || rateLimit.timestamps.length === 0) {
      return 0;
    }

    const now = new Date().getTime();
    const oldestValidTimestamp = Math.min(
      ...rateLimit.timestamps
        .filter(
          (timestamp: Date) => now - timestamp.getTime() < this.rules.windowMs,
        )
        .map((timestamp: Date) => timestamp.getTime()),
    );

    const timeUntilExpiry = oldestValidTimestamp + this.rules.windowMs - now;
    return Math.max(0, timeUntilExpiry);
  }

  private async cleanup() {
    const cutoff = new Date(Date.now() - this.rules.windowMs);

    // Find records with all expired timestamps
    const expiredRecords = await prisma.rateLimit.findMany({
      where: {
        type: this.rules.type,
        updatedAt: {
          lt: cutoff,
        },
      },
    });

    if (expiredRecords.length > 0) {
      await prisma.rateLimit.deleteMany({
        where: {
          id: {
            in: expiredRecords.map((record: RateLimit) => record.id),
          },
        },
      });
    }
  }
}
