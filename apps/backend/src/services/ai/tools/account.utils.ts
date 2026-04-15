import { prisma } from '@/config/database';

export async function resolveDefaultAccount(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true },
  });

  if (!user) throw new Error('User not found');

  if (user.selectedAccountId) {
    const account = user.accounts.find(a => a.id === user.selectedAccountId);
    if (account) return account.id;
  }

  if (user.accounts.length === 0) {
    throw new Error('No accounts linked to user');
  }

  if (user.accounts.length === 1) {
    return user.accounts[0].id;
  }

  throw new Error('Multiple accounts found. Please select an account first.');
}
