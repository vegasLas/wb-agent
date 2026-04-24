/**
 * Supplier Resolver Utility
 * Centralizes user → account → supplier resolution logic.
 * Eliminates duplication across feedback services and tools.
 */

import { prisma } from '@/config/database';
import type { ProxyConfig } from '@/utils/wb-request';

export interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

/**
 * Resolve the user's selected account and supplier.
 * Returns both the supplierId and full account context (for WB API calls).
 */
export async function resolveAccountContext(userId: number): Promise<AccountContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: {
          suppliers: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const account = user.accounts.find((a) => a.id === user.selectedAccountId);
  if (!account) {
    throw new Error('No account selected for user');
  }

  const supplierId = account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new Error('No supplier found for account');
  }

  const envInfo = user.envInfo as unknown as {
    userAgent?: string;
    proxy?: ProxyConfig;
  } | null;

  const userAgent =
    envInfo?.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  return {
    accountId: account.id,
    supplierId,
    userAgent,
    proxy: envInfo?.proxy,
  };
}

/**
 * Resolve only the supplierId for a given user.
 * Lightweight wrapper when only the supplier ID is needed.
 */
export async function resolveSupplierId(userId: number): Promise<string> {
  const { supplierId } = await resolveAccountContext(userId);
  return supplierId;
}
