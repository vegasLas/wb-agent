/**
 * Warehouse Monitoring V2 Service
 * Phase 1: Foundation - Central orchestrator for all monitoring activities
 * 
 * Purpose: Coordinates the entire monitoring cycle including:
 * - Collecting active monitoring users
 * - Fetching warehouse availability data
 * - Processing and delegating to specialized services
 */

import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { freeWarehouseService } from '../free-warehouse.service';
import { closeApiService } from '../close-api.service';
import { fakeDataDetectionService } from './fake-data-detection.service';
import { supplyTriggerMonitoringService } from './supply-trigger-monitoring.service';
import { autobookingMonitoringService } from './autobooking/autobooking-monitoring.service';
import { isAutobookingProcessingActive } from '../autobooking-control.service';
import type {
  MonitoringUser,
  WarehouseMonitoring,
  WarehouseAvailability,
  Proxy,
  Supply,
} from './shared/interfaces/sharedInterfaces';
import type { Autobooking, AutobookingReschedule, SupplyTrigger } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

// ============== Type Definitions ==============

interface SupplierData {
  supplierId: string;
}

interface AccountData {
  id: string;
  wbCookies?: string | null;
  selectedSupplierId?: string | null;
  suppliers: SupplierData[];
}

interface UserData {
  id: number;
  envInfo: JsonValue;
  chatId?: string | null;
  accounts: AccountData[];
}

interface UserWithBookings extends UserData {
  // Used for autobooking queries
}

interface UserWithTriggers extends UserData {
  // Used for supply trigger queries
}

type BoxTypeId = 2 | 5 | 6;

interface CreateMonitoringUserParams {
  user: UserData;
  autobookings?: Autobooking[];
  supplyTriggers?: SupplyTrigger[];
  reschedules?: AutobookingReschedule[];
}

interface GroupUserBookingsAndTriggersParams {
  autobookings: (Autobooking & { user: UserWithBookings })[];
  supplyTriggers: (SupplyTrigger & { user: UserWithTriggers })[];
  reschedules: (AutobookingReschedule & { user: UserData })[];
}

interface ProcessItemsParams<TInput, TProcessed> {
  items: TInput[];
  processor: (
    item: TInput
  ) => { user: UserData; processedItem: TProcessed } | null;
  userMap: Map<number, MonitoringUser>;
  arrayKey: keyof MonitoringUser & keyof CreateMonitoringUserParams;
}

interface AddOrUpdateUserParams<T> {
  userMap: Map<number, MonitoringUser>;
  user: UserData;
  item: T;
  arrayKey: keyof MonitoringUser;
  createUserParams: Partial<CreateMonitoringUserParams>;
}

interface WarehouseDataExtractor<T> {
  (item: T): { warehouseId: number; boxTypeId: BoxTypeId }[];
}

interface DateTypeEntity {
  dateType: string;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates?: Date[] | null;
}

interface EntityWithUser<T> {
  user: UserData;
  supplierId: string;
}

// ============== Constants ==============

const SUPPLY_TYPE_MAP: Record<string, BoxTypeId> = {
  BOX: 2,
  MONOPALLETE: 5,
  SUPERSAFE: 6,
};

// ============== Helper Functions ==============

const getBoxTypeFromSupplyType = (supplyType: string): BoxTypeId => {
  return SUPPLY_TYPE_MAP[supplyType] || 2; // Default fallback to BOX
};

// ============== Service Class ==============

