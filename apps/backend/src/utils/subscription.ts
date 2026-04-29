/**
 * Subscription utility helpers
 * Works with the UserSubscription relational model.
 * 
 * Core principle: Only PAID users have subscription records.
 * FREE = no record (default state).
 */

import { prisma } from '@/config/database';
import { SubscriptionTier } from '@prisma/client';
import { UserTier } from '@/constants/payments';

export interface SubscriptionInfo {
  tier: UserTier;
  endedAt: Date | null;
  isFree: boolean;
  isActive: boolean;
}

/**
 * Get the most recent subscription for a user.
 * Returns the paid subscription or null (which means FREE).
 */
export async function getCurrentSubscription(userId: number) {
  return prisma.userSubscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Get subscription info for a user in a convenient format.
 * FREE users return { tier: 'FREE', endedAt: null, isFree: true, isActive: true }.
 */
export async function getSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
  const sub = await getCurrentSubscription(userId);

  // No record = FREE (default state)
  if (!sub) {
    return { tier: 'FREE', endedAt: null, isFree: true, isActive: true };
  }

  // Expired paid subscription = effectively FREE
  if (sub.endedAt && sub.endedAt <= new Date()) {
    return { tier: 'FREE', endedAt: sub.endedAt, isFree: true, isActive: false };
  }

  // Active paid subscription
  return { tier: sub.tier, endedAt: sub.endedAt, isFree: false, isActive: true };
}

/**
 * Check if user has an active PAID subscription.
 * FREE users always return false.
 */
export async function hasActivePaidSubscription(userId: number): Promise<boolean> {
  const sub = await getCurrentSubscription(userId);
  if (!sub) return false;
  return !!sub.endedAt && sub.endedAt > new Date();
}

/**
 * Get the current tier for a user.
 * Returns 'FREE' if no active paid subscription exists.
 */
export async function getCurrentTier(userId: number): Promise<UserTier> {
  const sub = await getCurrentSubscription(userId);
  if (!sub) return 'FREE';
  if (sub.endedAt && sub.endedAt <= new Date()) return 'FREE';
  return sub.tier;
}

/**
 * Create a new paid subscription for a user.
 * Ends any existing active subscription.
 */
export async function createSubscription(
  userId: number,
  tier: SubscriptionTier,
  endedAt: Date | null,
) {
  // End any existing active subscription
  await prisma.userSubscription.updateMany({
    where: {
      userId,
      OR: [
        { endedAt: null },
        { endedAt: { gt: new Date() } },
      ],
    },
    data: {
      endedAt: new Date(),
    },
  });

  // Create new subscription
  return prisma.userSubscription.create({
    data: {
      userId,
      tier,
      startedAt: new Date(),
      endedAt,
    },
  });
}

/**
 * Downgrade a user to FREE tier.
 * Simply ends any active paid subscription.
 * No FREE record is created — FREE is the default (null) state.
 */
export async function downgradeToFree(userId: number) {
  await prisma.userSubscription.updateMany({
    where: {
      userId,
      OR: [
        { endedAt: null },
        { endedAt: { gt: new Date() } },
      ],
    },
    data: {
      endedAt: new Date(),
    },
  });
}
