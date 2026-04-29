/**
 * Subscription utility helpers — Unit Tests
 */

import {
  getCurrentSubscription,
  getBillingPeriodStart,
  getSubscriptionInfo,
  hasActivePaidSubscription,
  getCurrentTier,
} from '../subscription';
import { prisma } from '@/config/database';

jest.mock('../../config/database', () => ({
  prisma: {
    userSubscription: {
      findFirst: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as jest.Mocked<typeof prisma>;

describe('subscription utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingPeriodStart', () => {
    it('should return start of current month for free users (no subscription)', async () => {
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getBillingPeriodStart(1);

      const expected = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      expect(result).toEqual(expected);
    });

    it('should return start of current month for expired subscriptions', async () => {
      const now = new Date();
      const expiredSub = {
        id: 1,
        userId: 1,
        tier: 'LITE' as const,
        startedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        endedAt: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      };
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(expiredSub);

      const result = await getBillingPeriodStart(1);

      const expected = new Date(now.getFullYear(), now.getMonth(), 1);
      expect(result).toEqual(expected);
    });

    it('should return subscription start date (normalized to start of day) for active subscriptions', async () => {
      const now = new Date();
      const startedAt = new Date(now.getFullYear(), now.getMonth(), 15, 14, 30, 45);
      const activeSub = {
        id: 1,
        userId: 1,
        tier: 'PRO' as const,
        startedAt,
        endedAt: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      };
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(activeSub);

      const result = await getBillingPeriodStart(1);

      const expected = new Date(now.getFullYear(), now.getMonth(), 15, 0, 0, 0);
      expect(result).toEqual(expected);
    });

    it('should use the most recent subscription when multiple exist', async () => {
      const now = new Date();
      const mostRecentSub = {
        id: 2,
        userId: 1,
        tier: 'MAX' as const,
        startedAt: new Date(now.getFullYear(), now.getMonth(), 20),
        endedAt: new Date(now.getFullYear(), now.getMonth() + 1, 20),
      };
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(mostRecentSub);

      const result = await getBillingPeriodStart(1);

      expect(mockPrisma.userSubscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { startedAt: 'desc' },
      });
      expect(result).toEqual(new Date(now.getFullYear(), now.getMonth(), 20, 0, 0, 0));
    });
  });

  describe('getSubscriptionInfo', () => {
    it('returns FREE for no subscription', async () => {
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(null);

      const info = await getSubscriptionInfo(1);

      expect(info).toEqual({
        tier: 'FREE',
        endedAt: null,
        isFree: true,
        isActive: true,
      });
    });

    it('returns FREE for expired subscription', async () => {
      const now = new Date();
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        tier: 'LITE' as const,
        startedAt: new Date(now.getFullYear() - 1, 0, 1),
        endedAt: new Date(now.getFullYear() - 1, 1, 1),
      });

      const info = await getSubscriptionInfo(1);

      expect(info.tier).toBe('FREE');
      expect(info.isFree).toBe(true);
      expect(info.isActive).toBe(false);
    });

    it('returns tier for active subscription', async () => {
      const now = new Date();
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        tier: 'PRO' as const,
        startedAt: now,
        endedAt: new Date(now.getFullYear() + 1, 0, 1),
      });

      const info = await getSubscriptionInfo(1);

      expect(info.tier).toBe('PRO');
      expect(info.isFree).toBe(false);
      expect(info.isActive).toBe(true);
    });
  });

  describe('hasActivePaidSubscription', () => {
    it('returns false for no subscription', async () => {
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await hasActivePaidSubscription(1);

      expect(result).toBe(false);
    });

    it('returns true for active subscription', async () => {
      const now = new Date();
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        tier: 'MAX' as const,
        startedAt: now,
        endedAt: new Date(now.getFullYear() + 1, 0, 1),
      });

      const result = await hasActivePaidSubscription(1);

      expect(result).toBe(true);
    });
  });

  describe('getCurrentTier', () => {
    it('returns FREE for no subscription', async () => {
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getCurrentTier(1);

      expect(result).toBe('FREE');
    });

    it('returns tier for active subscription', async () => {
      const now = new Date();
      (mockPrisma.userSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        tier: 'LITE' as const,
        startedAt: now,
        endedAt: new Date(now.getFullYear() + 1, 0, 1),
      });

      const result = await getCurrentTier(1);

      expect(result).toBe('LITE');
    });
  });
});
