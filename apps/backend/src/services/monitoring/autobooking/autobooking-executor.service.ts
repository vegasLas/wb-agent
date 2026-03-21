/**
 * Autobooking Executor Service
 * Phase 5: Autobooking Core + Phase 6: Browser Automation
 *
 * Handles the actual booking execution and error handling.
 * Integrates with Playwright browser automation for date selection.
 */

import { sharedBanService } from '../shared/ban.service';
import { sharedErrorHandlingService } from '../shared/error-handling.service';
import { bookingErrorService } from '../../booking-error.service';
import { autobookingSupplyIdCacheService } from './autobooking-supply-id-cache.service';
import { supplyService } from '../../supply.service';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { playwrightBrowserService, BrowserErrorCode } from '../playwright-browser.service';
import { browserFingerprintService } from '../browser-fingerprint.service';
import type {
  IAutobookingExecutorService,
  SuccessfulBooking,
} from './autobooking.interfaces';
import type {
  MonitoringUser,
  SchedulableItem,
  BookingError,
} from '../shared/interfaces/sharedInterfaces';

// ============== Constants ==============

const DATE_UNAVAILABLE_BAN_DURATION_MS = 1000; // 1 second
const TOO_ACTIVE_BLACKLIST_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_BAN_DURATION_MS = 60 * 1000; // 60 seconds

export class AutobookingExecutorService implements IAutobookingExecutorService {
  /**
   * Creates a booking task for the monitoring system
   * Phase 5: Creates the supply/preorder (API flow)
   * Phase 6: Adds browser automation for date selection when draftId exists
   */
  async createBookingTask(params: {
    booking: SchedulableItem;
    effectiveDate: Date;
    account: { id: string; wbCookies?: string | null };
    user: MonitoringUser;
    latency: number;
  }): Promise<void> {
    const { booking, effectiveDate, account, user, latency } = params;
    const randomNumber = Math.floor(Math.random() * 100000);

    logger.info(
      `[AutobookingExecutor] Creating booking task for booking ${booking.id}, ` +
        `warehouse ${booking.warehouseId}, date ${effectiveDate.toDateString()}`
    );

    // Step 1: Get or create preorder ID (with caching)
    const preorderId = await autobookingSupplyIdCacheService.getOrCreatePreorderId({
      booking,
      account,
      user,
      effectiveDate,
      randomNumber,
      latency,
      isBoxOnPallet: booking.supplyType === 'MONOPALLETE',
    });

    if (!preorderId) {
      logger.error(`[AutobookingExecutor] Failed to get preorder ID for booking ${booking.id}`);
      throw new Error(`Failed to get preorder ID for booking ${booking.id}`);
    }

    logger.info(
      `[AutobookingExecutor] Successfully created preorder ${preorderId} for booking ${booking.id}`
    );

    // Step 2: Browser automation for date selection (Phase 6)
    if (booking.draftId && account.wbCookies) {
      await this.executeBrowserAutomation({
        booking,
        effectiveDate,
        account,
        user,
        preorderId: preorderId.toString(),
      });
    }
  }

