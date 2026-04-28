/**
 * Subscription Downgrade Service
 * Handles downgrading expired paid users to FREE tier,
 * including archiving excess autobookings/reschedules and deleting excess accounts.
 *
 * NOTE: We do NOT touch UserSubscription records here.
 * A subscription is considered active/inactive based on its endedAt field.
 * When a paid subscription expires (endedAt < now), the user automatically
 * falls back to FREE tier. This service only performs the cleanup:
 * resetting maxAccounts, archiving excess slots, and deleting excess accounts.
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import {
  AUTOBOOKING_SLOTS,
  RESCHEDULE_SLOTS,
} from '@/constants/payments';

const logger = createLogger('SubscriptionDowngrade');

/**
 * Downgrade a user to FREE tier by:
 * 1. Resetting maxAccounts to 1
 * 2. Archiving excess autobookings beyond FREE slot limit
 * 3. Archiving excess reschedules beyond FREE slot limit
 * 4. Deleting excess accounts (keep selected account, delete others)
 *
 * We do NOT create or modify UserSubscription records — endedAt already
 * determines whether a subscription is active.
 */
export async function downgradeUserToFree(userId: number): Promise<void> {
  logger.info(`Downgrading user ${userId} to FREE tier`);

  await prisma.$transaction(async (tx) => {
    // 1. Reset maxAccounts
    await tx.user.update({
      where: { id: userId },
      data: { maxAccounts: 1 },
    });

    // 2. Archive excess autobookings
    await archiveExcessAutobookings(tx, userId);

    // 3. Archive excess reschedules
    await archiveExcessReschedules(tx, userId);

    // 4. Delete excess accounts
    await deleteExcessAccounts(tx, userId);
  });

  logger.info(`User ${userId} successfully downgraded to FREE`);
}

async function archiveExcessAutobookings(
  tx: typeof prisma,
  userId: number,
): Promise<void> {
  const freeSlotLimit = AUTOBOOKING_SLOTS['FREE'];

  const activeAutobookings = await tx.autobooking.findMany({
    where: { userId, status: { in: ['PENDING', 'ACTIVE'] } },
    orderBy: { createdAt: 'asc' },
  });

  let usedSlots = 0;
  const toArchive: string[] = [];

  for (const ab of activeAutobookings) {
    const slotCount = ab.customDates?.length ?? 1;
    if (usedSlots + slotCount > freeSlotLimit) {
      toArchive.push(ab.id);
    } else {
      usedSlots += slotCount;
    }
  }

  if (toArchive.length > 0) {
    await tx.autobooking.updateMany({
      where: { id: { in: toArchive } },
      data: { status: 'ARCHIVED' },
    });
    logger.info(
      `Archived ${toArchive.length} excess autobookings for user ${userId}`,
    );
  }
}

async function archiveExcessReschedules(
  tx: typeof prisma,
  userId: number,
): Promise<void> {
  const freeSlotLimit = RESCHEDULE_SLOTS['FREE'];

  const activeReschedules = await tx.autobookingReschedule.findMany({
    where: { userId, status: { in: ['PENDING', 'ACTIVE'] } },
    orderBy: { createdAt: 'asc' },
  });

  let usedSlots = 0;
  const toArchive: string[] = [];

  for (const rs of activeReschedules) {
    const slotCount = rs.customDates?.length ?? 1;
    if (usedSlots + slotCount > freeSlotLimit) {
      toArchive.push(rs.id);
    } else {
      usedSlots += slotCount;
    }
  }

  if (toArchive.length > 0) {
    await tx.autobookingReschedule.updateMany({
      where: { id: { in: toArchive } },
      data: { status: 'ARCHIVED' },
    });
    logger.info(
      `Archived ${toArchive.length} excess reschedules for user ${userId}`,
    );
  }
}

async function deleteExcessAccounts(
  tx: typeof prisma,
  userId: number,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { selectedAccountId: true },
  });

  let keepAccountId = user?.selectedAccountId;

  // If no selected account, keep the most recently created one
  if (!keepAccountId) {
    const latestAccount = await tx.account.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    keepAccountId = latestAccount?.id ?? null;
  }

  // Delete all accounts except the one to keep
  const deleteResult = await tx.account.deleteMany({
    where: {
      userId,
      id: { not: keepAccountId ?? undefined },
    },
  });

  if (deleteResult.count > 0) {
    logger.info(
      `Deleted ${deleteResult.count} excess accounts for user ${userId}`,
    );
  }
}

/**
 * Check whether a user still needs to be downgraded.
 * Returns true if the user has config/resources that exceed FREE limits.
 */
async function userNeedsDowngrade(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      maxAccounts: true,
      _count: {
        select: {
          accounts: true,
          autobookings: { where: { status: { in: ['PENDING', 'ACTIVE'] } } },
          autobookingReschedules: {
            where: { status: { in: ['PENDING', 'ACTIVE'] } },
          },
        },
      },
    },
  });

  if (!user) return false;

  // If maxAccounts is already 1 and there are no enabled accounts beyond 1,
  // and no active autobookings/reschedules, the user is already downgraded.
  if (user.maxAccounts === 1 && user._count.accounts <= 1) {
    // Also check if any autobookings/reschedules exist (they shouldn't if already archived)
    if (
      user._count.autobookings === 0 &&
      user._count.autobookingReschedules === 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Find all users with expired paid subscriptions and downgrade them to FREE.
 * Returns the number of users downgraded.
 */
export async function downgradeExpiredUsers(): Promise<number> {
  const now = new Date();

  // Find users with expired paid subscriptions who haven't been downgraded yet
  // (maxAccounts > 1 indicates they still have paid limits)
  const expiredSubs = await prisma.userSubscription.findMany({
    where: {
      tier: { not: 'FREE' },
      endedAt: { lt: now },
      user: {
        maxAccounts: { gt: 1 },
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  let downgradedCount = 0;
  for (const sub of expiredSubs) {
    try {
      await downgradeUserToFree(sub.userId);
      downgradedCount++;
    } catch (error) {
      logger.error(`Failed to downgrade user ${sub.userId}:`, error);
    }
  }

  logger.info(`Downgraded ${downgradedCount} expired users to FREE`);
  return downgradedCount;
}
