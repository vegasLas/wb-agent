import { prisma } from '@/config/database';
import { triggerService } from '@/services/external/wb/trigger.service';
import { notificationDispatcher } from '@/services/monitoring/shared/notification-dispatcher.service';
import { logger } from '@/utils/logger';
import { SUPPLY_TYPES, BOX_TYPE_IDS } from '@/constants/triggers';
import type {
  WarehouseAvailability,
  MonitoringUser,
} from '@/services/monitoring/interfaces/trigger-monitoring.interfaces';

/**
 * Service for monitoring supply triggers and notifying users
 * when matching slots become available
 *
 * Architecture: Receives pre-fetched availabilities from warehouse monitoring
 * (does not fetch data itself)
 */
export class SupplyTriggerMonitoringService {
  /**
   * Process availabilities for all monitoring users with triggers
   * Main entry point called from warehouse monitoring service
   */
  async processAvailabilities(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[],
  ): Promise<void> {
    await Promise.all(
      monitoringUsers.map(async (user) => {
        if (!user.supplyTriggers.length) return;
        await this.processUserTriggers(user, availabilities);
      }),
    );
  }

  /**
   * Process triggers for a single user
   */
  private async processUserTriggers(
    user: MonitoringUser,
    availabilities: WarehouseAvailability[],
  ): Promise<void> {
    for (const trigger of user.supplyTriggers) {
      // Skip if trigger is not relevant
      if (trigger.status !== 'RELEVANT') continue;

      // Check if enough time has passed since last notification (rate limiting)
      if (!this.shouldNotifyTrigger(trigger)) continue;

      const matchingAvailabilities = this.filterMatchingAvailabilities(
        trigger,
        availabilities,
      );

      if (matchingAvailabilities.length > 0) {
        // If trigger mode is UNTIL_FOUND, mark as completed
        if (trigger.searchMode === 'UNTIL_FOUND') {
          await triggerService.updateTriggerStatus(trigger.id, 'COMPLETED');
        } else {
          await triggerService.updateLastNotificationTime(trigger.id);
        }
        try {
          await notificationDispatcher.notifyTriggerSlots({
            userId: user.userId,
            chatId: user.chatId,
            availabilities: matchingAvailabilities,
          });
        } catch (error) {
          logger.error(
            `Error sending trigger notification to user ${user.userId}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Check if trigger should notify based on checkInterval
   * Implements rate limiting to prevent notification spam
   */
  private shouldNotifyTrigger(trigger: {
    lastNotificationAt: Date | null;
    checkInterval: number;
  }): boolean {
    return (
      !trigger.lastNotificationAt ||
      Date.now() - trigger.lastNotificationAt.getTime() >=
        trigger.checkInterval * 60 * 1000
    );
  }

  /**
   * Filter availabilities based on trigger criteria
   */
  private filterMatchingAvailabilities(
    trigger: {
      warehouseIds: number[];
      supplyTypes: string[];
      maxCoefficient: number;
      searchMode: string;
      selectedDates?: Date[];
      startDate?: Date | null;
      endDate?: Date | null;
      createdAt?: Date;
    },
    availabilities: WarehouseAvailability[],
  ): WarehouseAvailability[] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return availabilities
      .filter((availability) => {
        // Check if warehouse is in trigger's warehouse list
        if (!trigger.warehouseIds.includes(availability.warehouseId))
          return false;

        // Check if box type matches
        if (
          !trigger.supplyTypes.some(
            (type) =>
              (type === SUPPLY_TYPES.BOX &&
                availability.boxTypeID === BOX_TYPE_IDS.BOX) ||
              (type === SUPPLY_TYPES.MONOPALLETE &&
                availability.boxTypeID === BOX_TYPE_IDS.MONOPALLETE) ||
              (type === SUPPLY_TYPES.SUPERSAFE &&
                availability.boxTypeID === BOX_TYPE_IDS.SUPERSAFE),
          )
        )
          return false;

        // Filter dates based on trigger's search mode and dates
        const validDates = availability.availableDates.filter(
          (availabilityDate) => {
            const dateObj = new Date(availabilityDate.date);
            dateObj.setHours(0, 0, 0, 0);

            // Check coefficient conditions first
            if (
              trigger.maxCoefficient === 0 &&
              availabilityDate.coefficient !== 0
            )
              return false;
            if (
              trigger.maxCoefficient > 0 &&
              availabilityDate.coefficient > trigger.maxCoefficient
            )
              return false;

            // Check date validity based on search mode
            switch (trigger.searchMode) {
              case 'TODAY': {
                return dateObj.getTime() === now.getTime();
              }
              case 'TOMORROW': {
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                return dateObj.getTime() === tomorrow.getTime();
              }
              case 'WEEK': {
                const weekEnd = new Date(trigger.createdAt || now);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return dateObj >= now && dateObj <= weekEnd;
              }
              case 'UNTIL_FOUND': {
                const threeMonthsLater = new Date(now);
                threeMonthsLater.setMonth(now.getMonth() + 3);
                return dateObj >= now && dateObj <= threeMonthsLater;
              }
              case 'CUSTOM_DATES': {
                if (!trigger.selectedDates?.length) return false;
                return trigger.selectedDates.some((selectedDate) => {
                  const selected = new Date(selectedDate);
                  selected.setHours(0, 0, 0, 0);
                  return selected.getTime() === dateObj.getTime();
                });
              }
              case 'RANGE': {
                if (!trigger.startDate || !trigger.endDate) return false;
                const start = new Date(trigger.startDate);
                const end = new Date(trigger.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return dateObj >= start && dateObj <= end;
              }
              default:
                return false;
            }
          },
        );

        // Don't modify original availability, create a copy
        if (validDates.length > 0) {
          availability.availableDates = validDates;
          return true;
        }
        return false;
      })
      .map((availability) => ({
        ...availability,
        // Ensure we have the filtered dates for notification
        availableDates: availability.availableDates,
      }));
  }

  /**
   * Create notification message with grid layout
   */
  private createNotificationMessage(
    availabilities: WarehouseAvailability[],
  ): string {
    return (
      `🔔 Доступные слоты:\n\n` +
      availabilities
        .map((availability) => {
          // Group dates by coefficient
          const groupedDates = availability.availableDates.reduce(
            (acc, date) => {
              const key =
                date.coefficient === 0 ? 'free' : date.coefficient.toString();
              if (!acc[key]) acc[key] = [];

              const dateObj = new Date(date.date);
              const day = dateObj.getDate().toString().padStart(2, '0');
              const month = dateObj
                .toLocaleString('ru-RU', { month: 'short' })
                .toLowerCase();
              acc[key].push(`📅 ${day} ${month} `);
              return acc;
            },
            {} as Record<string, string[]>,
          );

          // Format each coefficient group with grid layout (3 items per row)
          const formatDatesGrid = (dates: string[]) => {
            const ITEMS_PER_ROW = 3;
            return dates
              .reduce((rows: string[][], date, index) => {
                const rowIndex = Math.floor(index / ITEMS_PER_ROW);
                if (!rows[rowIndex]) rows[rowIndex] = [];
                rows[rowIndex].push(date.padEnd(12, ' ')); // Pad each date for alignment
                return rows;
              }, [])
              .map((row) => row.join(''))
              .join('\n');
          };

          // Format each coefficient group
          const formattedGroups = [];
          if (groupedDates['free']) {
            formattedGroups.push(
              `🎉 Бесплатно \n\n${formatDatesGrid(groupedDates['free'])}`,
            );
          }

          Object.entries(groupedDates)
            .filter(([key]) => key !== 'free')
            .forEach(([coeff, dates]) => {
              formattedGroups.push(
                `Коэффициент: ${coeff} 💰\n\n${formatDatesGrid(dates)}`,
              );
            });

          const boxType =
            availability.boxTypeID === BOX_TYPE_IDS.BOX
              ? '*Короб*'
              : availability.boxTypeID === BOX_TYPE_IDS.MONOPALLETE
                ? '*Монопаллет*'
                : '*Суперсейф*';
          return `🏢 ${availability.warehouseName} ${boxType}:\n\n${formattedGroups.join('\n\n')}`;
        })
        .join('\n\n')
    );
  }

}

export const supplyTriggerMonitoringService =
  new SupplyTriggerMonitoringService();
