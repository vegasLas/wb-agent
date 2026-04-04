/**
 * Autobooking Date Manager Service
 * Phase 8: Date Management - Cleanup service for autobookings
 *
 * Purpose: Manages autobooking lifecycle by archiving expired autobookings
 * based on their date type and notifying users about archived autobookings.
 *
 * NOTE: Uses Moscow timezone (UTC+3) for date calculations to match WB business hours
 */

import { prisma } from '../../config/database';
import type { Autobooking } from '@prisma/client';
import { TBOT } from '../../utils/TBOT';
import { logger } from '../../utils/logger';

/**
 * Service for managing autobooking dates and archiving expired items
 * Handles all 5 date types: WEEK, MONTH, CUSTOM_DATES, CUSTOM_DATES_SINGLE, CUSTOM_PERIOD
 */
export class AutobookingDateManagerService {
  /**
   * Check and archive a single autobooking based on its date type
   * Called for each autobooking during cleanup cycles
   */
  async cleanAutobooking(autobooking: Autobooking): Promise<void> {
    // Get current Moscow time (UTC+3)
    const moscowNow = this.getMoscowMidnight();

    let shouldComplete = false;

    switch (autobooking.dateType) {
      case 'WEEK': {
        // For WEEK type, we need to calculate the end date if it's not provided
        if (!autobooking.startDate) return;

        let endDate: Date;
        if (autobooking.endDate) {
          endDate = new Date(autobooking.endDate);
        } else {
          // If endDate is not provided, calculate it as startDate + 7 days
          endDate = new Date(autobooking.startDate);
          endDate.setDate(endDate.getDate() + 7); // Add 7 days for a week
        }

        endDate.setUTCHours(20, 59, 59, 999); // 23:59:59 Moscow time in UTC
        shouldComplete = moscowNow > endDate;
        break;
      }

      case 'MONTH': {
        // For MONTH type, we need to calculate the end date if it's not provided
        if (!autobooking.startDate) return;

        let endDate: Date;
        if (autobooking.endDate) {
          endDate = new Date(autobooking.endDate);
        } else {
          // If endDate is not provided, calculate it as startDate + 1 month
          endDate = new Date(autobooking.startDate);
          endDate.setMonth(endDate.getMonth() + 1); // Add 1 month
        }

        endDate.setUTCHours(20, 59, 59, 999); // 23:59:59 Moscow time in UTC
        shouldComplete = moscowNow > endDate;
        break;
      }

      case 'CUSTOM_DATES':
      case 'CUSTOM_DATES_SINGLE': {
        // CUSTOM_DATES triggers expire when all selected dates are in the past
        if (autobooking.customDates && autobooking.customDates.length > 0) {
          const validDates = autobooking.customDates
            .map((date: Date) => {
              const moscowDate = new Date(date);
              moscowDate.setUTCHours(0, 0, 0, 0);
              return moscowDate;
            })
            .filter((date: Date) => date >= moscowNow);

          shouldComplete = validDates.length === 0;
        }
        break;
      }

      case 'CUSTOM_PERIOD': {
        // CUSTOM_PERIOD triggers expire when the end date is in the past
        if (!autobooking.startDate || !autobooking.endDate) return;

        const endDate = new Date(autobooking.endDate);
        endDate.setUTCHours(20, 59, 59, 999); // 23:59:59 Moscow time in UTC

        shouldComplete = endDate < moscowNow;
        break;
      }
    }

    if (shouldComplete) {
      await this.updateAutobookingStatus(autobooking);
      await this.notifyUserAboutArchivedAutobooking(autobooking);
    }
  }

  /**
   * Clean all active autobookings
   * Main entry point for cron job
   */
  async cleanAllAutobookings(): Promise<void> {
    try {
      const activeAutobookings = await prisma.autobooking.findMany({
        where: {
          status: 'ACTIVE',
        },
      });

      for (const autobooking of activeAutobookings) {
        await this.cleanAutobooking(autobooking);
      }
    } catch (error) {
      logger.error(
        '[AutobookingDateManager] Error cleaning autobookings:',
        error,
      );
    }
  }

  /**
   * Update autobooking status to ARCHIVED
   */
  private async updateAutobookingStatus(
    autobooking: Autobooking,
  ): Promise<void> {
    try {
      await prisma.autobooking.update({
        where: { id: autobooking.id },
        data: {
          status: 'ARCHIVED',
        },
      });
    } catch (error) {
      logger.error(
        `[AutobookingDateManager] Error updating autobooking status for ${autobooking.id}:`,
        error,
      );
    }
  }

  /**
   * Notify user about archived autobooking via Telegram
   */
  private async notifyUserAboutArchivedAutobooking(
    autobooking: Autobooking,
  ): Promise<void> {
    try {
      if (!autobooking.userId) return;

      const user = await prisma.user.findUnique({
        where: { id: autobooking.userId },
      });

      if (!user?.chatId || !TBOT) return;

      const message =
        `ℹ️ Неактуальное автобронирование архивировано 🕒\n\n` +
        `📦 Тип поставки: ${this.getSupplyTypeText(autobooking.supplyType)}\n` +
        `🏬 Склад: ${autobooking.warehouseId}\n` +
        `${autobooking.transitWarehouseName ? `🔄 Транзитный склад: ${autobooking.transitWarehouseName}\n` : ''}` +
        `📅 Тип периода: ${this.getDateTypeText(autobooking.dateType)}\n` +
        `📅 Создан: ${new Date(autobooking.createdAt).toLocaleDateString('ru-RU')}`;

      await TBOT.sendMessage(user.chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '❌ Закрыть',
                callback_data: 'close_menu',
              },
            ],
          ],
        },
        disable_notification: true, // Send without sound
      });
    } catch (error) {
      logger.error(
        '[AutobookingDateManager] Error sending archived autobooking notification:',
        error,
      );
    }
  }

  /**
   * Convert supply type to Russian text
   */
  private getSupplyTypeText(supplyType: string): string {
    const types: Record<string, string> = {
      BOX: 'Короб',
      MONOPALLETE: 'Монопаллета',
      SUPERSAFE: 'Суперсейф',
    };
    return types[supplyType] || supplyType;
  }

  /**
   * Convert date type to Russian text
   */
  private getDateTypeText(dateType: string): string {
    const types: Record<string, string> = {
      WEEK: 'Неделя',
      MONTH: 'Месяц',
      CUSTOM_DATES: 'Выбранные даты',
      CUSTOM_DATES_SINGLE: 'Выбранные даты (одна)',
      CUSTOM_PERIOD: 'Произвольный период',
    };
    return types[dateType] || dateType;
  }

  /**
   * Get Moscow midnight time in UTC
   * Moscow is UTC+3, so midnight Moscow = 21:00 UTC previous day
   */
  private getMoscowMidnight(): Date {
    const moscowNow = new Date();
    moscowNow.setUTCHours(0, 0, 0, 0); // Start of day in UTC
    moscowNow.setUTCHours(moscowNow.getUTCHours() - 3); // Adjust to Moscow midnight in UTC
    return moscowNow;
  }
}

export const autobookingDateManagerService =
  new AutobookingDateManagerService();
