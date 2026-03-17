import { prisma } from "../../config/database";
import type { Autobooking, SupplyTrigger, AutobookingReschedule } from "@prisma/client";
import type { Supply, UserEnvInfo } from "../../types/wb";
import { freeWarehouseService } from "../free-warehouse.service";
import { closeApiService } from "../close-api.service";
import { fakeDataDetectionService } from "./fake-data-detection.service";
import { supplyTriggerMonitoringService } from "./supply-trigger-monitoring.service";
import { logger } from "../../utils/logger";

// Type definitions
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
  envInfo: unknown;
  chatId?: string | null;
  accounts: AccountData[];
}

interface MonitoringUser {
  userId: number;
  userAgent: string;
  proxy: unknown;
  chatId?: string;
  autobookings: Autobooking[];
  supplyTriggers: SupplyTrigger[];
  reschedules: AutobookingReschedule[];
  accounts: { [accountId: string]: string[] };
}

type WarehouseMonitoring = {
  warehouseId: number;
  boxTypes: (2 | 5 | 6)[];
};

interface WarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: 2 | 5 | 6;
  availableDates: {
    date: string;
    coefficient: number;
  }[];
}

type BoxTypeId = 2 | 5 | 6;

interface CreateMonitoringUserParams {
  user: UserData;
  autobookings?: Autobooking[];
  supplyTriggers?: SupplyTrigger[];
  reschedules?: AutobookingReschedule[];
}

interface GroupUserBookingsAndTriggersParams {
  autobookings: (Autobooking & { user: UserData })[];
  supplyTriggers: (SupplyTrigger & { user: UserData })[];
  reschedules: (AutobookingReschedule & { user: UserData })[];
}

interface ProcessItemsParams<TInput, TProcessed> {
  items: TInput[];
  processor: (
    item: TInput,
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

type SupplyType = "BOX" | "MONOPALLETE" | "SUPERSAFE";

const SUPPLY_TYPES: Record<string, SupplyType> = {
  BOX: "BOX",
  MONOPALLETE: "MONOPALLETE",
  SUPERSAFE: "SUPERSAFE",
};

const getBoxTypeFromSupplyType = (supplyType: string): BoxTypeId => {
  switch (supplyType) {
    case SUPPLY_TYPES.BOX:
      return 2;
    case SUPPLY_TYPES.MONOPALLETE:
      return 5;
    case SUPPLY_TYPES.SUPERSAFE:
      return 6;
    default:
      return 2;
  }
};

export class WarehouseMonitoringV2Service {
  /**
   * Collects active monitoring users with their autobookings and supply triggers
   */
  private async collectMonitoringUsers(): Promise<MonitoringUser[]> {
    try {
      const technicalModeUserId = process.env.TECHNICAL_MODE_USER_ID;
      let activeUserCondition: {
        chatId?: { not: null };
        subscriptionExpiresAt?: { gt: Date };
        id?: number;
      } = {
        chatId: { not: null },
        subscriptionExpiresAt: { gt: new Date() },
      };

      if (technicalModeUserId) {
        const userId = parseInt(technicalModeUserId);
        if (!isNaN(userId)) {
          activeUserCondition = { id: userId };
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

      const [autobookings, supplyTriggers, reschedules] = await Promise.all([
        prisma.autobooking.findMany({
          where: {
            status: "ACTIVE",
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
            status: "ACTIVE",
            user: activeUserCondition,
          },
          include: { user: { select: userSelection } },
        }),
      ]);

      return this.groupUserBookingsAndTriggers({
        autobookings: autobookings as (Autobooking & { user: UserData })[],
        supplyTriggers: supplyTriggers as (SupplyTrigger & { user: UserData })[],
        reschedules: reschedules as (AutobookingReschedule & { user: UserData })[],
      });
    } catch (error) {
      logger.error("Error collecting monitoring users:", error);
      return [];
    }
  }

  /**
   * Groups autobookings, triggers, and reschedules by user
   */
  private groupUserBookingsAndTriggers(
    params: GroupUserBookingsAndTriggersParams,
  ): MonitoringUser[] {
    const { autobookings, supplyTriggers, reschedules } = params;
    const userMap = new Map<number, MonitoringUser>();

    this.processItems({
      items: autobookings,
      processor: this.validateEntityForMonitoring.bind(this),
      userMap,
      arrayKey: "autobookings",
    });

    this.processItems({
      items: supplyTriggers,
      processor: this.prepareSupplyTrigger.bind(this),
      userMap,
      arrayKey: "supplyTriggers",
    });

    this.processItems({
      items: reschedules,
      processor: this.validateEntityForMonitoring.bind(this),
      userMap,
      arrayKey: "reschedules",
    });

    return Array.from(userMap.values());
  }

  /**
   * Generic helper to validate entity
   */
  private validateEntityForMonitoring<T extends { user: UserData; supplierId: string }>(
    entity: T,
  ): { user: UserData; processedItem: T } | null {
    const { user } = entity;

    if (!this.isValidUser(user)) return null;
    if (!this.hasValidAccount(user.accounts, entity.supplierId)) return null;

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
    supplierId: string,
  ): boolean {
    const matchingAccount = this.findMatchingAccount(accounts, supplierId);
    return !!matchingAccount?.wbCookies;
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
        }),
      );
    }
  }