  /**
   * Execute browser automation for date selection
   * Phase 6: Browser Automation
   */
  private async executeBrowserAutomation(params: {
    booking: SchedulableItem;
    effectiveDate: Date;
    account: { id: string; wbCookies?: string | null };
    user: MonitoringUser;
    preorderId: string;
  }): Promise<void> {
    const { booking, effectiveDate, account, user, preorderId } = params;

    logger.info(
      `[AutobookingExecutor] Starting browser automation for booking ${booking.id}`
    );

    try {
      // Generate fingerprint from user env info
      const fingerprint = browserFingerprintService.generateFromEnvInfo(
        user as unknown as import('../../../types/wb').UserEnvInfo
      );

      // Get monopallet count if applicable
      const monopalletCount = booking.supplyType === 'MONOPALLETE' 
        ? (booking as any).monopalletCount || 1 
        : null;

      await playwrightBrowserService.selectDateAndNavigate({
        warehouseId: booking.warehouseId.toString(),
        draftId: booking.draftId!,
        preorderId,
        effectiveDate,
        cookiesString: account.wbCookies!,
        accountId: account.id,
        supplierId: booking.supplierId,
        proxy: user.proxy,
        userAgent: user.userAgent,
        fingerprint,
        transitWarehouseId: booking.transitWarehouseId,
        supplyType: booking.supplyType,
        monopalletCount,
      });

      logger.info(
        `[AutobookingExecutor] Browser automation completed successfully for booking ${booking.id}`
      );
    } catch (error) {
      const browserError = error as Error & { code?: BrowserErrorCode };
      
      logger.error(
        `[AutobookingExecutor] Browser automation failed for booking ${booking.id}:`,
        browserError.message
      );

      // Handle specific browser errors
      if (browserError.code === BrowserErrorCode.LOGIN_FORM_DETECTED) {
        // Credentials expired - this is a critical error
        throw new Error(
          `Credentials expired for account ${account.id}. Please re-authenticate.`
        );
      }

      // For other errors, re-throw to be handled by error categorization
      throw error;
    }
  }

  /**
   * Adds a successful booking to the list
   */
  addSuccessfulBooking(
    successfulBookings: SuccessfulBooking[],
    params: {
      user: MonitoringUser;
      warehouseName: string;
      effectiveDate: Date;
      coefficient: number;
      booking: SchedulableItem;
    }
  ): void {
    const { user, warehouseName, effectiveDate, coefficient, booking } = params;

    successfulBookings.push({
      chatId: user.chatId as string,
      warehouseName,
      effectiveDate,
      coefficient,
      transitWarehouseName: booking.transitWarehouseName,
      booking,
    });
  }

  /**
   * Logs a successful booking
   */
  logSuccessfulBooking(
    booking: SchedulableItem,
    effectiveDate: Date,
    userId: number
  ): void {
    logger.info(
      `[AutobookingExecutor] ✅ Successfully booked: Autobooking ${booking.id}, ` +
        `Warehouse ${booking.warehouseId}, Date ${effectiveDate.toDateString()}, User ${userId}`
    );
  }

  /**
   * Handles booking processing errors with categorization
   */
  async handleBookingProcessingError(params: {
    error: BookingError;
    booking: SchedulableItem;
    user: MonitoringUser;
    warehouseName: string;
    effectiveDate: Date;
    account: { id: string };
    preorderId: number | null;
    coefficient: number;
  }): Promise<void> {
    const {
      error,
      booking,
      user,
      warehouseName,
      effectiveDate,
      coefficient,
    } = params;

    // Use shared error handling service to categorize
    const errorCategory = sharedErrorHandlingService.categorizeError(error);

    logger.warn(
      `[AutobookingExecutor] Handling error for booking ${booking.id}: ` +
        `${errorCategory.type} - ${error.message}`
    );

    // Handle specific error types
    switch (errorCategory.type) {
      case 'date_unavailable':
        await this.handleDateUnavailableError(
          booking,
          effectiveDate,
          error,
          coefficient
        );
        throw error; // Re-throw to stop processing this warehouse-date

      case 'too_active':
        await this.handleTooActiveError(user.userId);
        break;

      case 'order_not_exist':
        logger.info(
          `[AutobookingExecutor] Order doesn't exist, clearing cached supply ID for booking ${booking.id}`
        );
        await autobookingSupplyIdCacheService.clearSupplyIdFromCache(booking.id);
        break;

      case 'critical':
        await bookingErrorService.handleCriticalBookingError({
          error,
          entity: booking as unknown as import('@prisma/client').Autobooking,
          user: user as unknown as import('@prisma/client').User,
          warehouseName,
          effectiveDate,
          type: 'autobooking',
        });
        break;

      case 'non_critical':
        this.handleNonCriticalBookingError(
          booking,
          effectiveDate,
          error,
          coefficient
        );
        break;
    }

    // Log error using shared service
    sharedErrorHandlingService.logError(
      booking.id,
      'autobooking',
      effectiveDate,
      error,
      errorCategory
    );
  }

