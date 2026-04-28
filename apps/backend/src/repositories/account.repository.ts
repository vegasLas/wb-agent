import { Account, PrismaClient } from '@prisma/client';
import { BaseRepository, FindManyParams } from '@/repositories/base.repository';
import { prisma } from '@/config/database';

export interface CreateAccountInput {
  userId: number;
  wbCookies?: string;
  wbLocalStorage?: string;
  phoneWb?: string;
}

export interface UpdateAccountInput {
  wbCookies?: string;
  wbLocalStorage?: string;
  phoneWb?: string;
  selectedSupplierId?: string;
}

export class AccountRepository extends BaseRepository<
  Account,
  CreateAccountInput,
  UpdateAccountInput
> {
  constructor(prismaClient: PrismaClient) {
    super(prismaClient);
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: { suppliers: true },
    });
  }

  async findEnabledById(id: string): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { id, isDisabled: false },
      include: { suppliers: true },
    });
  }

  async findByUserId(userId: number): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId, isDisabled: false },
      include: { suppliers: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(params: FindManyParams): Promise<Account[]> {
    return this.prisma.account.findMany({
      ...params,
      include: { suppliers: true },
    });
  }

  async create(data: CreateAccountInput): Promise<Account> {
    return this.prisma.account.create({
      data,
      include: { suppliers: true },
    });
  }

  async update(id: string, data: UpdateAccountInput): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data,
      include: { suppliers: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({ where: { id } });
  }

  // Custom methods
  async findWithSuppliers(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: { suppliers: true },
    });
  }

  async findBySupplierId(
    userId: number,
    supplierId: string,
  ): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: {
        userId,
        suppliers: {
          some: { supplierId },
        },
      },
      include: { suppliers: true },
    });
  }
}

export const accountRepository = new AccountRepository(prisma);
