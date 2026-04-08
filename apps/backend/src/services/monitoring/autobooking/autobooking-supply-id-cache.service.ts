/**
 * Autobooking Supply ID Cache Service
 * Phase 5: Autobooking Core
 *
 * Manages caching of supply/preorder IDs to avoid creating duplicates
 * within the 24-hour window. Supply IDs are cached in the database.
 */

import { prisma } from '../../../config/database';
import { wbCookieSupplyService } from '../../external/wb-cookie/supply.service';
import { logger } from '../../../utils/logger';
import { SUPPLY_TYPES } from '../../../constants/triggers';
import type { IAutobookingSupplyIdCacheService } from './autobooking.interfaces';
import type {
  MonitoringUser,
  SchedulableItem,
} from '../shared/interfaces/sharedInterfaces';

// Get constants from interface
const SUPPLY_ID_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AutobookingSupplyIdCacheService
  implements IAutobookingSupplyIdCacheService
{
  /**
   * Checks if a cached supply ID is still valid (exists and not older than 24 hours)
   */
  isSupplyIdValid(booking: {
    supplyId: string | null;
    supplyIdUpdatedAt: Date | null;
  }): boolean {
    if (!booking.supplyId || !booking.supplyIdUpdatedAt) return false;
    const age = Date.now() - new Date(booking.supplyIdUpdatedAt).getTime();
    return age <= SUPPLY_ID_CACHE_DURATION_MS;
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

    // Use cached supply ID if valid
    if (this.isSupplyIdValid(booking)) {
      return parseInt(booking.supplyId as string);
    }

    // Clear expired supply ID if exists
    if (booking.supplyId) {
      await this.clearExpiredSupplyId(
        booking,
        account,
        user,
        parseInt(booking.supplyId),
      );
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
    preorderId: number,
  ): Promise<void> {
    await this.deletePreorderSafely(account, booking, user, preorderId);
    await this.clearSupplyIdFromCache(booking.id);
  }

  /**
   * Saves supply ID and timestamp to the database for caching
   */
  async cacheSupplyId(bookingId: string, supplyId: string): Promise<void> {
    try {
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
        error,
      );
    }
  }

  /**
   * Clears supply ID from database cache
   */
  async clearSupplyIdFromCache(bookingId: string): Promise<void> {
    try {
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
        error,
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
      [SUPPLY_TYPES.MONOPALLETE]: 5,
      [SUPPLY_TYPES.SUPERSAFE]: 6,
    };
    const boxTypeMask = BOX_TYPE_MASK_MAPPINGS[booking.supplyType] || 4;

    return wbCookieSupplyService.createSupply({
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
    preorderId: number,
  ): Promise<void> {
    try {
      await wbCookieSupplyService.deletePreorder({
        accountId: account.id,
        supplierId: booking.supplierId,
        preorderId,
        userAgent: user.userAgent,
        proxy: user.proxy,
      });
    } catch (deleteError) {
      await this.handlePreorderDeletionError(
        deleteError as Error,
        booking,
        preorderId,
      );
    }
  }

  /**
   * Handles errors that occur during preorder deletion
   */
  private async handlePreorderDeletionError(
    error: { message?: string },
    booking: SchedulableItem,
    preorderId: number,
  ): Promise<void> {
    if (error.message?.includes('Предзаказ не существует')) {
      await this.clearSupplyIdFromCache(booking.id);
    } else {
      logger.warn(
        `[SupplyIdCache] Failed to delete preorder ${preorderId}:`,
        error.message,
      );
    }
  }
}

// Export singleton instance
export const autobookingSupplyIdCacheService =
  new AutobookingSupplyIdCacheService();