  /**
   * Handles date unavailable errors by banning the specific date
   */
  private async handleDateUnavailableError(
    booking: SchedulableItem,
    effectiveDate: Date,
    error: BookingError,
    coefficient: number
  ): Promise<void> {
    logger.info(
      `[AutobookingExecutor] Date unavailable for booking ${booking.id}, ` +
        `coefficient: ${booking.maxCoefficient}, availability coefficient: ${coefficient}`
    );

    sharedBanService.banSingleDate({
      warehouseId: booking.warehouseId,
      date: effectiveDate,
      supplyType: booking.supplyType,
      dateType: booking.dateType,
      error,
      duration: DATE_UNAVAILABLE_BAN_DURATION_MS,
      coefficient,
    });
  }

  /**
   * Handles too active errors by blacklisting the user
   */
  private async handleTooActiveError(userId: number): Promise<void> {
    logger.warn(
      `[AutobookingExecutor] Too active error detected for user ${userId} - ` +
        `blacklisting for ${TOO_ACTIVE_BLACKLIST_DURATION_MS / 60000} minutes`
    );

    sharedBanService.addUserToBlacklist(userId, TOO_ACTIVE_BLACKLIST_DURATION_MS);

    // Notify admin about too many requests
    try {
      const adminUser = await prisma.user.findFirst({
        where: { id: 4 },
      });

      if (adminUser?.chatId) {
        const { TBOT } = await import('../../../utils/TBOT');
        if (TBOT) {
          await TBOT.sendMessage(adminUser.chatId, 'Слишком много запросов', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
              ],
            },
          });
        }
      }
    } catch (notifyError) {
      logger.error('[AutobookingExecutor] Failed to notify admin about too_active error:', notifyError);
    }
  }

  /**
   * Handles non-critical booking errors by banning all dates
   */
  private handleNonCriticalBookingError(
    booking: SchedulableItem,
    effectiveDate: Date,
    error: BookingError,
    coefficient: number
  ): void {
    sharedBanService.banAllDates({
      warehouseId: booking.warehouseId,
      supplyType: booking.supplyType,
      dateType: booking.dateType,
      error,
      duration: DEFAULT_BAN_DURATION_MS,
      coefficient,
    });
  }

  /**
   * Safely deletes preorder with error handling
   */
  async deletePreorderSafely(
    account: { id: string },
    booking: SchedulableItem,
    user: MonitoringUser,
    preorderId: number
  ): Promise<void> {
    try {
      logger.info(`[AutobookingExecutor] Deleting preorder: ${preorderId}`);
      await supplyService.deletePreorder({
        accountId: account.id,
        supplierId: booking.supplierId,
        preorderId,
        userAgent: user.userAgent,
        proxy: user.proxy,
      });
      logger.info(`[AutobookingExecutor] Successfully deleted preorder ${preorderId}`);
    } catch (deleteError) {
      await this.handlePreorderDeletionError(
        deleteError as BookingError,
        booking,
        preorderId
      );
    }
  }

  /**
   * Handles errors that occur during preorder deletion
   */
  private async handlePreorderDeletionError(
    error: BookingError,
    booking: SchedulableItem,
    preorderId: number
  ): Promise<void> {
    if (error.message?.includes('Предзаказ не существует')) {
      logger.info(
        `[AutobookingExecutor] Preorder ${preorderId} doesn't exist, clearing from cache`
      );
      await autobookingSupplyIdCacheService.clearSupplyIdFromCache(booking.id);
    } else {
      logger.warn(
        `[AutobookingExecutor] Failed to delete preorder ${preorderId}:`,
        error.message
      );
    }
  }
}

// Export singleton instance
export const autobookingExecutorService = new AutobookingExecutorService();
