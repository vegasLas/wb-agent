/**
 * Shared Interfaces for Monitoring Services
 * Phase 1: Foundation - Core infrastructure types
 */

import type {
  Autobooking,
  AutobookingReschedule,
  SupplyTrigger,
} from '@prisma/client';

// ============== Common Types ==============

export type DateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_DATES'
  | 'CUSTOM_DATES_SINGLE'
  | 'CUSTOM_PERIOD';

export type BoxTypeId = 2 | 5 | 6;

export type SupplyType = 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';

// ============== Error Types ==============

export interface TelegramError {
  code?: string;
  message?: string;
  response?: {
    body?: {
      description?: string;
    };
  };
}

export interface BookingError {
  message?: string;
  status?: number;
  url?: string;
}

// ============== Ban Types ==============

export interface BanParams {
  warehouseId: number;
  date: Date | null;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

export interface BanAllDatesParams {
  warehouseId: number;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

export interface BanSingleDateParams {
  warehouseId: number;
  date: Date;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

// ============== Telegram Notification ==============

export interface TelegramNotificationOptions {
  reply_markup?: {
    inline_keyboard?: Array<
      Array<{
        text: string;
        callback_data?: string;
        url?: string;
      }>
    >;
  };
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

export interface ISharedTelegramNotificationService {
  sendSuccessNotification(
    chatId: string,
    message: string,
    options?: TelegramNotificationOptions,
  ): Promise<void>;
  sendErrorNotification(
    chatId: string,
    message: string,
    options?: TelegramNotificationOptions,
  ): Promise<void>;
  sendBulkNotification(
    chatIds: Set<string>,
    message: string,
    options?: TelegramNotificationOptions,
  ): Promise<void>;
  handleNotificationError(error: TelegramError, chatId: string): Promise<void>;
  buildBookingSuccessMessage(
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
    isReschedule?: boolean,
  ): string;
  buildBannedDateMessage(
    warehouseName: string,
    date: Date | null,
    supplyType: string,
    error?: TelegramError | Error | unknown,
    isReschedule?: boolean,
  ): string;
}

// ============== Status Update ==============

export interface ItemWithDates {
  dateType: string;
  customDates: Date[] | null;
  completedDates: Date[] | null;
}

export interface StatusUpdateResult {
  updatedCustomDates: Date[];
  updatedCompletedDates: Date[];
  newStatus: string;
}

export interface ISharedStatusUpdateService {
  updateCompletedDates(
    item: ItemWithDates,
    completedDate: Date,
  ): Promise<StatusUpdateResult>;
  updateAutobookingStatus(
    bookingId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void>;
  updateRescheduleStatus(
    rescheduleId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void>;
  updateGenericItemStatus(
    tableName: 'autobooking' | 'autobookingReschedule',
    itemId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void>;
  shouldMarkAsCompleted(
    dateType: string,
    customDates: Date[],
    completedDate: Date,
  ): boolean;
  getEffectiveDates(
    dateType: string,
    startDate: Date | null,
    endDate: Date | null,
    customDates: Date[],
  ): Date[];
}

// ============== Error Handling ==============

export interface CategorizedError {
  type:
    | 'date_unavailable'
    | 'too_active'
    | 'critical'
    | 'non_critical'
    | 'order_not_exist';
  shouldStop: boolean;
  duration?: number;
  shouldBlacklistUser?: boolean;
  shouldClearCache?: boolean;
}

export interface ISharedErrorHandlingService {
  isDateUnavailableError(error: BookingError): boolean;
  isTooActiveError(error: BookingError): boolean;
  isCriticalError(errorMessage: string): boolean;
  categorizeError(error: BookingError): CategorizedError;
}

// ============== User Tracking ==============

export interface ISharedUserTrackingService {
  isUserRunning(userId: number): boolean;
  trackUsersAsRunning(userIds: number[]): void;
  removeUsersFromRunning(userIds: number[]): void;
  isUserBlacklisted(userId: number): boolean;
  addUserToBlacklist(userId: number, duration?: number): void;
  clearExpiredUsers(): void;
}

// ============== Latency ==============

export interface ISharedLatencyService {
  generateLatency(): number;
  getMinLatency(): number;
  getMaxLatency(): number;
  generateCustomLatency(minMs: number, maxMs: number): number;
}

// ============== Processing State ==============

export interface ISharedProcessingStateService {
  resetAutobookingState(): void;
  resetRescheduleState(): void;
  isAutobookingProcessed(bookingId: string): boolean;
  isRescheduleProcessed(rescheduleId: string): boolean;
  markAutobookingAsProcessed(bookingId: string): void;
  markRescheduleAsProcessed(rescheduleId: string): void;
  getProcessedAutobookingIds(): Set<string>;
  getProcessedRescheduleIds(): Set<string>;
  incrementConsoleLogCount(
    key: string,
    type: 'autobooking' | 'reschedule',
  ): number;
  getConsoleLogCount(key: string, type: 'autobooking' | 'reschedule'): number;
  clearConsoleLogCount(key: string, type: 'autobooking' | 'reschedule'): void;
  getProcessingStats(): {
    autobooking: {
      processedCount: number;
      loggedKeys: number;
    };
    reschedule: {
      processedCount: number;
      loggedKeys: number;
    };
  };
  clearAllState(): void;
}

// ============== Availability Filter ==============

export interface SchedulableItem {
  id: string;
  userId: number;
  supplierId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId: number | null;
  supplyType: string;
  dateType: string;
  startDate: Date | null;
  monopalletCount: number | null;
  transitWarehouseName: string | null;
  endDate: Date | null;
  currentDate?: Date | null;
  customDates: Date[];
  completedDates: Date[];
  maxCoefficient: number;
  status: string;
  supplyId: string | null;
  supplyIdUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: BoxTypeId;
  availableDates: Array<{
    date: string;
    coefficient: number;
  }>;
}

export interface FilteredMatch {
  availability: WarehouseAvailability;
  matchingDates: Array<{
    effectiveDate: Date;
    availableDate: { date: string; coefficient: number };
  }>;
}

export interface ISharedAvailabilityFilterService {
  filterMatchingAvailabilities<T extends SchedulableItem>(
    item: T & { effectiveDates?: Date[] },
    availabilities: WarehouseAvailability[],
  ): FilteredMatch[];
  convertToSchedulableItem(
    item: SchedulableItem & Record<string, unknown>,
  ): SchedulableItem & { effectiveDates?: Date[] };
}

// ============== Task Organizer ==============

export interface TaskOrganizerUser {
  userId: number;
  chatId?: string | null;
  accounts: Record<string, { supplierIds: string[]; wbCookies?: string | null }>;
  proxy?: {
    ip: string;
    port: string;
    username: string;
    password: string;
  };
}

export interface TaskOrganizerBookingItem {
  id: string;
  warehouseId: number;
  supplyType: string;
  supplierId: string;
}

export interface WarehouseDateTask<TBooking, TUser> {
  booking?: TBooking;
  reschedule?: TBooking;
  user: TUser;
  warehouseName: string;
  coefficient: number;
  availability: WarehouseAvailability;
}

export interface TaskOrganizerAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: 2 | 5 | 6;
  availableDates: Array<{ date: string; coefficient: number }>;
}

export interface ISharedTaskOrganizerService {
  groupTasksByProxy<T extends { user: { proxy?: Proxy | string | null } }>(
    warehouseDateTasksMap: Map<string, T[]>,
  ): Map<string, T[][]>;
  optimizeTaskOrder<
    T extends { coefficient: number; user: { proxy?: Proxy | string | null } },
  >(
    tasks: T[],
  ): T[];
  getProxyString<T extends { user: { proxy?: Proxy | string | null } }>(
    task: T,
  ): string;
  organizeBookingsByWarehouseDate<
    TBooking extends TaskOrganizerBookingItem,
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { autobookings: TBooking[] }>,
    availabilities: TaskOrganizerAvailability[],
  ): Map<
    string,
    Array<{
      booking?: TBooking;
      reschedule?: TBooking;
      user: TUser;
      warehouseName: string;
      coefficient: number;
      availability: TaskOrganizerAvailability;
    }>[]
  >;
  organizeReschedulesByWarehouseDate<
    TReschedule extends TaskOrganizerBookingItem & { status: string },
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { reschedules?: TReschedule[] }>,
    availabilities: TaskOrganizerAvailability[],
  ): Map<
    string,
    Array<{
      booking?: TReschedule;
      reschedule?: TReschedule;
      user: TUser;
      warehouseName: string;
      coefficient: number;
      availability: TaskOrganizerAvailability;
    }>[]
  >;
}

// ============== Ban Service ==============

export interface ISharedBanService {
  isBanned(params: Omit<BanParams, 'error'>): boolean;
  banAllDates(params: BanAllDatesParams): void;
  banSingleDate(params: BanSingleDateParams): void;
  isAllDatesBanned(
    params: Omit<BanAllDatesParams, 'error' | 'dateType'>,
  ): boolean;
  isSingleDateBanned(
    params: Omit<BanSingleDateParams, 'error' | 'dateType'>,
  ): boolean;
  isUserBlacklisted(userId: number): boolean;
  addUserToBlacklist(userId: number, duration?: number): void;
  removeUserFromBlacklist(userId: number): void;
  clearExpiredBans(): void;
  clearAllBannedDates(): void;
  clearAllBlacklistedUsers(): void;
  getStatistics(): {
    bannedDatesCount: number;
    blacklistedUsersCount: number;
    activeBans: string[];
    activeBlacklist: number[];
  };
  destroy(): void;
}

// ============== Monitoring User ==============

export interface MonitoringUser {
  userId: number;
  userAgent: string;
  proxy: Proxy;
  chatId?: string;
  autobookings: Autobooking[];
  supplyTriggers: SupplyTrigger[];
  reschedules: AutobookingReschedule[];
  accounts: { [accountId: string]: { supplierIds: string[]; wbCookies?: string | null } };
}

export interface WarehouseMonitoring {
  warehouseId: number;
  boxTypes: BoxTypeId[];
}

// ============== Proxy Types ==============

export interface Proxy {
  ip: string;
  port: string;
  username: string;
  password: string;
  timezone?: number;
  usageCount?: number;
}

// ============== UserEnvInfo (from existing types) ==============

export interface UserEnvInfo {
  screenResolution: [number, number];
  colorDepth: number;
  platform: string;
  language: string;
  userAgent: string;
  deviceMemory: number;
  hardwareConcurrency: number;
  timezone: number;
  plugins: string[];
  canvas: string;
  webgl: string;
  proxy: Proxy;
}

// ============== Supply (from WB API) ==============

export interface Supply {
  date: string;
  coefficient: number;
  warehouseID: number;
  warehouseName: string;
  boxTypeName:
    | 'Короба'
    | 'Суперсейф'
    | 'Монопаллеты'
    | 'QR-поставка с коробами';
  boxTypeID?: BoxTypeId;
  allowUnload: boolean;
}
