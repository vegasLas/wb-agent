/**
 * Close API Service
 * Migrated from deprecated project server/services/closeApiService.ts
 * Handles fetching acceptance coefficients with account rotation and caching
 */

import { prisma } from '../config/database';
import { Supply } from '../types/wb';
import { AcceptanceType } from '../types/wb';
import { wbWarehouseService } from './wb-warehouse.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('CloseApi');
import { ProxyConfig } from '../utils/wb-request';

interface CloseApiWarehouse {
  warehouseID: number;
  warehouseName: string;
  date: string;
  acceptanceType: AcceptanceType;
  coefficient: number;
  allowUnload: boolean;
}

interface CloseApiCache {
  data: Supply[];
  timestamp: number;
}

interface AccountInfo {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
  supplierIds: string[];
}

type BoxTypeId = 2 | 5 | 6;

export class CloseApiService {
  private static instance: CloseApiService;
  private cache: CloseApiCache = { data: [], timestamp: 0 };
  private readonly BUSINESS_HOURS = { start: 6, end: 23 };
  private readonly BASE_REQUEST_INTERVAL_MS = 10000; // 10 seconds between requests (6 per minute max)

  // Account management
  private availableAccounts: AccountInfo[] = [];
  private currentAccountIndex = 0;
  private lastApiCall = 0;
  private lastAccountRefresh = 0;
  private readonly ACCOUNT_REFRESH_INTERVAL = 60000; // Refresh accounts every minute

  // Statistics tracking
  private requestCount = 0;
  private lastLogTime = 0;
  private readonly LOG_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private accountUsageCount = new Map<string, number>();

  // Account ignoring for 403 errors
  private ignoredAccounts = new Map<string, number>(); // accountId -> timestamp when to retry
  private readonly IGNORE_DURATION_MS = 10 * 60 * 60 * 1000; // 10 hours
  private readonly RATE_LIMIT_IGNORE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours for 429 errors

  static getInstance(): CloseApiService {
    if (!this.instance) {
      this.instance = new CloseApiService();
    }
    return this.instance;
  }

  /**
   * Non-blocking fetch method similar to freeWarehouseService
   */
  async fetchCloseApiDataNonBlocking(): Promise<void> {
    try {
      // Check business hours
      if (!this.isWithinBusinessHours(new Date())) {
        return;
      }

      // Simple throttling - check last API call time with calculated interval
      const now = Date.now();
      const calculatedInterval = this.getCalculatedInterval();
      if (now - this.lastApiCall < calculatedInterval) {
        return;
      }

      // Refresh accounts if needed
      await this.refreshAccountsIfNeeded();

      if (this.availableAccounts.length === 0) {
        return;
      }

      // Get next account using rotation
      const account = this.getNextAccount();
      if (!account) {
        return;
      }

      // Fire and forget - don't await, similar to freeWarehouseService
      this.makeApiCall(account)
        .then((data) => {
          this.updateCache(data);
        })
        .catch((error) => {
          const errorMessage = error?.message || '';

          // Handle database recovery errors silently - they're expected during maintenance
          if (this.isDatabaseRecoveryError(errorMessage)) {
            logger.info(
              'Close API temporarily unavailable due to database recovery',
            );
            return;
          }

          // Handle 429 rate limit errors specifically
          if (error?.status === 429 || errorMessage.includes('429')) {
            logger.error(
              `429 Rate Limit error for account ${account.accountId}:`,
              {
                message: errorMessage,
                status: error?.status,
                method: error?.method,
                url: error?.url,
                accountId: account.accountId,
                supplierId: account.supplierId,
              },
            );
            // Call the existing error handler which will handle account cleanup
            this.handleApiError(error, account.accountId).catch(
              (handlerError) => {
                logger.error('Error in 429 handler:', handlerError);
              },
            );
            return;
          }

          // Handle 403 errors specifically
          if (error?.status === 403 || errorMessage.includes('403')) {
            logger.error(
              `403 Forbidden error for account ${account.accountId}:`,
              {
                message: errorMessage,
                status: error?.status,
                method: error?.method,
                url: error?.url,
                accountId: account.accountId,
                supplierId: account.supplierId,
              },
            );
            // Call the existing error handler which will handle account cleanup
            this.handleApiError(error, account.accountId).catch(
              (handlerError) => {
                logger.error('Error in 403 handler:', handlerError);
              },
            );
            return;
          }

          logger.error('Error in close API non-blocking fetch:', error);
        });
    } catch (error) {
      logger.error('Error in fetchCloseApiDataNonBlocking:', error);
    }
  }

