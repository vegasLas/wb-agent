// Common error types
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

// Common ban parameters
export interface BanParams {
  warehouseId: number;
  date: Date | null;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

// Parameters for banning all dates for a warehouse-supply-coefficient combination
export interface BanAllDatesParams {
  warehouseId: number;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

// Parameters for banning a specific date
export interface BanSingleDateParams {
  warehouseId: number;
  date: Date;
  supplyType: string;
  dateType?: string;
  error?: BookingError;
  duration?: number;
  coefficient: number;
}

// Common types
export type DateType =
  | "WEEK"
  | "MONTH"
  | "CUSTOM_DATES"
  | "CUSTOM_DATES_SINGLE"
  | "CUSTOM_PERIOD";
export type BoxTypeId = 2 | 5 | 6;

// Telegram notification options interface
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
  parse_mode?: "HTML" | "Markdown";
  disable_web_page_preview?: boolean;
}

// Shared notification interface
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
  handleNotificationError(error: TelegramError, chatId: string): Promise<void>;
}

// Item with date properties interface
export interface ItemWithDates {
  dateType: string;
  customDates: Date[] | null;
  completedDates: Date[] | null;
}

// Shared status update interface
export interface ISharedStatusUpdateService {
  updateCompletedDates(
    item: ItemWithDates,
    completedDate: Date,
  ): Promise<{
    updatedCustomDates: Date[];
    updatedCompletedDates: Date[];
    newStatus: string;
  }>;
}

// Shared error handling interface
export interface ISharedErrorHandlingService {
  isDateUnavailableError(error: BookingError): boolean;
  isTooActiveError(error: BookingError): boolean;
  isCriticalError(errorMessage: string): boolean;
  categorizeError(error: BookingError): {
    type:
      | "date_unavailable"
      | "too_active"
      | "critical"
      | "non_critical"
      | "order_not_exist";
    shouldStop: boolean;
    duration?: number;
  };
}

// Shared user tracking interface
export interface ISharedUserTrackingService {
  isUserRunning(userId: number): boolean;
  trackUsersAsRunning(userIds: number[]): void;
  removeUsersFromRunning(userIds: number[]): void;
  isUserBlacklisted(userId: number): boolean;
  addUserToBlacklist(userId: number, duration?: number): void;
  clearExpiredUsers(): void;
}

// Schedulable item interface for filtering and monitoring
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

// Warehouse availability interface
export interface WarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: BoxTypeId;
  availableDates: Array<{
    date: string;
    coefficient: number;
  }>;
}

// Shared latency service interface
export interface ISharedLatencyService {
  generateLatency(): number;
  getMinLatency(): number;
  getMaxLatency(): number;
  generateCustomLatency(minMs: number, maxMs: number): number;
}

// Shared availability filter interface
export interface ISharedAvailabilityFilterService {
  filterMatchingAvailabilities<T extends SchedulableItem>(
    item: T & { effectiveDates?: Date[] },
    availabilities: WarehouseAvailability[],
  ): Array<{
    availability: WarehouseAvailability;
    matchingDates: Array<{
      effectiveDate: Date;
      availableDate: { date: string; coefficient: number };
    }>;
  }>;

  convertToSchedulableItem(
    item: SchedulableItem & Record<string, unknown>,
  ): SchedulableItem & { effectiveDates?: Date[] };
}

// Generic types for task organizer
export interface TaskOrganizerUser {
  userId: number;
  chatId?: string | null;
  accounts: Record<string, string[]>;
  proxy?: unknown;
}

export interface TaskOrganizerBookingItem {
  id: string;
  warehouseId: number;
  supplyType: string;
  supplierId: string;
}

export interface TaskOrganizerAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: 2 | 5 | 6;
  availableDates: Array<{ date: string; coefficient: number }>;
}

// Shared task organizer interface
export interface ISharedTaskOrganizerService {
  groupTasksByProxy<T extends { user: { proxy?: unknown } }>(
    warehouseDateTasksMap: Map<string, T[]>,
  ): Map<string, T[][]>;

  optimizeTaskOrder<T extends { coefficient: number; user: { proxy?: unknown } }>(
    tasks: T[],
  ): T[];
  getProxyString<T extends { user: { proxy?: unknown } }>(task: T): string;

  organizeBookingsByWarehouseDate<
    TBooking extends TaskOrganizerBookingItem,
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { autobookings: TBooking[] }>,
    availabilities: Array<{
      warehouseId: number;
      warehouseName: string;
      boxTypeID: number;
      availableDates: Array<{ date: string; coefficient: number }>;
    }>,
    availabilityFilterFn: (
      booking: TBooking,
      availabilities: Array<{
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      }>,
    ) => Array<{
      availability: {
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      };
      matchingDates: Array<{
        effectiveDate: Date;
        availableDate: { date: string; coefficient: number };
      }>;
    }>,
  ): Map<
    string,
    Array<{
      booking?: TBooking;
      reschedule?: TBooking;
      user: TUser;
      warehouseName: string;
      coefficient: number;
      availability: {
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      };
    }>[]
  >;

  organizeReschedulesByWarehouseDate<
    TReschedule extends TaskOrganizerBookingItem & { status: string },
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { reschedules?: TReschedule[] }>,
    availabilities: Array<{
      warehouseId: number;
      warehouseName: string;
      boxTypeID: number;
      availableDates: Array<{ date: string; coefficient: number }>;
    }>,
    availabilityFilterFn: (
      reschedule: TReschedule,
      availabilities: Array<{
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      }>,
    ) => Array<{
      availability: {
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      };
      matchingDates: Array<{
        effectiveDate: Date;
        availableDate: { date: string; coefficient: number };
      }>;
    }>,
  ): Map<
    string,
    Array<{
      booking?: TReschedule;
      reschedule?: TReschedule;
      user: TUser;
      warehouseName: string;
      coefficient: number;
      availability: {
        warehouseId: number;
        warehouseName: string;
        boxTypeID: number;
        availableDates: Array<{ date: string; coefficient: number }>;
      };
    }>[]
  >;
}

// Shared processing state interface
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
    type: "autobooking" | "reschedule",
  ): number;
  getConsoleLogCount(key: string, type: "autobooking" | "reschedule"): number;
  clearConsoleLogCount(key: string, type: "autobooking" | "reschedule"): void;
  clearAllState(): void;
}

// Shared ban service interface
export interface ISharedBanService {
  isBanned(params: Omit<BanParams, "error">): boolean;
  // Explicit methods for banning
  banAllDates(params: BanAllDatesParams): void;
  banSingleDate(params: BanSingleDateParams): void;
  // Check methods
  isAllDatesBanned(
    params: Omit<BanAllDatesParams, "error" | "dateType">,
  ): boolean;
  isSingleDateBanned(
    params: Omit<BanSingleDateParams, "error" | "dateType">,
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
