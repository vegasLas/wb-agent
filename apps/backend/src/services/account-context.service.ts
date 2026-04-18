import { prisma } from '@/config/database';
import type { ProxyConfig } from '@/utils/wb-request';

export interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/**
 * Resolve account, supplier, and environment context for a user.
 *
 * @param userId - The user's database ID
 * @param options.strict - If true, requires an explicitly selected account;
 *                        otherwise falls back to the first account.
 * @throws Error if user, account, or supplier cannot be resolved
 */
export async function resolveAccountContext(
  userId: number,
  options: { strict?: boolean } = {},
): Promise<AccountContext> {
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

  let account = user.accounts.find((a) => a.id === user.selectedAccountId);

  if (!account) {
    if (options.strict) {
      throw new Error('No account selected for user');
    }
    account = user.accounts[0];
  }

  if (!account) {
    throw new Error('No account found for user');
  }

  const supplierId =
    account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new Error('No supplier found for account');
  }

  const envInfo = user.envInfo as unknown as {
    userAgent?: string;
    proxy?: ProxyConfig;
  } | null;

  return {
    accountId: account.id,
    supplierId,
    userAgent: envInfo?.userAgent || DEFAULT_USER_AGENT,
    proxy: envInfo?.proxy,
  };
}
