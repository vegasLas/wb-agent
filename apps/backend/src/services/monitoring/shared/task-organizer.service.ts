/**
 * Task Organizer Service - Phase 2: Ban & Error Handling
 * Organizes bookings/reschedules by warehouse-date and optimizes processing order
 * to ensure proxy diversity.
 */

import type {
  ISharedTaskOrganizerService,
  TaskOrganizerUser,
  TaskOrganizerBookingItem,
  TaskOrganizerAvailability,
  Proxy,
  SchedulableItem,
} from './interfaces/sharedInterfaces';
import { sharedAvailabilityFilterService } from './availability-filter.service';
import { createLogger } from '@/utils/logger';
const logger = createLogger('TaskOrganizer');

// Re-export types for convenience
export type GenericUser = TaskOrganizerUser;
export type GenericSchedulableItem = TaskOrganizerBookingItem;
export type GenericAvailability = TaskOrganizerAvailability;

export interface GenericTask<
  TItem = GenericSchedulableItem,
  TUser = GenericUser,
> {
  booking?: TItem;
  reschedule?: TItem;
  user: TUser;
  warehouseName: string;
  coefficient: number;
  availability: GenericAvailability;
}

export class SharedTaskOrganizerService implements ISharedTaskOrganizerService {
  /**
   * Organizes bookings by warehouse-date combination ensuring proxy/user diversity
   */
  organizeBookingsByWarehouseDate<
    TBooking extends GenericSchedulableItem,
    TUser extends GenericUser,
  >(
    monitoringUsers: Array<TUser & { autobookings: TBooking[] }>,
    availabilities: GenericAvailability[],
  ): Map<string, Array<GenericTask<TBooking, TUser>>[]> {
    const warehouseDateTasksMap = new Map<
      string,
      Array<GenericTask<TBooking, TUser>>
    >();
    const processedItemDates = new Set<string>();

    logger.debug(
      `[Organize] Starting with ${monitoringUsers.length} users, ${availabilities.length} availabilities`
    );

    let skippedUsers = 0;
    let processedUsers = 0;

    for (const user of monitoringUsers) {
      if (!this.isValidUserForProcessing(user)) {
        logger.debug(
          `[Organize] Skipping user ${user.userId}: invalid for processing ` +
            `(chatId=${(user as GenericUser & { chatId?: string }).chatId}, ` +
            `autobookings=${user.autobookings?.length}, accounts=${Object.keys(user.accounts).length})`
        );
        skippedUsers++;
        continue;
      }
      processedUsers++;

      this.processUserBookings(
        user,
        availabilities,
        warehouseDateTasksMap,
        processedItemDates,
      );
    }

    logger.debug(
      `[Organize] User processing complete: ${processedUsers} processed, ${skippedUsers} skipped`
    );

    this.optimizeAllTaskOrders(warehouseDateTasksMap);

    const result = this.groupTasksByProxy(warehouseDateTasksMap);
    logger.debug(
      `[Organize] Final result: ${result.size} warehouse-date combinations`
    );
    for (const [key, groups] of result.entries()) {
      logger.debug(
        `[Organize]   ${key}: ${groups.length} proxy groups, ${groups.flat().length} total tasks`
      );
    }

    return result;
  }

  /**
   * Organizes reschedules by warehouse-date combination ensuring proxy/user diversity
   */
  organizeReschedulesByWarehouseDate<
    TReschedule extends GenericSchedulableItem & { status: string },
    TUser extends GenericUser,
  >(
    monitoringUsers: Array<TUser & { reschedules?: TReschedule[] }>,
    availabilities: GenericAvailability[],
  ): Map<string, Array<GenericTask<TReschedule, TUser>>[]> {
    const warehouseDateTasksMap = new Map<
      string,
      Array<GenericTask<TReschedule, TUser>>
    >();

    for (const user of monitoringUsers) {
      if (!user.reschedules) continue;

      this.processUserReschedules(user, availabilities, warehouseDateTasksMap);
    }

    this.optimizeAllTaskOrders(warehouseDateTasksMap);

    return this.groupTasksByProxy(warehouseDateTasksMap);
  }

