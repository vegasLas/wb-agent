import { prisma } from '@/config/database';
import { UserEnvInfo, SupplierResponse } from '@/types/wb';
import { logger } from '@/utils/logger';
import { wbAccountRequest } from '@/utils/wb-request';
import { getCookiesFromAccount } from '@/utils/cookies';
import type { Cookie } from 'playwright';

export interface CreateAccountInput {
  userId: number;
  wbCookies: string;
  wbLocalStorage: string;
  phoneWb?: string;
}

export interface UpdateAccountInput {
  wbCookies?: string;
  wbLocalStorage?: string;
  phoneWb?: string;
  selectedSupplierId?: string;
}

export interface SaveAccountParams {
  userId: number;
  wbCookies: string;
  wbLocalStorage: string;
  phoneWb?: string;
  userAgent: string;
  proxy?: UserEnvInfo['proxy'];
}

export class AccountService {
  /**
   * Get suppliers using account-based authentication
   */
  async getAccountSuppliers(
    accountId: string,
    userAgent: string,
    proxy?: UserEnvInfo['proxy'],
    supplierId = '',
  ): Promise<{ name: string; id: string }[]> {
    try {
      const response = await wbAccountRequest<[SupplierResponse]>({
        url: 'https://seller.wildberries.ru/ns/suppliers/suppliers-portal-core/suppliers',
        accountId,
        userAgent,
        proxy,
        supplierId: supplierId || undefined,
        isJsonRpc: true,
        body: [
          { method: 'getUserSuppliers', params: {} },
          { method: 'listCountries', params: {} },
        ],
      });

      const suppliers =
        response.find((item) => 'suppliers' in (item.result || {}))?.result
          ?.suppliers || [];

      return suppliers.map((supplier: { name: string; id: string }) => ({
        name: supplier.name,
        id: supplier.id,
      }));
    } catch (error) {
      logger.error(`Error getting suppliers for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Get all accounts for a user with their suppliers
   */
  async getUserAccounts(userId: number) {
    return await prisma.account.findMany({
      where: { userId },
      include: {
        suppliers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single account by ID
   */
  async getAccountById(accountId: string, userId: number) {
    return prisma.account.findFirst({
      where: { id: accountId, userId },
      include: { suppliers: true },
    });
  }

  /**
   * Delete an account and all its suppliers
   */
  async deleteAccount(accountId: string, userId: number): Promise<void> {
    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    // Delete account (suppliers will be deleted via cascade)
    await prisma.account.delete({
      where: { id: accountId },
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

  /**
   * Update the selected supplier for an account
   */
  async updateSelectedSupplier(
    accountId: string,
    supplierId: string,
    userId: number,
  ) {
    // Verify account belongs to user and contains supplier
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        suppliers: {
          some: { supplierId },
        },
      },
    });

    if (!account) {
      throw new Error(
        'Account not found or does not contain the specified supplier',
      );
    }

    // Update selected supplier
    return prisma.account.update({
      where: { id: accountId },
      data: { selectedSupplierId: supplierId },
    });
  }

  /**
   * Update account cookies
   */
  async updateAccountCookies(
    accountId: string,
    wbCookies: string,
    phoneWb?: string,
  ): Promise<void> {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        wbCookies,
        ...(phoneWb && { phoneWb }),
      },
    });
  }

  /**
   * Find account that contains a specific supplier
   */
  async findAccountBySupplierId(userId: number, supplierId: string) {
    return await prisma.account.findFirst({
      where: {
        userId,
        suppliers: {
          some: {
            supplierId,
          },
        },
      },
      include: {
        suppliers: true,
      },
    });
  }

  /**
   * Sync suppliers for an account by fetching from WB API
   */
  async syncAccountSuppliers(
    accountId: string,
    userAgent: string,
    proxy?: UserEnvInfo['proxy'],
  ): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account?.wbCookies) {
      throw new Error('Account not found or no cookies available');
    }

    try {
      const suppliers = await this.getAccountSuppliers(
        accountId,
        userAgent,
        proxy,
        account.selectedSupplierId || '',
      );

      // Remove suppliers that no longer exist
      await prisma.supplier.deleteMany({
        where: {
          accountId,
          supplierId: {
            notIn: suppliers.map((s) => s.id),
          },
        },
      });

      // Add or update suppliers
      for (const supplier of suppliers) {
        await prisma.supplier.upsert({
          where: {
            supplierId_accountId: {
              supplierId: supplier.id,
              accountId: account.id,
            },
          },
          update: { supplierName: supplier.name },
          create: {
            supplierId: supplier.id,
            supplierName: supplier.name,
            accountId: account.id,
          },
        });
      }
    } catch (error) {
      logger.error('Error syncing suppliers for account:', accountId, error);
      throw error;
    }
  }

  /**
   * Save supplier info after successful authentication
   * Creates account and fetches all suppliers for the account
   */
  async saveAccount(params: SaveAccountParams) {
    const { userId, wbCookies, wbLocalStorage, phoneWb, userAgent, proxy } =
      params;

    if (!wbCookies) {
      throw new Error('WB cookies are required to save supplier info');
    }

    // Check account limit and create atomically
    const account = await prisma.$transaction(async (tx) => {
      const userWithAccounts = await tx.user.findUnique({
        where: { id: userId },
        include: { accounts: true },
      });

      if (!userWithAccounts) {
        throw new Error('User not found');
      }

      if (userWithAccounts.accounts.length >= userWithAccounts.maxAccounts) {
        throw new Error(
          `Лимит аккаунтов (${userWithAccounts.maxAccounts}) достигнут. Обновите подписку для добавления новых аккаунтов.`,
        );
      }

      return tx.account.create({
        data: {
          userId,
          wbCookies,
          wbLocalStorage,
          phoneWb,
        },
      });
    });

    try {
      // Fetch all suppliers for this account
      const allSuppliers = await this.getAccountSuppliers(
        account.id,
        userAgent,
        proxy,
      );

      if (allSuppliers.length === 0) {
        throw new Error('No suppliers found for this account');
      }

      // Add all suppliers to the account
      for (const supplier of allSuppliers) {
        await prisma.supplier.upsert({
          where: {
            supplierId_accountId: {
              supplierId: supplier.id,
              accountId: account.id,
            },
          },
          update: {
            supplierName: supplier.name,
          },
          create: {
            supplierId: supplier.id,
            supplierName: supplier.name,
            accountId: account.id,
          },
        });
      }

      // Set the first supplier as selected by default
      await prisma.account.update({
        where: { id: account.id },
        data: { selectedSupplierId: allSuppliers[0].id },
      });

      // Check if user has no selected account and set this as the selected account
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.selectedAccountId) {
        await prisma.user.update({
          where: { id: userId },
          data: { selectedAccountId: account.id },
        });
      }
    } catch (error) {
      logger.error('Error fetching suppliers for new account:', error);
      // If we can't fetch suppliers, delete the account to avoid orphaned accounts
      await prisma.account.delete({
        where: { id: account.id },
      });
      throw new Error('Failed to create account: Unable to fetch suppliers');
    }

    return account;
  }

  /**
   * Update account localStorage
   */
  async updateAccountLocalStorage(
    accountId: string,
    wbLocalStorage: string,
  ): Promise<void> {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        wbLocalStorage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find account by ID
   */
  async findById(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: { suppliers: true },
    });
  }

  /**
   * Update account
   */
  async update(id: string, data: UpdateAccountInput) {
    return prisma.account.update({
      where: { id },
      data,
      include: { suppliers: true },
    });
  }

  /**
   * Get decrypted cookies for an account
   */
  async getAccountCookies(accountId: string): Promise<Cookie[]> {
    return getCookiesFromAccount(accountId);
  }
}

export const accountService = new AccountService();
