import { prisma } from '@/config/database';
import { UserEnvInfo } from '@/types/wb';

export class UserService {
  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        accounts: { where: { isDisabled: false }, include: { suppliers: true } },
        supplierApiKey: true,
        payments: true,
        profile: true,
        telegram: true,
        subscriptions: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findByIdWithChatId(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        profile: {
          select: { name: true },
        },
        telegram: {
          select: { chatId: true },
        },
      },
    });
  }

  async createUser(data: {
    name: string;
    email?: string;
    phone?: string;
    chatId?: string;
    username?: string;
    languageCode?: string;
    envInfo?: UserEnvInfo;
  }) {
    return prisma.user.create({
      data: {
        envInfo: data.envInfo as any,
        envInfoUpdatedAt: data.envInfo ? new Date() : undefined,
        profile: {
          create: {
            name: data.name,
            email: data.email,
            phone: data.phone,
          },
        },
        telegram: data.chatId
          ? {
              create: {
                chatId: data.chatId,
                username: data.username,
                languageCode: data.languageCode,
              },
            }
          : undefined,
      },
    });
  }

  async updateChatId(userId: number, chatId: string) {
    return prisma.telegram.upsert({
      where: { userId },
      create: { userId, chatId },
      update: { chatId },
    });
  }

  async updateEnvInfo(userId: number, envInfo: UserEnvInfo) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        envInfo: envInfo as any,
        envInfoUpdatedAt: new Date(),
      },
    });
  }

  async logoutWb(userId: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await prisma.account.deleteMany({
      where: { userId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { selectedAccountId: null },
    });
  }

  async logoutAccount(userId: number, accountId: string): Promise<void> {
    await prisma.account.delete({
      where: { id: accountId, userId },
    });

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
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId, isDisabled: false },
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
      take: 10,
    });

    if (usersWithAccounts.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * usersWithAccounts.length);
    return usersWithAccounts[randomIndex];
  }
}

export const userService = new UserService();
