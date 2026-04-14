import { prisma } from '@/config/database';
import { UserEnvInfo } from '@/types/wb';
import { InputJsonValue } from '@prisma/client/runtime/library';

export class UserService {
  async findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({
      where: { telegramId },
      include: {
        accounts: { include: { suppliers: true } },
        supplierApiKey: true,
      },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        accounts: { include: { suppliers: true } },
        supplierApiKey: true,
        payments: true,
      },
    });
  }

  async findByIdWithChatId(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        telegramId: true,
        chatId: true,
        login: true,
        name: true,
      },
    });
  }

  async createUser(data: {
    telegramId: bigint;
    name: string;
    chatId?: string;
    username?: string;
    languageCode?: string;
    envInfo?: UserEnvInfo;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        envInfo: data.envInfo as unknown as InputJsonValue,
        envInfoUpdatedAt: data.envInfo ? new Date() : undefined,
      },
    });
  }

  async updateChatId(telegramId: bigint, chatId: string) {
    return prisma.user.update({
      where: { telegramId },
      data: { chatId },
    });
  }

  async updateEnvInfo(userId: number, envInfo: UserEnvInfo) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        envInfo: envInfo as unknown as InputJsonValue,
        envInfoUpdatedAt: new Date(),
      },
    });
  }

  async logoutWb(telegramId: bigint): Promise<void> {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    // Delete all accounts (cascade deletes suppliers)
    await prisma.account.deleteMany({
      where: { userId: user.id },
    });

    // Clear selected account
    await prisma.user.update({
      where: { id: user.id },
      data: { selectedAccountId: null },
    });
  }

  async logoutAccount(userId: number, accountId: string): Promise<void> {
    await prisma.account.delete({
      where: { id: accountId, userId },
    });

    // If this was the selected account, clear it
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.selectedAccountId === accountId) {
      await prisma.user.update({
        where: { id: userId },
        data: { selectedAccountId: null },
      });
    }
  }

  async updateSelectedAccount(userId: number, accountId: string | null) {
    if (accountId) {
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new Error('Account not found');
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: { selectedAccountId: accountId },
    });
  }

  async agreeToTerms(userId: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { agreeTerms: true },
    });
  }

  async updateMpstatsToken(userId: number, token: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { mpstatsToken: token },
    });
  }

  async getUserStats(userId: number) {
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        supplyTriggers: true,
        autobookings: true,
      },
    });

    return {
      totalSupplies: stats?.supplyTriggers?.length || 0,
      successfulBookings:
        stats?.autobookings?.filter(
          (b: { status: string }) => b.status === 'COMPLETED',
        )?.length || 0,
      activeRequests:
        stats?.autobookings?.filter(
          (b: { status: string }) => b.status === 'ACTIVE',
        )?.length || 0,
    };
  }

  /**
   * Find a random user that has at least one account
   * Used as fallback when current user has no accounts
   */
  async findRandomUserWithAccount() {
    const usersWithAccounts = await prisma.user.findMany({
      where: {
        accounts: {
          some: {},
        },
      },
      include: {
        accounts: { include: { suppliers: true } },
      },
      take: 10, // Get up to 10 users to have some randomness
    });

    if (usersWithAccounts.length === 0) {
      return null;
    }

    // Return a random user from the list
    const randomIndex = Math.floor(Math.random() * usersWithAccounts.length);
    return usersWithAccounts[randomIndex];
  }
}

export const userService = new UserService();