  /**
   * Legacy method - now uses account rotation internally
   */
  async fetchCloseApiData(
    accountId: string,
    supplierId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    needsExtendedDates = false,
  ): Promise<Supply[]> {
    // Return cached data if fresh
    // if (this.isCacheFresh()) {
    //   return this.cache.data
    // }

    // Check if we should call the API
    if (!this.shouldCallApi(needsExtendedDates)) {
      return [];
    }

    const account: AccountInfo = {
      accountId,
      supplierId,
      userAgent,
      proxy,
      supplierIds: [supplierId],
    };

    return await this.makeApiCall(account);
  }

  /**
   * Gets cached close API data
   */
  getCachedData(): Supply[] {
    if (!this.isCacheFresh()) {
      return [];
    }
    return this.cache.data;
  }

  /**
   * Calculates the current request interval based on number of available accounts
   */
  private getCalculatedInterval(): number {
    if (this.availableAccounts.length === 0) {
      return this.BASE_REQUEST_INTERVAL_MS;
    }

    // With multiple accounts, we can make requests more frequently
    // But still maintain max 6 requests per minute total
    const accountCount = this.availableAccounts.length;
    const minInterval = this.BASE_REQUEST_INTERVAL_MS / accountCount;

    // Ensure minimum 2 seconds between requests
    return Math.max(minInterval, 300);
  }

  /**
   * Checks if cache is fresh based on calculated interval
   */
  private isCacheFresh(): boolean {
    const calculatedInterval = this.getCalculatedInterval();
    return Date.now() - this.cache.timestamp <= calculatedInterval;
  }

  /**
   * Makes the actual API call
   */
  private async makeApiCall(account: AccountInfo): Promise<Supply[]> {
    try {
      // Update last API call timestamp and increment counters
      this.lastApiCall = Date.now();
      this.requestCount++;
      this.accountUsageCount.set(
        account.accountId,
        (this.accountUsageCount.get(account.accountId) || 0) + 1,
      );

      const result =
        await wbWarehouseService.getAcceptanceCoefficientsByAccount({
          accountId: account.accountId,
          supplierId: account.supplierId,
          userAgent: account.userAgent,
          proxy: account.proxy,
        });

      const transformedData = this.transformApiResponse(result.result.report);
      return transformedData;
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      const errorMessage = err?.message || '';

      // Handle database recovery errors - these are temporary and expected
      if (this.isDatabaseRecoveryError(errorMessage)) {
        // Don't treat this as a failure, just log and return empty
        logger.info(
          `Close API temporarily unavailable due to database recovery, account ${account.accountId}`,
        );
        return [];
      }

      await this.handleApiError(err, account.accountId);
      return [];
    }
  }

