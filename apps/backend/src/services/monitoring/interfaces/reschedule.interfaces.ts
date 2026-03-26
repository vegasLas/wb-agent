import type { AutobookingReschedule } from '@prisma/client';

/**
 * Valid reschedule date types
 */
export type RescheduleDateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_DATES_SINGLE'
  | 'CUSTOM_PERIOD';

/**
 * Reschedule booking error type
 */
export interface RescheduleBookingError {
  message?: string;
  status?: number;
  url?: string;
}

/**
 * Reschedule booking task for processing
 */
export interface RescheduleBookingTask {
  reschedule: AutobookingReschedule;
  user: MonitoringUser;
  warehouseName: string;
  coefficient: number;
  availability: WarehouseAvailability;
}

/**
 * Successful reschedule record
 */
export interface SuccessfulReschedule {
  chatId: string;
  warehouseName: string;
  effectiveDate: Date;
  coefficient: number;
  reschedule: AutobookingReschedule;
}

/**
 * Reschedule ban parameters
 */
export interface RescheduleBanParams {
  warehouseId: number;
  date: Date | null;
  supplyType: string;
  dateType?: string;
  withoutDate?: boolean;
  error?: RescheduleBookingError;
  duration?: number;
}

/**
 * Monitoring user with reschedules
 * Compatible with sharedInterfaces.MonitoringUser
 */
export interface MonitoringUser {
  userId: number;
  userAgent: string;
  proxy: Proxy;
  chatId?: string;
  autobookings: import('@prisma/client').Autobooking[];
  supplyTriggers: import('@prisma/client').SupplyTrigger[];
  reschedules: AutobookingReschedule[];
  accounts: { [accountId: string]: string[] };
}

/**
 * AutobookingReschedule with dates info
 */
export type AutobookingRescheduleWithDates = AutobookingReschedule;

/**
 * Proxy configuration
 */
export interface Proxy {
  ip: string;
  port: string;
  username: string;
  password: string;
}

/**
 * Autobooking lite version for monitoring
 */
export interface AutobookingLite {
  id: string;
  userId: number;
  supplierId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  dateType: string;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates: Date[];
  maxCoefficient: number;
  status: string;
  supplyType: string;
  monopalletCount?: number | null;
}

/**
 * Supply trigger lite version for monitoring
 */
export interface SupplyTriggerLite {
  id: string;
  userId: number;
  supplierId: string;
  warehouseId: number;
  dateType: string;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates: Date[];
  targetCoefficients: number[];
  status: string;
  supplyType: string;
}

/**
 * Warehouse availability information
 */
export interface WarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: 2 | 5 | 6;
  availableDates: {
    date: string;
    coefficient: number;
  }[];
}

// Box type IDs
export type BoxTypeId = 2 | 5 | 6;

/**
 * Reschedule Executor Service Interface
 */
export interface IRescheduleExecutorService {
  /**
   * Creates reschedule task - updates existing supply date
   */
  createRescheduleTask(params: {
    reschedule: AutobookingReschedule;
    effectiveDate: Date;
    account: { id: string };
    user: MonitoringUser;
    latency: number;
  }): Promise<void>;

  /**
   * Adds successful reschedule to the list
   */
  addSuccessfulReschedule(
    successfulReschedules: SuccessfulReschedule[],
    params: {
      user: MonitoringUser;
      warehouseName: string;
      effectiveDate: Date;
      coefficient: number;
      reschedule: AutobookingReschedule;
    }
  ): void;

  /**
   * Logs successful reschedule
   */
  logSuccessfulReschedule(
    reschedule: AutobookingReschedule,
    effectiveDate: Date,
    userId: number
  ): void;

  /**
   * Handles reschedule processing errors
   */
  handleRescheduleProcessingError(params: {
    error: RescheduleBookingError;
    reschedule: AutobookingReschedule;
    user: MonitoringUser;
    warehouseName: string;
    effectiveDate: Date;
    account: { id: string };
    coefficient: number;
  }): Promise<void>;

  /**
   * Filters availabilities to find matching warehouse and dates for reschedule
   */
  filterMatchingAvailabilities(
    reschedule: AutobookingReschedule,
    availabilities: WarehouseAvailability[]
  ): Array<{
    availability: WarehouseAvailability;
    matchingDates: Array<{
      effectiveDate: Date;
      availableDate: { date: string; coefficient: number };
    }>;
  }>;

  /**
   * Updates reschedule status after successful reschedule
   */
  updateRescheduleStatus(
    reschedule: AutobookingReschedule,
    rescheduledDate: Date
  ): Promise<void>;
}

/**
 * Reschedule Notification Service Interface
 */
export interface IRescheduleNotificationService {
  /**
   * Updates reschedule status after successful reschedule
   */
  updateRescheduleStatus(
    reschedule: AutobookingReschedule,
    rescheduledDate: Date
  ): Promise<void>;

  /**
   * Sends success notification for reschedule
   */
  sendSuccessNotification(
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number
  ): Promise<void>;

  /**
   * Sends banned date notification for reschedule
   */
  sendBannedDateNotification(
    params: Omit<RescheduleBanParams, 'withoutDate'>
  ): Promise<void>;
}

/**
 * Reschedule Monitoring Service Interface
 */
export interface IRescheduleMonitoringService {
  /**
   * Main entry point for processing warehouse availabilities and matching with reschedules
   */
  processRescheduleAvailabilities(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[]
  ): Promise<void>;
}