export class WarehouseMonitoringV2Service {
  /**
   * Main monitoring entry point
   * Orchestrates: collect → fetch → process cycle
   */
  async monitorWarehouses(): Promise<void> {
    try {
      logger.info('[WarehouseMonitoringV2] Starting monitoring cycle');

      // 1. Collect active monitoring users
      const monitoringUsers = await this.collectMonitoringUsers();
      if (monitoringUsers.length === 0) {
        logger.info('[WarehouseMonitoringV2] No monitoring users found');
        return;
      }
      logger.info(`[WarehouseMonitoringV2] Found ${monitoringUsers.length} monitoring users`);

      // 2. Collect required warehouse data
      const warehouses = this.collectWarehouseData(monitoringUsers);
      if (warehouses.length === 0) {
        logger.info('[WarehouseMonitoringV2] No warehouses to monitor');
        return;
      }
      logger.info(`[WarehouseMonitoringV2] Monitoring ${warehouses.length} warehouse-boxtype combinations`);

      // 3. Fetch availability from APIs
      const validatedWarehouses = this.fetchAllWarehouses(warehouses);
      if (validatedWarehouses.length === 0) {
        logger.info('[WarehouseMonitoringV2] No validated warehouses available');
        return;
      }

      // 4. Save coefficients for analytics (if needed)
      // await this.saveWarehouseCoefficients(validatedWarehouses);

      // 5. Process into availability format
      const availabilities = this.processWarehouseData(validatedWarehouses);
      logger.info(`[WarehouseMonitoringV2] Processed ${availabilities.length} warehouse availabilities`);

      // 6. Delegate to processing services
      await this.processMonitoringServices(monitoringUsers, availabilities);

      logger.info('[WarehouseMonitoringV2] Monitoring cycle completed');
    } catch (error) {
      logger.error('[WarehouseMonitoringV2] Error in warehouse monitoring:', error);
    }
  }

