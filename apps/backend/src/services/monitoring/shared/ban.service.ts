/**
 * Ban Service - Phase 2: Ban & Error Handling
 * Manages temporary bans on warehouse/date/supply combinations to prevent repeated failed attempts.
 * Also handles user blacklisting for rate limiting.
 */

import type {
  ISharedBanService,
  BanParams,
  BanAllDatesParams,
  BanSingleDateParams,
  BookingError,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';
import { sharedTelegramNotificationService } from '@/services/monitoring/shared/telegram-notification.service';
import { prisma } from '@/config/database';

// Constants
const BANNED_DATES_CLEAR_INTERVAL_MS = 5 * 1000; // 5 seconds
const DEFAULT_BAN_DURATION_MS = 60 * 1000; // 60 seconds
const TOO_ACTIVE_BLACKLIST_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const ADMIN_USER_ID = 4;

// Ban attempt tracking constants
const BAN_ATTEMPT_WINDOW_MS = 20 * 1000; // 20 seconds
const BAN_DURATION_EXTENSION_MS = 60 * 60 * 1000; // 60 minutes (1 hour)
const MAX_BAN_ATTEMPTS = 3;

// Supply type names for notifications
const SUPPLY_TYPE_NAMES: Record<string, string> = {
  BOX: 'Коробка',
  MONOPALLETE: 'Монопаллета',
  SUPERSAFE: 'Суперсейф',
};

/**
 * Checks if error message indicates date is already unavailable
 */
const isDateAlreadyUnavailableMessage = (errorMessage: string): boolean => {
  return errorMessage.includes('Эта дата уже недоступна');
};

export class SharedBanService implements ISharedBanService {
  private readonly bannedDates = new Map<string, number>(); // key -> expiration timestamp
  private readonly blacklistedUsers = new Map<number, number>(); // userId -> expiration timestamp
  private readonly banAttempts = new Map<
    string,
    Array<{ timestamp: number; count: number }>
  >(); // key -> ban attempts with timestamps
  private clearTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startClearTimer();
  }

  /**
   * Starts the timer to periodically clear expired banned dates
   */
  private startClearTimer(): void {
    if (this.clearTimer) {
      clearInterval(this.clearTimer);
    }

    this.clearTimer = setInterval(() => {
      this.clearExpiredBans();
    }, BANNED_DATES_CLEAR_INTERVAL_MS);
  }

  /**
   * Clears expired banned dates and blacklisted users from memory
   */
  clearExpiredBans(): void {
    const now = Date.now();

    // Clear expired banned dates
    for (const [key, expiration] of this.bannedDates.entries()) {
      if (now >= expiration) {
        this.bannedDates.delete(key);
      }
    }

    // Clear expired blacklisted users
    for (const [userId, expiration] of this.blacklistedUsers.entries()) {
      if (now >= expiration) {
        this.blacklistedUsers.delete(userId);
      }
    }

    // Clear expired ban attempts
    this.cleanExpiredBanAttempts();
  }

  /**
   * Tracks a new ban attempt for the given key
   */
  private trackBanAttempt(key: string): void {
    const now = Date.now();
    const attempts = this.banAttempts.get(key) || [];

    attempts.push({ timestamp: now, count: 1 });
    this.banAttempts.set(key, attempts);
  }

  /**
   * Checks if the ban duration should be extended based on recent attempts
   */
  private shouldExtendBanDuration(key: string): boolean {
    const now = Date.now();
    const attempts = this.banAttempts.get(key) || [];

    // Count attempts within the time window
    const recentAttempts = attempts.filter(
      (attempt) => now - attempt.timestamp <= BAN_ATTEMPT_WINDOW_MS,
    );

    return recentAttempts.length >= MAX_BAN_ATTEMPTS;
  }

  /**
   * Cleans up expired ban attempt tracking data
   */
  private cleanExpiredBanAttempts(): void {
    const now = Date.now();

    for (const [key, attempts] of this.banAttempts.entries()) {
      const validAttempts = attempts.filter(
        (attempt) => now - attempt.timestamp <= BAN_ATTEMPT_WINDOW_MS,
      );

      if (validAttempts.length === 0) {
        this.banAttempts.delete(key);
      } else {
        this.banAttempts.set(key, validAttempts);
      }
    }
  }

  /**
   * Resets ban attempt tracking for a specific key
   */
  private resetBanAttempts(key: string): void {
    this.banAttempts.delete(key);
  }

  /**
   * Generates a unique key for banned date tracking (all dates ban)
   * Includes coefficient for granular ban tracking
   */
  private getAllDatesBanKey(params: {
    warehouseId: number;
    supplyType: string;
    coefficient: number;
  }): string {
    const { warehouseId, supplyType, coefficient } = params;
    return `${warehouseId}-${supplyType}-${coefficient}`;
  }

  /**
   * Generates a unique key for banned date tracking (single date ban)
   * Includes coefficient for granular ban tracking
   */
  private getSingleDateBanKey(params: {
    warehouseId: number;
    date: Date;
    supplyType: string;
    coefficient: number;
  }): string {
    const { warehouseId, date, supplyType, coefficient } = params;
    return `${warehouseId}-${date.toDateString()}-${supplyType}-${coefficient}`;
  }

  /**
   * Checks if a warehouse-date-supply-coefficient combination is currently banned
   * Checks both single date ban and all dates ban
   */
  isBanned(params: Omit<BanParams, 'error'>): boolean {
    // Check single date ban first
    if (params.date) {
      const singleDateKey = this.getSingleDateBanKey({
        warehouseId: params.warehouseId,
        date: params.date,
        supplyType: params.supplyType,
        coefficient: params.coefficient,
      });
      const singleDateExpiration = this.bannedDates.get(singleDateKey);
      if (singleDateExpiration && Date.now() < singleDateExpiration) {
        return true;
      }
    }

    // Check all dates ban
    const allDatesKey = this.getAllDatesBanKey({
      warehouseId: params.warehouseId,
      supplyType: params.supplyType,
      coefficient: params.coefficient,
    });
    const allDatesExpiration = this.bannedDates.get(allDatesKey);

    if (!allDatesExpiration) {
      return false;
    }

    if (Date.now() >= allDatesExpiration) {
      this.bannedDates.delete(allDatesKey);
      return false;
    }

    return true;
  }

  /**
   * Checks if all dates for a warehouse-supply-coefficient combination are banned
   */
  isAllDatesBanned(params: {
    warehouseId: number;
    supplyType: string;
    coefficient: number;
  }): boolean {
    const key = this.getAllDatesBanKey(params);
    const expiration = this.bannedDates.get(key);

    if (!expiration) {
      return false;
    }

    if (Date.now() >= expiration) {
      this.bannedDates.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Checks if a specific date for a warehouse-supply-coefficient combination is banned
   */
  isSingleDateBanned(params: {
    warehouseId: number;
    date: Date;
    supplyType: string;
    coefficient: number;
  }): boolean {
    const key = this.getSingleDateBanKey(params);
    const expiration = this.bannedDates.get(key);

    if (!expiration) {
      return false;
    }

    if (Date.now() >= expiration) {
      this.bannedDates.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Internal method to add a ban with a specific key
   * Tracks ban attempts and extends duration if date is banned repeatedly within time window
   */
  private addBanWithKey(params: {
    key: string;
    warehouseId: number;
    date: Date | null;
    supplyType: string;
    dateType?: string;
    error?: BookingError;
    duration?: number;
  }): void {
    const {
      key,
      warehouseId,
      date,
      supplyType,
      dateType,
      error,
      duration = DEFAULT_BAN_DURATION_MS,
    } = params;

    // Track this ban attempt
    this.trackBanAttempt(key);

    // Check if we should extend the ban duration
    let finalDuration = duration;
    if (this.shouldExtendBanDuration(key)) {
      finalDuration = duration + BAN_DURATION_EXTENSION_MS;
      // Reset ban attempts after extending duration
      this.resetBanAttempts(key);
      console.log(
        `🚫 Extended ban duration by hour for key: ${key} (3+ attempts in 20 seconds)`,
      );
    }

    const expiration = Date.now() + finalDuration;
    this.bannedDates.set(key, expiration);

    // Only send notification if it's not a "date already unavailable" error
    if (error && !isDateAlreadyUnavailableMessage((error as Error).message)) {
      this.sendBannedDateNotification({
        warehouseId,
        date,
        supplyType,
        dateType,
        error,
      });
    }
  }

  /**
   * Bans all dates for a warehouse-supply-coefficient combination
   * Tracks ban attempts and extends duration if banned repeatedly within time window
   */
  banAllDates(params: BanAllDatesParams): void {
    const {
      warehouseId,
      supplyType,
      dateType,
      error,
      duration = DEFAULT_BAN_DURATION_MS,
      coefficient,
    } = params;
    const key = this.getAllDatesBanKey({
      warehouseId,
      supplyType,
      coefficient,
    });

    this.addBanWithKey({
      key,
      warehouseId,
      date: null,
      supplyType,
      dateType,
      error,
      duration,
    });
  }

  /**
   * Bans a specific date for a warehouse-supply-coefficient combination
   * Tracks ban attempts and extends duration if banned repeatedly within time window
   */
  banSingleDate(params: BanSingleDateParams): void {
    const {
      warehouseId,
      date,
      supplyType,
      dateType,
      error,
      duration = DEFAULT_BAN_DURATION_MS,
      coefficient,
    } = params;
    const key = this.getSingleDateBanKey({
      warehouseId,
      date,
      supplyType,
      coefficient,
    });

    this.addBanWithKey({
      key,
      warehouseId,
      date,
      supplyType,
      dateType,
      error,
      duration,
    });
  }

  /**
   * Sends notification to admin about banned warehouse-date combination
   */
  private async sendBannedDateNotification(
    params: Partial<BanParams>,
  ): Promise<void> {
    const { warehouseId, date, supplyType, dateType, error } = params;
    try {
      const warehouseName = `ID: ${warehouseId}`;

      const adminUser = await this.getAdminUser();

      if (adminUser?.chatId) {
        const message = this.buildBanNotificationMessage(
          warehouseName,
          supplyType!,
          dateType,
          date,
          error,
        );
        await sharedTelegramNotificationService.sendErrorNotification(
          adminUser.chatId,
          message,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
              ],
            },
          },
        );
      }
    } catch (notificationError) {
      console.error(
        'Error sending banned date notification:',
        notificationError,
      );
    }
  }

  /**
   * Retrieves the admin user for notifications
   */
  private async getAdminUser() {
    return prisma.user.findUnique({
      where: { id: ADMIN_USER_ID },
      include: { telegram: { select: { chatId: true } } },
    });
  }

  /**
   * Builds the ban notification message
   */
  private buildBanNotificationMessage(
    warehouseName: string,
    supplyType: string,
    dateType?: string,
    date?: Date | null,
    error?: BookingError,
  ): string {
    let message = `⚠️ Внимание! Склад временно заблокирован:\n\nсклад: ${warehouseName}\n`;

    if (dateType === 'CUSTOM_DATES') {
      message += `📅 Тип: Пользовательские даты\n`;
    } else if (date) {
      message += `📅 Дата: ${date.toLocaleDateString('ru-RU')}\n`;
    }

    message += `📦 Тип поставки: ${SUPPLY_TYPE_NAMES[supplyType] || supplyType}\n`;

    if (error) {
      message += `\n🚨 Ошибка: ${error.message || 'Неизвестная ошибка'}\n`;
    }

    message += `\n🔒 ${dateType === 'CUSTOM_DATES' ? 'Склад' : 'Дата'} временно заблокирована системой из-за ошибки бронирования. Повторная попытка будет выполнена через 20 минут.`;

    return message;
  }

  /**
   * Checks if a user is currently blacklisted
   */
  isUserBlacklisted(userId: number): boolean {
    const expiration = this.blacklistedUsers.get(userId);

    if (!expiration) {
      return false;
    }

    if (Date.now() >= expiration) {
      this.blacklistedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Adds a user to the blacklist for specified duration
   */
  addUserToBlacklist(
    userId: number,
    duration: number = TOO_ACTIVE_BLACKLIST_DURATION_MS,
  ): void {
    const expiration = Date.now() + duration;
    this.blacklistedUsers.set(userId, expiration);

    const durationMinutes = duration / 60000;
    console.log(
      `🚫 BLACKLISTED USER: ${userId} - Duration: ${durationMinutes} minutes`,
    );
  }

  /**
   * Removes a user from the blacklist
   */
  removeUserFromBlacklist(userId: number): void {
    this.blacklistedUsers.delete(userId);
    console.log(`✅ REMOVED USER FROM BLACKLIST: ${userId}`);
  }

  /**
   * Clears all banned dates (useful for cleanup/reset)
   */
  clearAllBannedDates(): void {
    this.bannedDates.clear();
    this.banAttempts.clear();
    console.log('🧹 Cleared all banned dates and ban attempts');
  }

  /**
   * Clears all blacklisted users (useful for cleanup/reset)
   */
  clearAllBlacklistedUsers(): void {
    this.blacklistedUsers.clear();
    console.log('🧹 Cleared all blacklisted users');
  }

  /**
   * Gets statistics about current bans and blacklist
   */
  getStatistics(): {
    bannedDatesCount: number;
    blacklistedUsersCount: number;
    banAttemptsCount: number;
    activeBans: string[];
    activeBlacklist: number[];
    activeBanAttempts: string[];
  } {
    this.clearExpiredBans(); // Clean up first

    return {
      bannedDatesCount: this.bannedDates.size,
      blacklistedUsersCount: this.blacklistedUsers.size,
      banAttemptsCount: this.banAttempts.size,
      activeBans: Array.from(this.bannedDates.keys()),
      activeBlacklist: Array.from(this.blacklistedUsers.keys()),
      activeBanAttempts: Array.from(this.banAttempts.keys()),
    };
  }

  /**
   * Cleanup resources when service is destroyed
   */
  destroy(): void {
    if (this.clearTimer) {
      clearInterval(this.clearTimer);
      this.clearTimer = null;
    }
    this.clearAllBannedDates();
    this.clearAllBlacklistedUsers();
  }
}

export const sharedBanService = new SharedBanService();
