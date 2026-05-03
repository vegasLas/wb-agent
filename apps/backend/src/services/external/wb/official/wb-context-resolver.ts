import { prisma } from '@/config/database';
import type { WbApiCategory } from '@prisma/client';

/**
 * Resolve the official API supplier ID for a given user and category.
 * Returns the WbApiProfileSupplier.id that has an active key for the category.
 */
export async function resolveOfficialSupplierId(
  userId: number,
  category: WbApiCategory,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      apiProfiles: {
        include: {
          suppliers: {
            include: {
              apiKeys: {
                where: {
                  isActive: true,
                  categories: { has: category },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const profile = user.selectedApiProfileId
    ? user.apiProfiles.find((p) => p.id === user.selectedApiProfileId)
    : user.apiProfiles[0];

  if (!profile) return null;

  const supplier = profile.selectedSupplierId
    ? profile.suppliers.find(
        (s) => s.supplierId === profile.selectedSupplierId && s.apiKeys.length > 0,
      )
    : profile.suppliers.find((s) => s.apiKeys.length > 0);

  return supplier?.id ?? null;
}