  /**
   * Validates if user can be processed
   */
  private isValidUserForProcessing<TUser extends GenericUser>(
    user: TUser & { autobookings?: unknown[] },
  ): boolean {
    return !!(
      user.chatId &&
      user.autobookings?.length &&
      Object.keys(user.accounts).length > 0
    );
  }

  /**
   * Processes all bookings for a specific user
   */
  private processUserBookings<
    TBooking extends GenericSchedulableItem,
    TUser extends GenericUser,
  >(
    user: TUser & { autobookings: TBooking[] },
    availabilities: GenericAvailability[],
    warehouseDateTasksMap: Map<string, Array<GenericTask<TBooking, TUser>>>,
    processedItemDates: Set<string>,
  ): void {
    logger.debug(
      `[ProcessUser] User ${user.userId}: Processing ${user.autobookings.length} bookings`
    );

    for (const booking of user.autobookings) {
      const genericBooking =
        sharedAvailabilityFilterService.convertToSchedulableItem(
          booking as unknown as SchedulableItem & Record<string, unknown>,
        );
      
      logger.debug(
        `[ProcessUser] User ${user.userId}: Processing booking ${(booking as GenericSchedulableItem).id}, ` +
          `warehouseId=${(booking as GenericSchedulableItem).warehouseId}, ` +
          `supplyType=${(booking as GenericSchedulableItem).supplyType}`
      );
      
      const matchingResults =
        sharedAvailabilityFilterService.filterMatchingAvailabilities(
          genericBooking,
          availabilities,
        );

      logger.debug(
        `[ProcessUser] User ${user.userId}, booking ${(booking as GenericSchedulableItem).id}: ` +
          `${matchingResults.length} matching availabilities`
      );

      for (const { availability, matchingDates } of matchingResults) {
        this.processTaskDates(
          booking,
          user,
          availability,
          matchingDates,
          warehouseDateTasksMap,
          processedItemDates,
          'booking',
        );
      }
    }
  }

  /**
   * Processes all reschedules for a specific user
   */
  private processUserReschedules<
    TReschedule extends GenericSchedulableItem & { status: string },
    TUser extends GenericUser,
  >(
    user: TUser & { reschedules?: TReschedule[] },
    availabilities: GenericAvailability[],
    warehouseDateTasksMap: Map<string, Array<GenericTask<TReschedule, TUser>>>,
  ): void {
    if (!user.reschedules) return;

    for (const reschedule of user.reschedules) {
      if (reschedule.status !== 'ACTIVE') continue;

      const genericReschedule =
        sharedAvailabilityFilterService.convertToSchedulableItem(
          reschedule as unknown as SchedulableItem & Record<string, unknown>,
        );
      const matchingResults =
        sharedAvailabilityFilterService.filterMatchingAvailabilities(
          genericReschedule,
          availabilities,
        );

      for (const { availability, matchingDates } of matchingResults) {
        for (const { effectiveDate, availableDate } of matchingDates) {
          const warehouseDateKey = `${reschedule.warehouseId}-${effectiveDate.toISOString()}-${reschedule.supplyType}`;

          const task: GenericTask<TReschedule, TUser> = {
            reschedule,
            user,
            warehouseName: availability.warehouseName,
            coefficient: availableDate.coefficient,
            availability,
          };

          if (!warehouseDateTasksMap.has(warehouseDateKey)) {
            warehouseDateTasksMap.set(warehouseDateKey, []);
          }

          warehouseDateTasksMap.get(warehouseDateKey)!.push(task);
        }
      }
    }
  }

