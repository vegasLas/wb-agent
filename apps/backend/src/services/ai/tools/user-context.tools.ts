import { tool, Tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { safeTool, loggedTool } from './safe-tool.utils';
import { calculateSlotCount } from '@/utils/slot-utils';

export function userContextTools(userId: number): Record<string, Tool> {
  return {
    getUserContext: tool({
      description: `Get the current user's context: autobooking slot usage, suppliers, recent autobookings, and recent supply triggers.
Call this when you need to know the user's slot limits before creating an autobooking, or when the user asks about their suppliers, recent autobookings, or triggers.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getUserContext', async () => {
        return loggedTool('getUserContext', userId, async () => {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              accounts: { include: { suppliers: true } },
              autobookings: { orderBy: { createdAt: 'desc' }, take: 5 },
              supplyTriggers: { orderBy: { createdAt: 'desc' }, take: 5 },
              subscriptions: { orderBy: { startedAt: 'desc' }, take: 1 },
            },
          });

          if (!user) throw new Error('User not found');

          const suppliers = user.accounts.flatMap((a) => a.suppliers);

          const activeSlots = user.autobookings
            .filter((ab) => ab.status === 'PENDING' || ab.status === 'ACTIVE')
            .reduce(
              (sum, ab) => sum + calculateSlotCount(ab.dateType, ab.customDates as Date[]),
              0,
            );
          const { AUTOBOOKING_SLOTS } = await import('@/constants/payments');
          const maxSlots = AUTOBOOKING_SLOTS[user.subscriptions?.[0]?.tier ?? 'FREE'];

          return {
            activeSlots,
            maxSlots,
            slotUsagePercent: Math.round((activeSlots / maxSlots) * 100),
            suppliers: suppliers.map((s) => s.supplierName),
            recentAutobookings: user.autobookings.map((ab) => ({
              id: ab.id,
              supplyType: ab.supplyType,
              warehouseId: ab.warehouseId,
              status: ab.status,
            })),
            recentTriggers: user.supplyTriggers.map((t) => ({
              id: t.id,
              warehouseIds: t.warehouseIds,
              status: t.status,
            })),
          };
        });
      }),
    }),
  };
}
