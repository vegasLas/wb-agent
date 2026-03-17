/**
 * Autobooking Supply ID Cache Service
 * Phase 5: Autobooking Core
 *
 * Manages caching of supply/preorder IDs to avoid creating duplicates
 * within the 24-hour window. Supply IDs are cached in the database.
 */

import { prisma } from '../../../config/database';
import { supplyService } from '../../supply.service';
import { logger } from '../../../utils/logger';
import { SUPPLY_TYPES } from '../../../constants/triggers';
import type {
  IAutobookingSupplyIdCacheService,
} from './autobooking.interfaces';
import type { MonitoringUser, SchedulableItem } from '../shared/interfaces/sharedInterfaces';

// Get constants from interface
const SUPPLY_ID_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AutobookingSupplyIdCacheService implements IAutobookingSupplyIdCacheService {
  /**
   * Checks if a cached supply ID is still valid (exists and not older than 24 hours)
   */
  isSupplyIdValid(booking: { supplyId: string | null; supplyIdUpdatedAt: Date | null }): boolean {
    if (!booking.supplyId || !booking.supplyIdUpdatedAt) {
      return false;
    }

    const now = Date.now();
    const updatedAt = new Date(booking.supplyIdUpdatedAt).getTime();
    const isExpired = now - updatedAt > SUPPLY_ID_CACHE_DURATION_MS;

    logger.debug(
      `[SupplyIdCache] Supply ID ${booking.supplyId} is ${isExpired ? 'expired' : 'valid'}`
    );

    return !isExpired;
  }

  /**
   * Gets or creates a preorder ID, handling caching and expiration logic
   */
  async getOrCreatePreorderId(params: {
    booking: SchedulableItem;
    account: { id: string };
    user: MonitoringUser;
    effectiveDate: Date;
    randomNumber: number;
    latency: number;
    isBoxOnPallet: boolean;
  }): Promise<number | null> {
    const {
      booking,
      account,
      user,
      effectiveDate,
      randomNumber,
      latency,
      isBoxOnPallet,
    } = params;

    // Check if we have a valid cached supply ID
    if (this.isSupplyIdValid(booking)) {
      const preorderId = parseInt(booking.supplyId as string);
      logger.info(
        `[SupplyIdCache] Using cached supply ID ${preorderId} for booking ${booking.id}`
      );
      return preorderId;
    }

    // Clear expired supply ID if it exists
    if (booking.supplyId) {
      logger.info(`[SupplyIdCache] Clearing expired supply ID: ${booking.supplyId}`);
      await this.clearExpiredSupplyId(booking, account, user, parseInt(booking.supplyId));
    }

    // Create new supply
    const supply = await this.createSupplyForBooking({
      account,
      booking,
      user,
      effectiveDate,
      randomNumber,
      latency,
      isBoxOnPallet,
    });

    const preorderId = supply.result?.ids[0]?.Id;
    if (preorderId) {
      logger.info(`[SupplyIdCache] Caching new supply ID ${preorderId} for booking ${booking.id}`);
      await this.cacheSupplyId(booking.id, preorderId.toString());
    }

    return preorderId || null;
  }

  /**
   * Clears expired supply ID from cache and optionally deletes preorder
   */
  private async clearExpiredSupplyId(
    booking: SchedulableItem,
    account: { id: string },
    user: MonitoringUser,
    preorderId: number
  ): Promise<void> {
    await this.deletePreorderSafely(account, booking, user, preorderId);
    await this.clearSupplyIdFromCache(booking.id);
  }

  /**
   * Saves supply ID and timestamp to the database for caching
   */
  async cacheSupplyId(bookingId: string, supplyId: string): Promise<void> {
    try {
      logger.debug(`[SupplyIdCache] Caching supply ID ${supplyId} for booking ${bookingId}`);
      await prisma.autobooking.update({
        where: { id: bookingId },
        data: {
          supplyId,
          supplyIdUpdatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(
        `[SupplyIdCache] Failed to cache supply ID for booking ${bookingId}:`,
        error
      );
    }
  }

  /**
   * Clears supply ID from database cache
   */
  async clearSupplyIdFromCache(bookingId: string): Promise<void> {
    try {
      logger.debug(`[SupplyIdCache] Clearing supply ID cache for booking ${bookingId}`);
      await prisma.autobooking.update({
        where: { id: bookingId },
        data: {
          supplyId: null,
          supplyIdUpdatedAt: null,
        },
      });
    } catch (error) {
      logger.error(
        `[SupplyIdCache] Failed to clear supply ID cache for booking ${bookingId}:`,
        error
      );
    }
  }

  /**
   * Creates supply for booking with proper parameters
   */
  private async createSupplyForBooking(params: {
    account: { id: string };
    booking: SchedulableItem;
    user: MonitoringUser;
    effectiveDate: Date;
    randomNumber: number;
    latency: number;
    isBoxOnPallet: boolean;
  }) {
    const {
      account,
      booking,
      user,
      effectiveDate,
      randomNumber,
      latency,
      isBoxOnPallet,
    } = params;

    // Box type mask mapping using constants
    const BOX_TYPE_MASK_MAPPINGS: Record<string, number> = {
      [SUPPLY_TYPES.BOX]: 2,
      [SUPPLY_TYPES.MONOPALLETE]: 32,
      [SUPPLY_TYPES.SUPERSAFE]: 6,
    };
    const boxTypeMask = BOX_TYPE_MASK_MAPPINGS[booking.supplyType] || 4;

    return supplyService.createSupply({
      accountId: account.id,
      supplierId: booking.supplierId,
      userId: user.userId,
      proxy: user.proxy,
      latency,
      deliveryDate: effectiveDate.toISOString(),
      rpc_order: randomNumber,
      params: {
        boxTypeID: boxTypeMask,
        isBoxOnPallet,
        draftID: booking.draftId,
        warehouseId: booking.warehouseId,
        transitWarehouseId: booking.transitWarehouseId || null,
      },
      userAgent: user.userAgent,
    });
  }

  /**
   * Safely deletes preorder with error handling
   */
  private async deletePreorderSafely(
    account: { id: string },
    booking: SchedulableItem,
    user: MonitoringUser,
    preorderId: number
  ): Promise<void> {
    try {
      logger.info(`[SupplyIdCache] Deleting preorder: ${preorderId}`);
      await supplyService.deletePreorder({
        accountId: account.id,
        supplierId: booking.supplierId,
        preorderId,
        userAgent: user.userAgent,
        proxy: user.proxy,
      });
      logger.info(`[SupplyIdCache] Successfully deleted preorder ${preorderId}`);
    } catch (deleteError) {
      await this.handlePreorderDeletionError(
        deleteError as Error,
        booking,
        preorderId
      );
    }
  }

  /**
   * Handles errors that occur during preorder deletion
   */
  private async handlePreorderDeletionError(
    error: { message?: string },
    booking: SchedulableItem,
    preorderId: number
  ): Promise<void> {
    if (error.message?.includes('Предзаказ не существует')) {
      logger.info(
        `[SupplyIdCache] Preorder ${preorderId} doesn't exist, clearing from cache`
      );
      await this.clearSupplyIdFromCache(booking.id);
    } else {
      logger.warn(`[SupplyIdCache] Failed to delete preorder ${preorderId}:`, error.message);
    }
  }
}

// Export singleton instance
export const autobookingSupplyIdCacheService = new AutobookingSupplyIdCacheService();