  /**
   * Processes task dates for a specific booking/reschedule
   */
  private processTaskDates<
    TItem extends GenericSchedulableItem,
    TUser extends GenericUser,
  >(
    item: TItem,
    user: TUser,
    availability: GenericAvailability,
    matchingDates: Array<{
      effectiveDate: Date;
      availableDate: { date: string; coefficient: number };
    }>,
    warehouseDateTasksMap: Map<string, Array<GenericTask<TItem, TUser>>>,
    processedItemDates: Set<string>,
    itemType: 'booking' | 'reschedule',
  ): void {
    for (const { effectiveDate, availableDate } of matchingDates) {
      const warehouseDateKey = `${item.warehouseId}-${effectiveDate.toDateString()}-${item.supplyType}`;
      const itemDateKey = `${item.id}-${effectiveDate.toDateString()}`;

      if (processedItemDates.has(itemDateKey)) {
        continue;
      }

      const task: GenericTask<TItem, TUser> = {
        ...(itemType === 'booking' ? { booking: item } : { reschedule: item }),
        user,
        warehouseName: availability.warehouseName,
        coefficient: availableDate.coefficient,
        availability,
      } as GenericTask<TItem, TUser>;

      if (!warehouseDateTasksMap.has(warehouseDateKey)) {
        warehouseDateTasksMap.set(warehouseDateKey, []);
      }

      warehouseDateTasksMap.get(warehouseDateKey)!.push(task);
      processedItemDates.add(itemDateKey);
    }
  }

  /**
   * Optimizes task order for all warehouse-date combinations
   */
  private optimizeAllTaskOrders<
    T extends { coefficient: number; user: { proxy?: Proxy | string | null } },
  >(warehouseDateTasksMap: Map<string, T[]>): void {
    for (const [warehouseDateKey, tasks] of warehouseDateTasksMap.entries()) {
      warehouseDateTasksMap.set(
        warehouseDateKey,
        this.optimizeTaskOrder(tasks),
      );
    }
  }

