import { prisma } from '@/config/database';

export async function resolveAccountContext(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: { suppliers: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  const account = user.accounts.find(a => a.id === user.selectedAccountId) || user.accounts[0];
  if (!account) throw new Error('No account found for user');

  const supplierId = account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) throw new Error('No supplier found for account');

  const envInfo = user.envInfo as unknown as {
    userAgent?: string;
    proxy?: any;
  } | null;

  const userAgent = envInfo?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const proxy = envInfo?.proxy;

  return { accountId: account.id, supplierId, userAgent, proxy };
}