  /**
   * Collects active monitoring users with their autobookings and supply triggers
   */
  private async collectMonitoringUsers(): Promise<MonitoringUser[]> {
    try {
      // Check for technical mode - if TECHNICAL_MODE_USER_ID is set, only process that user
      const technicalModeUserId = process.env.TECHNICAL_MODE_USER_ID;
      let activeUserCondition: {
        chatId?: { not: null };
        subscriptionExpiresAt?: { gt: Date };
        id?: number;
      } = {
        chatId: { not: null },
        subscriptionExpiresAt: { gt: new Date() },
      };

      // In technical mode, override user condition to only select the specified user
      if (technicalModeUserId) {
        const userId = parseInt(technicalModeUserId);
        if (!isNaN(userId)) {
          activeUserCondition = { id: userId };
          logger.info(`[WarehouseMonitoringV2] Technical mode: processing only user ${userId}`);
        }
      }

      const userSelection = {
        id: true,
        envInfo: true,
        chatId: true,
        accounts: {
          include: { suppliers: true },
        },
      };

      // Parallel queries for performance
      const [autobookings, supplyTriggers, reschedules] = await Promise.all([
        prisma.autobooking.findMany({
          where: {
            status: 'ACTIVE',
            user: activeUserCondition,
          },
          include: { user: { select: userSelection } },
        }),
        prisma.supplyTrigger.findMany({
          where: {
            isActive: true,
            user: activeUserCondition,
          },
          include: { user: { select: userSelection } },
        }),
        prisma.autobookingReschedule.findMany({
          where: {
            status: 'ACTIVE',
            user: activeUserCondition,
          },
          include: { user: { select: userSelection } },
        }),
      ]);

      logger.info(`[WarehouseMonitoringV2] Raw counts - Autobookings: ${autobookings.length}, Triggers: ${supplyTriggers.length}, Reschedules: ${reschedules.length}`);

      return this.groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });
    } catch (error) {
      logger.error('[WarehouseMonitoringV2] Error collecting monitoring users:', error);
      return [];
    }
  }

  /**
   * Groups autobookings, triggers, and reschedules by user
   */
  private groupUserBookingsAndTriggers(
    params: GroupUserBookingsAndTriggersParams
  ): MonitoringUser[] {
    const { autobookings, supplyTriggers, reschedules } = params;
    const userMap = new Map<number, MonitoringUser>();

    // Process all monitoring data using generic helper
    this.processItems({
      items: autobookings,
      processor: this.validateEntityForMonitoring.bind(this),
      userMap,
      arrayKey: 'autobookings',
    });

    this.processItems({
      items: supplyTriggers,
      processor: this.prepareSupplyTrigger.bind(this),
      userMap,
      arrayKey: 'supplyTriggers',
    });

    this.processItems({
      items: reschedules,
      processor: this.validateEntityForMonitoring.bind(this),
      userMap,
      arrayKey: 'reschedules',
    });

    return Array.from(userMap.values());
  }

  /**
   * Generic helper to validate entity - no longer pre-calculates dates
   */
  private validateEntityForMonitoring<
    T extends DateTypeEntity & EntityWithUser<T>
  >(entity: T): { user: UserData; processedItem: T } | null {
    const { user } = entity;

    // Early validation returns
    if (!this.isValidUser(user)) return null;
    if (!this.hasValidAccount(user.accounts, entity.supplierId)) return null;

    // No date pre-calculation - dates will be computed on-demand by availabilityFilterService
    return {
      user,
      processedItem: entity,
    };
  }

  /**
   * Validates if user has a valid account for the supplier
   */
  private hasValidAccount(
    accounts: AccountData[],
    supplierId: string
  ): boolean {
    const matchingAccount = this.findMatchingAccount(accounts, supplierId);
    return !!matchingAccount?.wbCookies;
  }

  /**
   * Finds matching account for a supplier
   */
  private findMatchingAccount(
    accounts: AccountData[],
    supplierId: string
  ): AccountData | undefined {
    return accounts?.find(account =>
      account.suppliers.some(
        (supplier: SupplierData) => supplier.supplierId === supplierId
      )
    );
  }

  /**
   * Generic helper to add or update user with monitoring data
   */
  private addOrUpdateUser<T>(params: AddOrUpdateUserParams<T>): void {
    const { userMap, user, item, arrayKey, createUserParams } = params;

    if (userMap.has(user.id)) {
      (userMap.get(user.id)![arrayKey] as T[]).push(item);
    } else {
      userMap.set(
        user.id,
        this.createMonitoringUser({
          user,
          ...createUserParams,
        })
      );
    }
  }

  /**
   * Generic helper to process items with map-filter-forEach pattern
   */
  private processItems<TInput, TProcessed>(
    params: ProcessItemsParams<TInput, TProcessed>
  ): void {
    const { items, processor, userMap, arrayKey } = params;

    items
      .map(processor)
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .forEach(({ user, processedItem }) => {
        this.addOrUpdateUser({
          userMap,
          user,
          item: processedItem,
          arrayKey,
          createUserParams: {
            [arrayKey]: [processedItem],
          } as Partial<CreateMonitoringUserParams>,
        });
      });
  }

  /**
   * Prepares a supply trigger if it meets all requirements
   */
  private prepareSupplyTrigger(
    trigger: SupplyTrigger & { user: UserWithTriggers }
  ): { user: UserData; processedItem: SupplyTrigger } | null {
    const { user } = trigger;

    // Early validation returns
    if (!user.chatId) return null;
    if (!this.shouldNotifyTrigger(trigger)) return null;
    if (trigger.warehouseIds.length === 0) return null;

    return {
      user,
      processedItem: {
        ...trigger,
        warehouseIds: trigger.warehouseIds,
      },
    };
  }

  /**
   * Validates user has required env info
   */
  private isValidUser(user: UserData): boolean {
    return !!user.envInfo;
  }

  /**
   * Checks if trigger should notify based on checkInterval
   */
  private shouldNotifyTrigger(trigger: SupplyTrigger): boolean {
    return (
      !trigger.lastNotificationAt ||
      Date.now() - trigger.lastNotificationAt.getTime() >=
        trigger.checkInterval * 60 * 1000
    );
  }

  /**
   * Creates a MonitoringUser from user data
   */
  private createMonitoringUser(
    params: CreateMonitoringUserParams
  ): MonitoringUser {
    const {
      user,
      autobookings = [],
      supplyTriggers = [],
      reschedules = [],
    } = params;

    const envInfo = user.envInfo as unknown as { userAgent: string; proxy: Proxy };

    // Transform accounts to {accountId: supplierId[]} format
    const accounts: { [accountId: string]: string[] } = {};
    if (user.accounts && user.accounts.length > 0) {
      user.accounts.forEach((account: AccountData) => {
        accounts[account.id] = account.suppliers.map(
          (supplier: SupplierData) => supplier.supplierId
        );
      });
    }

    return {
      userId: user.id,
      proxy: envInfo.proxy,
      userAgent: envInfo.userAgent,
      chatId: user.chatId || undefined,
      autobookings,
      supplyTriggers,
      reschedules,
      accounts,
    };
  }

  /**
   * Collects warehouse data from monitoring users
   */
  private collectWarehouseData(users: MonitoringUser[]): WarehouseMonitoring[] {
    const warehouseMap = new Map<number, Set<BoxTypeId>>();

    users.forEach(user => {
      this.collectWarehouseDataFromItems(
        user.autobookings,
        warehouseMap,
        this.extractAutobookingWarehouseData
      );
      this.collectWarehouseDataFromItems(
        user.supplyTriggers,
        warehouseMap,
        this.extractTriggerWarehouseData
      );
      this.collectWarehouseDataFromItems(
        user.reschedules,
        warehouseMap,
        this.extractRescheduleWarehouseData
      );
    });

    return Array.from(warehouseMap.entries()).map(
      ([warehouseId, boxTypes]) => ({
        warehouseId,
        boxTypes: Array.from(boxTypes),
      })
    );
  }

  /**
   * Generic method to collect warehouse data from any type of items
   */
  private collectWarehouseDataFromItems<T>(
    items: T[],
    warehouseMap: Map<number, Set<BoxTypeId>>,
    extractor: WarehouseDataExtractor<T>
  ): void {
    items.flatMap(extractor).forEach(({ warehouseId, boxTypeId }) => {
      this.addWarehouseToMap(warehouseMap, warehouseId, boxTypeId);
    });
  }

  private extractAutobookingWarehouseData = (
    booking: Autobooking
  ): { warehouseId: number; boxTypeId: BoxTypeId }[] => {
    if (!booking.warehouseId) return [];
    return [
      {
        warehouseId: booking.warehouseId,
        boxTypeId: getBoxTypeFromSupplyType(booking.supplyType),
      },
    ];
  };

  private extractTriggerWarehouseData = (
    trigger: SupplyTrigger
  ): { warehouseId: number; boxTypeId: BoxTypeId }[] => {
    return trigger.warehouseIds.flatMap(warehouseId =>
      trigger.supplyTypes.map(type => ({
        warehouseId,
        boxTypeId: getBoxTypeFromSupplyType(type),
      }))
    );
  };

  private extractRescheduleWarehouseData = (
    reschedule: AutobookingReschedule
  ): { warehouseId: number; boxTypeId: BoxTypeId }[] => {
    if (!reschedule.warehouseId) return [];
    return [
      {
        warehouseId: reschedule.warehouseId,
        boxTypeId: getBoxTypeFromSupplyType(reschedule.supplyType),
      },
    ];
  };

  private addWarehouseToMap(
    warehouseMap: Map<number, Set<BoxTypeId>>,
    warehouseId: number,
    boxTypeId: BoxTypeId
  ): void {
    if (!warehouseMap.has(warehouseId)) {
      warehouseMap.set(warehouseId, new Set());
    }
    warehouseMap.get(warehouseId)!.add(boxTypeId);
  }

  /**
   * Fetches warehouse data from APIs
   */
  private fetchAllWarehouses(warehouseIds: WarehouseMonitoring[]): Supply[] {
    try {
      // Fetch from both APIs independently (no filtering by user requirements yet)
      const freeApiWarehouses = this.fetchFromFreeApi();
      const closeApiWarehouses = this.fetchFromCloseApi();

      // Check for problematic patterns before user filtering
      const problematicCheck =
        fakeDataDetectionService.checkProblematicWarehouses(freeApiWarehouses);

      if (problematicCheck.shouldSkip) {
        logger.warn('[WarehouseMonitoringV2] Skipping due to problematic warehouse pattern:', problematicCheck.reason);
        return [];
      }

      // Merge and deduplicate
      const mergedWarehouses = this.mergeAndDeduplicateWarehouses(
        freeApiWarehouses,
        closeApiWarehouses
      );

      // Now filter by user requirements (warehouseIds and boxTypes)
      const userFilteredWarehouses = this.filterByUserRequirements(
        mergedWarehouses,
        warehouseIds
      );

      return this.filterValidWarehouses(userFilteredWarehouses);
    } catch (error) {
      this.handleFetchError(error);
      return [];
    }
  }

  private fetchFromFreeApi(): Supply[] {
    // Get all cached warehouses - no API calls, no filtering by warehouse IDs
    const warehouses = freeWarehouseService.getAllCachedWarehouses();

    return warehouses.filter(
      warehouse =>
        warehouse?.boxTypeID &&
        warehouse.allowUnload === true &&
        warehouse.coefficient >= 0
    );
  }

  private fetchFromCloseApi(): Supply[] {
    // Just get cached data - no API calls, no filtering by user requirements
    const closeApiData = closeApiService.getCachedData();

    return closeApiData.filter(
      warehouse =>
        warehouse?.boxTypeID &&
        warehouse.allowUnload === true &&
        warehouse.coefficient >= 0
    );
  }

  /**
   * Merges warehouses from both APIs and removes duplicates
   * Deduplication is based on warehouseID + boxTypeID + date combination
   * In case of duplicates, free API data takes precedence
   */
  private mergeAndDeduplicateWarehouses(
    freeApiWarehouses: Supply[],
    closeApiWarehouses: Supply[]
  ): Supply[] {
    const warehouseMap = new Map<string, Supply>();

    // Add free API warehouses first (they take precedence)
    freeApiWarehouses.forEach(warehouse => {
      const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}-${warehouse.date}`;
      warehouseMap.set(key, warehouse);
    });

    // Add close API warehouses only if not already present
    closeApiWarehouses.forEach(warehouse => {
      const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}-${warehouse.date}`;
      if (!warehouseMap.has(key)) {
        warehouseMap.set(key, warehouse);
      }
    });

    return Array.from(warehouseMap.values());
  }

  /**
   * Filters warehouses based on user requirements (warehouseIds and boxTypes)
   */
  private filterByUserRequirements(
    warehouses: Supply[],
    warehouseIds: WarehouseMonitoring[]
  ): Supply[] {
    return warehouses.filter(warehouse => {
      if (!warehouse?.boxTypeID) return false;

      const userRequirement = warehouseIds.find(
        w => w.warehouseId === warehouse.warehouseID
      );
      return userRequirement?.boxTypes?.includes(warehouse.boxTypeID) || false;
    });
  }

  private filterValidWarehouses(warehouses: Supply[]): Supply[] {
    return warehouses.filter(
      warehouse =>
        warehouse.coefficient >= 0 && warehouse.allowUnload === true
    );
  }

  private handleFetchError(error: unknown): void {
    const errorMessage = (error as Error)?.message || '';
    const isKnownError = errorMessage.includes(
      'ошибка получения коэффициентов: internal error: error getting acceptance coefficient report: fail to request supply-manager'
    );

    if (!isKnownError) {
      logger.error('[WarehouseMonitoringV2] Error fetching warehouse data:', error);
    }
  }

  /**
   * Processes warehouse data into availability format
   */
  private processWarehouseData(
    validatedWarehouses: Supply[]
  ): WarehouseAvailability[] {
    const warehouseMap = new Map<string, WarehouseAvailability>();

    validatedWarehouses.forEach(warehouse => {
      const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}`;

      if (!warehouseMap.has(key)) {
        warehouseMap.set(key, {
          warehouseId: warehouse.warehouseID,
          warehouseName: warehouse.warehouseName,
          boxTypeID: warehouse.boxTypeID as BoxTypeId,
          availableDates: [],
        });
      }

      const entry = warehouseMap.get(key)!;
      entry.availableDates.push({
        date: warehouse.date,
        coefficient: warehouse.coefficient,
      });
    });

    // Sort dates chronologically
    return Array.from(warehouseMap.values()).map(warehouse => ({
      ...warehouse,
      availableDates: warehouse.availableDates.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    }));
  }

  /**
   * Processes autobookings and supply triggers
   */
  private async processMonitoringServices(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[]
  ): Promise<void> {
    // Process autobookings only if enabled globally
    const autobookingPromise = isAutobookingProcessingActive()
      ? this.processAutobookings(monitoringUsers, availabilities)
      : Promise.resolve();

    await Promise.all([
      autobookingPromise,
      supplyTriggerMonitoringService.processAvailabilities(
        monitoringUsers,
        availabilities
      ),
    ]);
  }

  /**
   * Process autobookings
   * Phase 5: Autobooking Core - Now implemented
   */
  private async processAutobookings(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[]
  ): Promise<void> {
    logger.info('[WarehouseMonitoringV2] Processing autobookings');
    await autobookingMonitoringService.processAvailabilities(monitoringUsers, availabilities);
  }
}

/**
 * Singleton instance of the warehouse monitoring v2 service
 */
export const warehouseMonitoringV2Service = new WarehouseMonitoringV2Service();
