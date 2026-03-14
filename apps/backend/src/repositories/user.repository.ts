import { User, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

export class UserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    return this.prismaClient.user.findUnique({
      where: { id },
      include: {
        accounts: {
          include: { suppliers: true },
        },
        supplierApiKey: true,
      },
    });
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    return this.prismaClient.user.findUnique({
      where: { telegramId },
      include: {
        accounts: {
          include: { suppliers: true },
        },
        supplierApiKey: true,
      },
    });
  }

  async create(data: {
    telegramId: bigint;
    name: string;
    chatId?: string;
    username?: string;
    languageCode?: string;
    envInfo?: unknown;
  }): Promise<User> {
    return this.prismaClient.user.create({
      data: {
        ...data,
        envInfo: data.envInfo as any,
      },
    });
  }

  async updateSelectedAccount(userId: number, accountId: string | null): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { selectedAccountId: accountId },
    });
  }

  async decrementAutobookingCount(userId: number, count: number = 1): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        autobookingCount: { decrement: count },
      },
    });
  }

  async incrementAutobookingCount(userId: number, count: number = 1): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        autobookingCount: { increment: count },
      },
    });
  }
}

export const userRepository = new UserRepository(prisma);
