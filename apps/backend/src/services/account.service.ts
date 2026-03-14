import { prisma } from '../config/database';
import { UserEnvInfo } from '../types/wb';
import { logger } from '../utils/logger';

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
    supplierId: string = ''
  ): Promise<{ name: string; id: string }[]> {
    // This will be implemented with wbRequest utility later
    // For now, return empty array - the suppliers will be synced later
    logger.info(`Getting suppliers for account ${accountId}`);
    return [];
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
  }

  /**
   * Update account cookies
   */
  async updateAccountCookies(
    accountId: string,
    wbCookies: string,
    phoneWb?: string
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
    proxy?: UserEnvInfo['proxy']
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
        account.selectedSupplierId || ''
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
  async saveAccount(params: SaveAccountParams): Promise<void> {
    const { userId, wbCookies, wbLocalStorage, phoneWb, userAgent, proxy } =
      params;

    if (!wbCookies) {
      throw new Error('WB cookies are required to save supplier info');
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        userId,
        wbCookies,
        wbLocalStorage,
        phoneWb,
      },
    });

    try {
      // Fetch all suppliers for this account
      const allSuppliers = await this.getAccountSuppliers(
        account.id,
        userAgent,
        proxy
      );

      if (allSuppliers.length > 0) {
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
      }

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
  }

  /**
   * Update account localStorage
   */
  async updateAccountLocalStorage(
    accountId: string,
    wbLocalStorage: string
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
}

export const accountService = new AccountService();
