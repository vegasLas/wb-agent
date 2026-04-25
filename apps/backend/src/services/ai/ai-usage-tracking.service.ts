/**
 * AI Usage Tracking Service
 * Records AI token consumption and calculated costs to the database.
 * Fire-and-forget from callers so AI latency is unaffected.
 */

import { prisma } from '@/config/database';
import { calculateCost } from '@/config/ai-pricing';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AiUsageTracking');

export type AiFeature = 'ai_chat' | 'feedback_auto_answer';

export interface TrackAiUsageInput {
  userId: number;
  feature: AiFeature;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

export interface GetSummaryFilters {
  from: Date;
  to: Date;
  groupBy?: 'feature' | 'model' | 'user' | 'day';
}

export interface GetDetailsFilters {
  from: Date;
  to: Date;
  userId?: number;
  feature?: AiFeature;
  limit?: number;
  offset?: number;
}

export class AiUsageTrackingService {
  /**
   * Track AI usage asynchronously.
   * Callers should NOT await this to avoid blocking AI responses.
   */
  trackUsage(input: TrackAiUsageInput): void {
    // Fire-and-forget
    this.trackUsageAsync(input).catch((err) => {
      logger.error('[AI-USAGE] Failed to track usage:', err);
    });
  }

  private async trackUsageAsync(input: TrackAiUsageInput): Promise<void> {
    const {
      userId,
      feature,
      model,
      usage,
      conversationId,
      messageId,
      metadata,
    } = input;

    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    const totalTokens = usage.totalTokens ?? promptTokens + completionTokens;

    const cost = calculateCost(model, promptTokens, completionTokens);

    await prisma.aiUsageLog.create({
      data: {
        userId,
        feature,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        costCurrency: 'USD',
        conversationId: conversationId ?? null,
        messageId: messageId ?? null,
        metadata: metadata ?? null,
      },
    });

    logger.debug(
      `[AI-USAGE] Tracked ${feature} for user ${userId}: ${totalTokens} tokens, $${cost}`,
    );
  }

  async getSummary(filters: GetSummaryFilters) {
    const { from, to, groupBy = 'feature' } = filters;

    const where = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    const [totals, breakdown] = await Promise.all([
      prisma.aiUsageLog.aggregate({
        where,
        _sum: {
          cost: true,
          totalTokens: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.aiUsageLog.groupBy({
        by:
          groupBy === 'day'
            ? []
            : groupBy === 'user'
              ? [prisma.aiUsageLog.fields.userId]
              : groupBy === 'model'
                ? [prisma.aiUsageLog.fields.model]
                : [prisma.aiUsageLog.fields.feature],
        where,
        _sum: {
          cost: true,
          totalTokens: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _sum: {
            cost: 'desc',
          },
        },
      }),
    ]);

    return {
      totalCost: totals._sum.cost ?? 0,
      totalTokens: totals._sum.totalTokens ?? 0,
      totalRequests: totals._count._all ?? 0,
      groupBy,
      breakdown: breakdown.map((row) => ({
        group:
          groupBy === 'user'
            ? String(row.userId)
            : groupBy === 'model'
              ? row.model
              : row.feature,
        cost: row._sum.cost ?? 0,
        tokens: row._sum.totalTokens ?? 0,
        requests: row._count._all ?? 0,
      })),
    };
  }

  async getDetails(filters: GetDetailsFilters) {
    const {
      from,
      to,
      userId,
      feature,
      limit = 50,
      offset = 0,
    } = filters;

    const clampedLimit = Math.min(Math.max(limit, 1), 100);

    const where: any = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };
    if (userId !== undefined) where.userId = userId;
    if (feature !== undefined) where.feature = feature;

    const [logs, total] = await Promise.all([
      prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: clampedLimit,
        skip: offset,
      }),
      prisma.aiUsageLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: clampedLimit,
      offset,
    };
  }
}

export const aiUsageTrackingService = new AiUsageTrackingService();
