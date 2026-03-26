/**
 * Trigger Date Manager Service
 * Phase 8: Date Management - Cleanup service for supply triggers
 * 
 * Purpose: Manages trigger lifecycle by expiring triggers based on their search mode
 * and notifying users about expired triggers.
 * 
 * NOTE: Uses Moscow timezone (UTC+3) for date calculations to match WB business hours
 */

import { prisma } from '../../config/database';
import type { SupplyTrigger } from '@prisma/client';
import { TBOT } from '../../utils/TBOT';
import { logger } from '../../utils/logger';
import { cacheService } from '../cache.service';
import type { Warehouse } from '../../types/wb';

/**
 * Service for managing trigger dates and expiration
 * Handles all 6 search modes: TODAY, TOMORROW, WEEK, RANGE, CUSTOM_DATES, UNTIL_FOUND
 */
export class TriggerDateManagerService {
  /**
   * Check and expire a single trigger based on its search mode
   * Called for each trigger during cleanup cycles
   */
  async cleanTrigger(trigger: SupplyTrigger): Promise<void> {
    // Get current Moscow time (UTC+3)
    const moscowNow = this.getMoscowMidnight();

    let shouldExpire = false;

    switch (trigger.searchMode) {
      case 'TODAY': {
        // TODAY triggers expire after the day they were created
        const triggerDate = new Date(trigger.createdAt);
        triggerDate.setUTCHours(0, 0, 0, 0);
        shouldExpire = triggerDate.getTime() !== moscowNow.getTime();
        break;
      }

      case 'TOMORROW': {
        // TOMORROW triggers expire after the day after they were created
        const triggerDate = new Date(trigger.createdAt);
        triggerDate.setUTCHours(0, 0, 0, 0);
        shouldExpire =
          triggerDate.getTime() < moscowNow.getTime() - 24 * 60 * 60 * 1000;
        break;
      }

      case 'WEEK': {
        // WEEK triggers expire 6 days after creation (end of the week)
        const triggerDate = new Date(trigger.createdAt);
        triggerDate.setUTCHours(0, 0, 0, 0);
        const weekEndDate = new Date(triggerDate);
        weekEndDate.setDate(triggerDate.getDate() + 6);
        weekEndDate.setUTCHours(20, 59, 59, 999); // 23:59:59 Moscow time in UTC

        shouldExpire = moscowNow > weekEndDate;
        break;
      }

      case 'UNTIL_FOUND': {
        // UNTIL_FOUND triggers expire after 3 months
        const triggerDate = new Date(trigger.createdAt);
        triggerDate.setUTCHours(0, 0, 0, 0);
        const threeMonthsLater = new Date(moscowNow);
        threeMonthsLater.setMonth(moscowNow.getMonth() + 3);

        shouldExpire =
          triggerDate.getTime() <
          moscowNow.getTime() - 90 * 24 * 60 * 60 * 1000;
        break;
      }

      case 'CUSTOM_DATES': {
        // CUSTOM_DATES triggers expire when all selected dates are in the past
        if (trigger.selectedDates && trigger.selectedDates.length > 0) {
          const validDates = trigger.selectedDates
            .map((date: Date) => {
              const moscowDate = new Date(date);
              moscowDate.setUTCHours(0, 0, 0, 0);
              return moscowDate;
            })
            .filter((date: Date) => date >= moscowNow);

          shouldExpire = validDates.length === 0;
        }
        break;
      }

      case 'RANGE': {
        // RANGE triggers expire when the end date is in the past
        if (!trigger.startDate || !trigger.endDate) return;

        const startDate = new Date(trigger.startDate);
        const endDate = new Date(trigger.endDate);

        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(20, 59, 59, 999); // 23:59:59 Moscow time in UTC

        shouldExpire = endDate < moscowNow;
        break;
      }
    }

    if (shouldExpire) {
      await this.updateTriggerStatus(trigger);
      await this.notifyUserAboutExpiredTrigger(trigger);
    }
  }

  /**
   * Clean all active triggers
   * Main entry point for cron job
   */
  async cleanAllTriggers(): Promise<void> {
    try {
      const activeTriggers = await prisma.supplyTrigger.findMany({
        where: {
          status: 'RELEVANT',
        },
      });

      for (const trigger of activeTriggers) {
        await this.cleanTrigger(trigger);
      }
    } catch (error) {
      logger.error('[TriggerDateManager] Error cleaning triggers:', error);
    }
  }

  /**
   * Update trigger status to EXPIRED
   */
  private async updateTriggerStatus(trigger: SupplyTrigger): Promise<void> {
    try {
      await prisma.supplyTrigger.update({
        where: { id: trigger.id },
        data: {
          status: 'EXPIRED',
          isActive: false,
        },
      });
    } catch (error) {
      logger.error(
        `[TriggerDateManager] Error updating trigger status for ${trigger.id}:`,
        error
      );
    }
  }

  /**
   * Notify user about expired trigger via Telegram
   */
  private async notifyUserAboutExpiredTrigger(
    trigger: SupplyTrigger
  ): Promise<void> {
    try {
      if (!trigger.userId) return;

      const user = await prisma.user.findUnique({
        where: { id: trigger.userId },
      });

      if (!user?.chatId || !TBOT) return;

      const warehouseNames = this.getWarehouseNames(trigger.warehouseIds);

      const message =
        `ℹ️ Таймслот перемещен в раздел "Истекшие" 🕒\n\n` +
        `🔍 Режим поиска: ${this.getSearchModeText(trigger.searchMode)}\n` +
        `${warehouseNames ? `🏬 Склады: ${warehouseNames}\n` : ''}` +
        `📅 Создан: ${new Date(trigger.createdAt).toLocaleDateString('ru-RU')}`;

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
        '[TriggerDateManager] Error sending expired trigger notification:',
        error
      );
    }
  }

  /**
   * Get warehouse names from cache for notification
   */
  private getWarehouseNames(warehouseIds: number[]): string {
    try {
      const warehouses = cacheService.get<Warehouse[]>(
        'warehouses',
        24 * 60 * 60 * 1000
      );

      if (!warehouses) return '';

      return warehouses
        .filter((w) => warehouseIds.includes(w.ID))
        .map((w) => w.name)
        .join(', ');
    } catch {
      return '';
    }
  }

  /**
   * Convert search mode to Russian text
   */
  private getSearchModeText(searchMode: string): string {
    const modes: Record<string, string> = {
      TODAY: 'Сегодня',
      TOMORROW: 'Завтра',
      WEEK: 'Неделя',
      RANGE: 'Диапазон дат',
      CUSTOM_DATES: 'Выбранные даты',
      UNTIL_FOUND: 'До нахождения',
    };
    return modes[searchMode] || searchMode;
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

export const triggerDateManagerService = new TriggerDateManagerService();
