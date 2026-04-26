import { User, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/database';

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
        profile: true,
        telegram: true,
      },
    });
  }

  async findByIdWithIdentities(id: number): Promise<(User & { identities: { id: number; provider: string; providerId: string | null; email: string | null }[] }) | null> {
    return this.prismaClient.user.findUnique({
      where: { id },
      include: {
        accounts: {
          include: { suppliers: true },
        },
        supplierApiKey: true,
        identities: {
          select: {
            id: true,
            provider: true,
            providerId: true,
            email: true,
          },
        },
        profile: true,
        telegram: true,
      },
    });
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    chatId?: string;
    username?: string;
    languageCode?: string;
    envInfo?: unknown;
  }): Promise<User & { profile: { name: string; email: string | null; phone: string | null } | null; telegram: { chatId: string | null; username: string | null; languageCode: string | null } | null }> {
    return this.prismaClient.user.create({
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
      include: {
        profile: true,
        telegram: true,
      },
    });
  }

  async updateSelectedAccount(
    userId: number,
    accountId: string | null,
  ): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { selectedAccountId: accountId },
    });
  }

  async decrementAutobookingCount(userId: number, count = 1): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        autobookingCount: { decrement: count },
      },
    });
  }

  async incrementAutobookingCount(userId: number, count = 1): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        autobookingCount: { increment: count },
      },
    });
  }
}

export const userRepository = new UserRepository(prisma);
