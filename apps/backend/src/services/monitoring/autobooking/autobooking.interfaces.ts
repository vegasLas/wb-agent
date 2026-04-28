/**
 * Autobooking Interfaces
 * Phase 5: Autobooking Core
 *
 * Type definitions for autobooking monitoring services
 */

import type { Autobooking } from '@prisma/client';
import type {
  MonitoringUser,
  WarehouseAvailability,
  SchedulableItem,
  BookingError,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// ============== Core Types ==============

/**
 * Represents a single task for booking processing
 */
export interface BookingTask {
  booking: Autobooking;
  user: MonitoringUser;
  warehouseName: string;
  coefficient: number;
  availability: WarehouseAvailability;
}

/**
 * Represents a successfully completed booking
 */
export interface SuccessfulBooking {
  userId: number;
  chatId: string;
  warehouseName: string;
  effectiveDate: Date;
  coefficient: number;
  transitWarehouseName?: string | null;
  booking: SchedulableItem;
}

// ============== Service Interfaces ==============

/**
 * Interface for Autobooking Supply ID Cache Service
 * Manages caching of supply/preorder IDs to avoid duplicates within 24-hour window
 */
export interface IAutobookingSupplyIdCacheService {
  /**
   * Check if cached supply ID is still valid (exists and not older than 24 hours)
   */
  isSupplyIdValid(booking: Autobooking): boolean;

  /**
   * Get existing or create new preorder ID
   */
  getOrCreatePreorderId(params: {
    booking: SchedulableItem;
    account: { id: string };
    user: MonitoringUser;
    effectiveDate: Date;
    randomNumber: number;
    latency: number;
    isBoxOnPallet: boolean;
  }): Promise<number | null>;

  /**
   * Cache supply ID in database
   */
  cacheSupplyId(bookingId: string, supplyId: string): Promise<void>;

  /**
   * Clear supply ID from cache
   */
  clearSupplyIdFromCache(bookingId: string): Promise<void>;
}

/**
 * Interface for Autobooking Executor Service
 * Handles the actual booking execution and error handling
 */
export interface IAutobookingExecutorService {
  /**
   * Creates a booking task for the monitoring system
   */
  createBookingTask(params: {
    booking: SchedulableItem;
    effectiveDate: Date;
    account: { id: string };
    user: MonitoringUser;
    latency: number;
  }): Promise<void>;

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
    },
  ): void;

  /**
   * Logs a successful booking
   */
  logSuccessfulBooking(
    booking: SchedulableItem,
    effectiveDate: Date,
    userId: number,
  ): void;

  /**
   * Handles booking processing errors with categorization
   */
  handleBookingProcessingError(params: {
    error: BookingError;
    booking: SchedulableItem;
    user: MonitoringUser;
    warehouseName: string;
    effectiveDate: Date;
    account: { id: string };
    preorderId: number | null;
    coefficient: number;
  }): Promise<void>;
}

/**
 * Interface for Autobooking Notification Service
 * Handles success notifications and status updates
 */
export interface IAutobookingNotificationService {
  /**
   * Send success notification to user
   */
  sendSuccessNotification(
    userId: number,
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
  ): Promise<void>;

  /**
   * Update autobooking status after successful booking
   */
  updateAutobookingStatus(
    booking: SchedulableItem,
    bookedDate: Date,
  ): Promise<void>;
}

/**
 * Interface for Autobooking Monitoring Service
 * Main orchestrator for autobooking monitoring
 */
export interface IAutobookingMonitoringService {
  /**
   * Main entry point for processing warehouse availabilities
   */
  processAvailabilities(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[],
  ): Promise<void>;
}

// ============== Constants ==============

export const AUTOBOOKING_CONSTANTS = {
  // Cache duration for supply IDs (24 hours)
  SUPPLY_ID_CACHE_DURATION_MS: 24 * 60 * 60 * 1000,

  // Ban duration for date unavailable errors (1 second)
  DATE_UNAVAILABLE_BAN_DURATION_MS: 1000,

  // Ban duration for too active errors (10 minutes)
  TOO_ACTIVE_BLACKLIST_DURATION_MS: 10 * 60 * 1000,

  // Default ban duration (60 seconds)
  DEFAULT_BAN_DURATION_MS: 60 * 1000,

  // Box type mask mappings
  BOX_TYPE_MASK: {
    BOX: 2,
    MONOPALLETE: 32,
    SUPERSAFE: 6,
  } as const,
} as const;