  /**
   * Convenience method for autobooking organization that returns BookingTask compatible structure
   */
  organizeAutobookingsByWarehouseDate<
    TBooking extends TaskOrganizerBookingItem,
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { autobookings: TBooking[] }>,
    availabilities: Array<{
      warehouseId: number;
      warehouseName: string;
      boxTypeID: 2 | 5 | 6;
      availableDates: Array<{ date: string; coefficient: number }>;
    }>,
  ): Map<
    string,
    Array<
      {
        booking: TBooking;
        user: TUser;
        warehouseName: string;
        coefficient: number;
        availability: {
          warehouseId: number;
          warehouseName: string;
          boxTypeID: 2 | 5 | 6;
          availableDates: Array<{ date: string; coefficient: number }>;
        };
      }[]
    >
  > {
    const result = this.organizeBookingsByWarehouseDate(
      monitoringUsers,
      availabilities,
    );

    // Convert the generic tasks to booking-specific format
    const bookingTasksMap = new Map<
      string,
      Array<
        {
          booking: TBooking;
          user: TUser;
          warehouseName: string;
          coefficient: number;
          availability: {
            warehouseId: number;
            warehouseName: string;
            boxTypeID: 2 | 5 | 6;
            availableDates: Array<{ date: string; coefficient: number }>;
          };
        }[]
      >
    >();

    for (const [key, taskGroups] of result.entries()) {
      const bookingGroups = taskGroups.map((group) =>
        group.map((task) => ({
          booking: task.booking!,
          user: task.user,
          warehouseName: task.warehouseName,
          coefficient: task.coefficient,
          availability: task.availability,
        })),
      );
      bookingTasksMap.set(key, bookingGroups);
    }

    return bookingTasksMap;
  }

  /**
   * Convenience method for reschedule organization that returns RescheduleBookingTask compatible structure
   */
  organizeReschedulesByWarehouseDateTyped<
    TReschedule extends TaskOrganizerBookingItem & { status: string },
    TUser extends TaskOrganizerUser,
  >(
    monitoringUsers: Array<TUser & { reschedules?: TReschedule[] }>,
    availabilities: Array<{
      warehouseId: number;
      warehouseName: string;
      boxTypeID: 2 | 5 | 6;
      availableDates: Array<{ date: string; coefficient: number }>;
    }>,
  ) {
    const result = this.organizeReschedulesByWarehouseDate(
      monitoringUsers,
      availabilities,
    );

    // Convert the generic tasks to reschedule-specific format
    const rescheduleTasksMap = new Map<
      string,
      Array<
        {
          reschedule: TReschedule;
          user: TUser;
          warehouseName: string;
          coefficient: number;
          availability: {
            warehouseId: number;
            warehouseName: string;
            boxTypeID: 2 | 5 | 6;
            availableDates: Array<{ date: string; coefficient: number }>;
          };
        }[]
      >
    >();

    for (const [key, taskGroups] of result.entries()) {
      const rescheduleGroups = taskGroups.map((group) =>
        group.map((task) => ({
          reschedule: task.reschedule!,
          user: task.user,
          warehouseName: task.warehouseName,
          coefficient: task.coefficient,
          availability: task.availability,
        })),
      );
      rescheduleTasksMap.set(key, rescheduleGroups);
    }

    return rescheduleTasksMap;
  }

  /**
   * Groups tasks so that each group contains tasks with different proxies
   */
  groupTasksByProxy<T extends { user: { proxy?: Proxy | string | null } }>(
    warehouseDateTasksMap: Map<string, T[]>,
  ): Map<string, T[][]> {
    const groupedMap = new Map<string, T[][]>();

    for (const [warehouseDateKey, tasks] of warehouseDateTasksMap.entries()) {
      if (tasks.length === 0) {
        groupedMap.set(warehouseDateKey, []);
        continue;
      }

      const groups: T[][] = [];

      for (const task of tasks) {
        const taskProxyString = this.getProxyString(task);

        // Find a group that doesn't already have this proxy
        let foundGroup = false;
        for (const group of groups) {
          const groupProxies = group.map((t) => this.getProxyString(t));
          if (!groupProxies.includes(taskProxyString)) {
            group.push(task);
            foundGroup = true;
            break;
          }
        }

        // If no suitable group found, create a new one
        if (!foundGroup) {
          groups.push([task]);
        }
      }

      groupedMap.set(warehouseDateKey, groups);
    }

    return groupedMap;
  }

  /**
   * Optimizes task order to ensure proxy and user diversity
   */
  optimizeTaskOrder<
    T extends { coefficient: number; user: { proxy?: Proxy | string | null } },
  >(tasks: T[]): T[] {
    if (tasks.length <= 1) return tasks;

    // Sort by coefficient (ascending - prefer lower coefficients)
    const sortedTasks = [...tasks].sort(
      (a, b) => a.coefficient - b.coefficient,
    );

    // Group by proxy to ensure distribution
    const proxyGroups = new Map<string, T[]>();

    for (const task of sortedTasks) {
      const proxyString = this.getProxyString(task);
      if (!proxyGroups.has(proxyString)) {
        proxyGroups.set(proxyString, []);
      }
      proxyGroups.get(proxyString)!.push(task);
    }

    // Interleave tasks from different proxy groups
    const result: T[] = [];
    const proxies = Array.from(proxyGroups.keys());
    const maxLength = Math.max(
      ...Array.from(proxyGroups.values()).map((group) => group.length),
    );

    for (let i = 0; i < maxLength; i++) {
      for (const proxy of proxies) {
        const group = proxyGroups.get(proxy)!;
        if (i < group.length) {
          result.push(group[i]);
        }
      }
    }

    return result;
  }

  /**
   * Generates proxy string for tracking
   */
  getProxyString<T extends { user: { proxy?: Proxy | string | null } }>(
    task: T,
  ): string {
    if (!task.user.proxy) return 'no-proxy';

    // Handle proxy object with ip and port properties
    if (
      typeof task.user.proxy === 'object' &&
      task.user.proxy.ip &&
      task.user.proxy.port
    ) {
      return `${task.user.proxy.ip}:${task.user.proxy.port}`;
    }

    // Handle proxy as string
    if (typeof task.user.proxy === 'string') {
      return task.user.proxy;
    }

    return 'no-proxy';
  }
}

export const sharedTaskOrganizerService = new SharedTaskOrganizerService();