  /**
   * Generic helper to process items with map-filter-forEach pattern
   */
  private processItems<TInput, TProcessed>(
    params: ProcessItemsParams<TInput, TProcessed>,
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
    trigger: SupplyTrigger & { user: UserData },
  ): { user: UserData; processedItem: SupplyTrigger } | null {
    const { user } = trigger;

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
   * Helper methods for validation and data processing
   */
  private isValidUser(user: UserData): boolean {
    return !!user.envInfo;
  }

  private findMatchingAccount(
    accounts: AccountData[],
    supplierId: string,
  ): AccountData | undefined {
    return accounts?.find((account) =>
      account.suppliers.some(
        (supplier: SupplierData) => supplier.supplierId === supplierId,
      ),
    );
  }

  private shouldNotifyTrigger(trigger: SupplyTrigger): boolean {
    return (
      !trigger.lastNotificationAt ||
      Date.now() - trigger.lastNotificationAt.getTime() >=
        trigger.checkInterval * 60 * 1000
    );
  }

  private createMonitoringUser(
    params: CreateMonitoringUserParams,
  ): MonitoringUser {
    const {
      user,
      autobookings = [],
      supplyTriggers = [],
      reschedules = [],
    } = params;

    const envInfo = user.envInfo as UserEnvInfo;

    const accounts: { [accountId: string]: string[] } = {};
    if (user.accounts && user.accounts.length > 0) {
      user.accounts.forEach((account: AccountData) => {
        accounts[account.id] = account.suppliers.map(
          (supplier: SupplierData) => supplier.supplierId,
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

    users.forEach((user) => {
      this.collectWarehouseDataFromItems(
        user.autobookings,
        warehouseMap,
        this.extractAutobookingWarehouseData,
      );
      this.collectWarehouseDataFromItems(
        user.supplyTriggers,
        warehouseMap,
        this.extractTriggerWarehouseData,
      );
      this.collectWarehouseDataFromItems(
        user.reschedules,
        warehouseMap,
        this.extractRescheduleWarehouseData,
      );
    });

    return Array.from(warehouseMap.entries()).map(
      ([warehouseId, boxTypes]) => ({
        warehouseId,
        boxTypes: Array.from(boxTypes),
      }),
    );
  }

  /**
   * Generic method to collect warehouse data from any type of items
   */
  private collectWarehouseDataFromItems<T>(
    items: T[],
    warehouseMap: Map<number, Set<BoxTypeId>>,
    extractor: (item: T) => { warehouseId: number; boxTypeId: BoxTypeId }[],
  ): void {
    items.flatMap(extractor).forEach(({ warehouseId, boxTypeId }) => {
      this.addWarehouseToMap(warehouseMap, warehouseId, boxTypeId);
    });
  }

  private extractAutobookingWarehouseData = (
    booking: Autobooking,
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
    trigger: SupplyTrigger,
  ): { warehouseId: number; boxTypeId: BoxTypeId }[] => {
    return trigger.warehouseIds.flatMap((warehouseId) =>
      trigger.supplyTypes.map((type) => ({
        warehouseId,
        boxTypeId: getBoxTypeFromSupplyType(type),
      })),
    );
  };

  private extractRescheduleWarehouseData = (
    reschedule: AutobookingReschedule,
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
    boxTypeId: BoxTypeId,
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
      const freeApiWarehouses = this.fetchFromFreeApi();
      const closeApiWarehouses = this.fetchFromCloseApi();

      const problematicCheck =
        fakeDataDetectionService.checkProblematicWarehouses(freeApiWarehouses);

      if (problematicCheck.shouldSkip) {
        logger.log("problematicCheck.shouldSkip: ", problematicCheck.shouldSkip);
        return [];
      }

      const mergedWarehouses = this.mergeAndDeduplicateWarehouses(
        freeApiWarehouses,
        closeApiWarehouses,
      );

      const userFilteredWarehouses = this.filterByUserRequirements(
        mergedWarehouses,
        warehouseIds,
      );

      return this.filterValidWarehouses(userFilteredWarehouses);
    } catch (error) {
      this.handleFetchError(error);
      return [];
    }
  }

  private fetchFromFreeApi(): Supply[] {
    const warehouses = freeWarehouseService.getAllCachedWarehouses();

    return warehouses.filter(
      (warehouse) =>
        warehouse?.boxTypeID &&
        warehouse.allowUnload === true &&
        warehouse.coefficient >= 0,
    );
  }

  private fetchFromCloseApi(): Supply[] {
    const closeApiData = closeApiService.getCachedData();

    return closeApiData.filter(
      (warehouse) =>
        warehouse?.boxTypeID &&
        warehouse.allowUnload === true &&
        warehouse.coefficient >= 0,
    );
  }

  /**
   * Merges warehouses from both APIs and removes duplicates
   */
  private mergeAndDeduplicateWarehouses(
    freeApiWarehouses: Supply[],
    closeApiWarehouses: Supply[],
  ): Supply[] {
    const warehouseMap = new Map<string, Supply>();

    freeApiWarehouses.forEach((warehouse) => {
      const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}-${warehouse.date}`;
      warehouseMap.set(key, warehouse);
    });

    closeApiWarehouses.forEach((warehouse) => {
      const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}-${warehouse.date}`;
      if (!warehouseMap.has(key)) {
        warehouseMap.set(key, warehouse);
      }
    });

    return Array.from(warehouseMap.values());
  }

  /**
   * Filters warehouses based on user requirements
   */
  private filterByUserRequirements(
    warehouses: Supply[],
    warehouseIds: WarehouseMonitoring[],
  ): Supply[] {
    return warehouses.filter((warehouse) => {
      if (!warehouse?.boxTypeID) return false;

      const userRequirement = warehouseIds.find(
        (w) => w.warehouseId === warehouse.warehouseID,
      );
      return userRequirement?.boxTypes?.includes(warehouse.boxTypeID) || false;
    });
  }

  private filterValidWarehouses(warehouses: Supply[]): Supply[] {
    return warehouses.filter(
      (warehouse) =>
        warehouse.coefficient >= 0 && warehouse.allowUnload === true,
    );
  }

  private handleFetchError(error: unknown): void {
    const errorMessage = (error as Error)?.message || "";
    const isKnownError = errorMessage.includes(
      "ошибка получения коэффициентов: internal error: error getting acceptance coefficient report: fail to request supply-manager",
    );

    if (!isKnownError) {
      logger.error("Error fetching warehouse data:", error);
    }
  }

  /**
   * Processes warehouse data into availability format
   */
  private processWarehouseData(
    validatedWarehouses: Supply[],
  ): WarehouseAvailability[] {
    const warehouseMap = new Map<string, WarehouseAvailability>();

    validatedWarehouses.forEach((warehouse) => {
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

    return Array.from(warehouseMap.values()).map((warehouse) => ({
      ...warehouse,
      availableDates: warehouse.availableDates.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    }));
  }

  /**
   * Main monitoring method - orchestrates the entire monitoring process
   */
  async monitorWarehouses(): Promise<void> {
    try {
      const monitoringUsers = await this.collectMonitoringUsers();
      if (monitoringUsers.length === 0) return;

      const warehouses = this.collectWarehouseData(monitoringUsers);
      if (warehouses.length === 0) return;

      const validatedWarehouses = this.fetchAllWarehouses(warehouses);
      if (validatedWarehouses.length === 0) return;

      const availabilities = this.processWarehouseData(validatedWarehouses);

      await this.processMonitoringServices(monitoringUsers, availabilities);
    } catch (error) {
      logger.error("Error in warehouse monitoring:", error);
    }
  }

  /**
   * Processes autobookings and supply triggers
   */
  private async processMonitoringServices(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[],
  ): Promise<void> {
    await Promise.all([
      supplyTriggerMonitoringService.processAvailabilities(
        monitoringUsers,
        availabilities,
      ),
    ]);
  }
}

export const warehouseMonitoringV2Service = new WarehouseMonitoringV2Service();