  /**
   * Updates the cache with new data
   */
  private updateCache(data: Supply[]): void {
    this.cache = {
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Determines if API should be called
   */
  private shouldCallApi(needsExtendedDates: boolean): boolean {
    const date = new Date();
    const now = date.getTime();
    // Check business hours
    if (!this.isWithinBusinessHours(date)) {
      return false;
    }

    // Simple throttling check with calculated interval
    const calculatedInterval = this.getCalculatedInterval();
    const hasPassedInterval = now - this.lastApiCall >= calculatedInterval;
    return needsExtendedDates && hasPassedInterval;
  }

  /**
   * Checks if current time is within business hours (Moscow timezone)
   */
  private isWithinBusinessHours(date: Date): boolean {
    // Convert to Moscow time (UTC+3)
    const moscowTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    const hours = moscowTime.getUTCHours();
    return (
      hours >= this.BUSINESS_HOURS.start && hours < this.BUSINESS_HOURS.end
    );
  }

  /**
   * Transforms API response to Supply format
   */
  private transformApiResponse(report: CloseApiWarehouse[]): Supply[] {
    return report
      .map(
        (warehouse) =>
          ({
            warehouseID: warehouse.warehouseID,
            warehouseName: warehouse.warehouseName,
            date: warehouse.date,
            boxTypeID: this.mapAcceptanceTypeToBoxTypeId(
              warehouse.acceptanceType,
            ),
            boxTypeName: this.getBoxTypeName(warehouse.acceptanceType),
            coefficient: warehouse.coefficient,
            allowUnload: warehouse.allowUnload,
          }) as Supply,
      )
      .filter(
        (warehouse) =>
          warehouse?.boxTypeID &&
          warehouse.allowUnload === true &&
          warehouse.coefficient >= 0,
      );
  }

  /**
   * Maps acceptance type to box type ID
   */
  private mapAcceptanceTypeToBoxTypeId(
    acceptanceType: AcceptanceType,
  ): BoxTypeId {
    switch (acceptanceType) {
      case AcceptanceType.box:
        return 2;
      case AcceptanceType.pallet:
        return 5;
      default:
        return 6;
    }
  }

  /**
   * Gets box type name from acceptance type
   */
  private getBoxTypeName(acceptanceType: AcceptanceType): string {
    switch (acceptanceType) {
      case AcceptanceType.box:
        return 'Короба';
      case AcceptanceType.pallet:
        return 'Монопаллеты';
      default:
        return 'Суперсейф';
    }
  }

  /**
   * Checks if error is a database recovery error (temporary)
   */
  private isDatabaseRecoveryError(errorMessage: string): boolean {
    const recoveryErrors = [
      'FATAL: terminating connection due to conflict with recovery',
      'SQLSTATE 40001',
      'get supplier darkstore office error',
    ];

    return recoveryErrors.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Handles API errors
   */
  private async handleApiError(
    error: Error & { status?: number },
    accountId: string,
  ): Promise<void> {
    const errorMessage = error?.message || '';

    // Handle specific database recovery error - don't log as it's temporary
    if (this.isDatabaseRecoveryError(errorMessage)) {
      logger.info(
        'Close API temporarily unavailable due to database recovery, will retry later',
      );
      return;
    }

    // Handle connection timeout errors - these are network issues, not service issues
    if (
      errorMessage.includes('fetch failed') &&
      errorMessage.includes('Connect Timeout Error')
    ) {
      logger.info(
        'Close API connection timeout (network issue), will retry later',
      );
      return;
    }

    // Handle known WB API errors that don't need detailed logging
    const knownErrors = [
      'ошибка получения коэффициентов',
      'internal error: error getting acceptance coefficient report',
      'fail to request supply-manager',
      'Connect Timeout Error',
    ];

    const isKnownError = knownErrors.some((knownError) =>
      errorMessage.includes(knownError),
    );

    if (isKnownError) {
      logger.info(
        `Close API known error (will retry): ${errorMessage.substring(0, 100)}...`,
      );
      return;
    }

    // Log other errors
    logger.error('Error calling getAcceptanceCoefficients:', error);

    // Handle 429 Rate Limit errors - temporarily ignore the account for 2 hours
    if (error?.status === 429 || error?.message?.includes('429')) {
      try {
        // Find user associated with this account
        const account = await prisma.account.findUnique({
          where: { id: accountId },
          include: { user: { select: { id: true, chatId: true } } },
        });

        if (account?.user) {
          logger.info(
            `429 Rate Limit error for account ${accountId}, user ${account.user.id} - temporarily ignoring account for 2 hours`,
          );

          // Set account to be ignored for 2 hours
          const ignoreUntil = Date.now() + this.RATE_LIMIT_IGNORE_DURATION_MS;
          this.ignoredAccounts.set(accountId, ignoreUntil);

          // Remove from availableAccounts cache
          this.availableAccounts = this.availableAccounts.filter(
            (acc) => acc.accountId !== accountId,
          );

          logger.info(
            `Account ${accountId} will be ignored until ${new Date(ignoreUntil).toISOString()}`,
          );
        }
      } catch (cleanupError) {
        logger.error(
          `Failed to handle 429 error for account ${accountId}:`,
          cleanupError,
        );
      }
      return;
    }

    // Handle 403 Forbidden errors - temporarily ignore the account
    if (error?.status === 403 || error?.message?.includes('403')) {
      try {
        // Find user associated with this account
        const account = await prisma.account.findUnique({
          where: { id: accountId },
          include: { user: { select: { id: true, chatId: true } } },
        });

        if (account?.user) {
          logger.info(
            `403 Forbidden error for account ${accountId}, user ${account.user.id} - temporarily ignoring account for 10 hours`,
          );

          // Set account to be ignored for 10 hours
          const ignoreUntil = Date.now() + this.IGNORE_DURATION_MS;
          this.ignoredAccounts.set(accountId, ignoreUntil);

          // Remove from availableAccounts cache
          this.availableAccounts = this.availableAccounts.filter(
            (acc) => acc.accountId !== accountId,
          );

          logger.info(
            `Account ${accountId} will be ignored until ${new Date(ignoreUntil).toISOString()}`,
          );
        }
      } catch (cleanupError) {
        logger.error(
          `Failed to handle 403 error for account ${accountId}:`,
          cleanupError,
        );
      }
      return;
    }

    if (error?.status === 401 || error?.message?.includes('401')) {
      try {
        // Find user associated with this account
        const account = await prisma.account.findUnique({
          where: { id: accountId },
          include: { user: { select: { id: true, chatId: true } } },
        });

        if (account?.user) {
          logger.info(
            `Authentication error for account ${accountId}, user ${account.user.id}`,
          );

          // Remove the account that caused the auth error
          await prisma.account.delete({
            where: { id: accountId },
          });
          logger.info(`Removed account ${accountId} due to 401 error`);

          // Remove from availableAccounts cache
          this.availableAccounts = this.availableAccounts.filter(
            (acc) => acc.accountId !== accountId,
          );

          // Note: Telegram notification would be sent by the caller
        }
      } catch (cleanupError) {
        logger.error(
          `Failed to handle auth error for account ${accountId}:`,
          cleanupError,
        );
      }
    }
  }

  /**
   * Refreshes available accounts from database
   */
  private async refreshAccountsIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastAccountRefresh < this.ACCOUNT_REFRESH_INTERVAL) {
      return;
    }

    try {
      // Log statistics if needed
      this.logStatisticsIfNeeded();

      // Get all active accounts with valid cookies and environment info
      const accounts = await prisma.account.findMany({
        where: {
          wbCookies: { not: null },
          user: {
            envInfo: { not: undefined },
            OR: [
              { subscriptionExpiresAt: { gt: new Date() } },
              {
                id: process.env.TECHNICAL_MODE_USER_ID
                  ? parseInt(process.env.TECHNICAL_MODE_USER_ID)
                  : undefined,
              },
            ],
          },
        },
        include: {
          suppliers: { select: { supplierId: true } },
          user: { select: { envInfo: true } },
        },
      });

      // Transform and deduplicate accounts by suppliers
      const accountMap = new Map<string, AccountInfo>();
      const now = Date.now();

      accounts.forEach(
        (account: {
          id: string;
          suppliers: { supplierId: string }[];
          user: { envInfo: unknown };
        }) => {
          if (!account.suppliers.length || !account.user.envInfo) return;

          // Check if account is ignored due to 403 errors
          const ignoreUntil = this.ignoredAccounts.get(account.id);
          if (ignoreUntil && now < ignoreUntil) {
            return; // Skip this account as it's still being ignored
          }

          // Clean up expired ignore entries
          if (ignoreUntil && now >= ignoreUntil) {
            this.ignoredAccounts.delete(account.id);
          }

          const envInfo = account.user.envInfo as unknown as {
            userAgent?: string;
            proxy?: ProxyConfig;
          } | null;
          const supplierIds = account.suppliers.map(
            (s: { supplierId: string }) => s.supplierId,
          );
          const supplierKey = supplierIds.sort().join(',');

          // Only keep one account per unique supplier combination
          if (!accountMap.has(supplierKey)) {
            accountMap.set(supplierKey, {
              accountId: account.id,
              supplierId: supplierIds[0],
              userAgent: envInfo?.userAgent || '',
              proxy: envInfo?.proxy,
              supplierIds,
            });
          }
        },
      );

      this.availableAccounts = Array.from(accountMap.values());
      this.lastAccountRefresh = now;
    } catch (error) {
      logger.error('Error refreshing close API accounts:', error);
    }
  }

  /**
   * Gets next account using round-robin rotation
   */
  private getNextAccount(): AccountInfo | null {
    if (this.availableAccounts.length === 0) {
      return null;
    }

    const account = this.availableAccounts[this.currentAccountIndex];
    this.currentAccountIndex =
      (this.currentAccountIndex + 1) % this.availableAccounts.length;

    return account;
  }

  /**
   * Logs statistics every 5 minutes
   */
  private logStatisticsIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastLogTime >= this.LOG_INTERVAL) {
      this.logStatistics();
      this.lastLogTime = now;
    }
  }

  /**
   * Logs detailed statistics
   */
  private logStatistics(): void {
    const accountsUsed = this.accountUsageCount.size;
    const totalRequests = Array.from(this.accountUsageCount.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const cacheInfo = this.getCacheInfo();
    const currentInterval = this.getCalculatedInterval();

    // Statistics summary (compact format)
    const lastCallStr = this.lastApiCall
      ? new Date(this.lastApiCall).toLocaleTimeString()
      : 'never';
    logger.debug(
      `Stats: ${totalRequests} reqs, ${this.availableAccounts.length} accs, ${cacheInfo.count} whs, last: ${lastCallStr}`,
    );

    // Warehouse cache details (debug only)
    if (this.cache.data.length > 0 && this.requestCount > 0) {
      const warehouseDetails = this.cache.data
        .slice(0, 5)
        .map((w) => `${w.warehouseID}-${w.coefficient}`);
      const more = this.cache.data.length > 5 ? ` +${this.cache.data.length - 5} more` : '';
      logger.debug(`Warehouses: [${warehouseDetails.join(', ')}]${more}`);
    }

    // Reset counters for next 5-minute period
    this.accountUsageCount.clear();
  }

  /**
   * Gets cache status information
   */
  getCacheInfo(): {
    count: number;
    isFresh: boolean;
    ageMs: number;
    accounts: number;
    lastApiCall: number;
    calculatedInterval: number;
    requestCount: number;
  } {
    const ageMs = Date.now() - this.cache.timestamp;

    return {
      count: this.cache.data.length,
      isFresh: this.isCacheFresh(),
      ageMs,
      accounts: this.availableAccounts.length,
      lastApiCall: this.lastApiCall,
      calculatedInterval: this.getCalculatedInterval(),
      requestCount: this.requestCount,
    };
  }
}

// Export singleton instance
export const closeApiService = CloseApiService.getInstance();
