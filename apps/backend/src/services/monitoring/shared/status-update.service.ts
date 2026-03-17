import { prisma } from "../../../config/database";
import type {
  ISharedStatusUpdateService,
  ItemWithDates,
} from "../interfaces/shared.interfaces";

export class SharedStatusUpdateService implements ISharedStatusUpdateService {
  /**
   * Updates completed dates for both autobooking and reschedule items
   * Handles CUSTOM_DATES, CUSTOM_DATES_SINGLE and other date types
   */
  async updateCompletedDates(
    item: ItemWithDates,
    completedDate: Date,
  ): Promise<{
    updatedCustomDates: Date[];
    updatedCompletedDates: Date[];
    newStatus: string;
  }> {
    // Extract data from item
    const dateType = item.dateType;
    const customDates = item.customDates || [];
    const completedDates = item.completedDates || [];

    // Add to completedDates
    const updatedCompletedDates = [...completedDates, completedDate];

    if (dateType === "CUSTOM_DATES_SINGLE") {
      // Single date completion - mark as COMPLETED immediately after first successful date
      const updatedCustomDates = customDates.filter(
        (date) => date.toDateString() !== completedDate.toDateString(),
      );

      return {
        updatedCustomDates,
        updatedCompletedDates,
        newStatus: "COMPLETED", // Always complete for CUSTOM_DATES_SINGLE
      };
    } else if (dateType === "CUSTOM_DATES") {
      // Multiple dates - complete only when all custom dates are done
      const updatedCustomDates = customDates.filter(
        (date) => date.toDateString() !== completedDate.toDateString(),
      );

      // Determine new status based on remaining dates
      const newStatus =
        updatedCustomDates.length === 0 ? "COMPLETED" : "ACTIVE";

      return {
        updatedCustomDates,
        updatedCompletedDates,
        newStatus,
      };
    } else {
      // For other date types (WEEK, MONTH, CUSTOM_PERIOD), mark as complete
      return {
        updatedCustomDates: customDates,
        updatedCompletedDates,
        newStatus: "COMPLETED",
      };
    }
  }

  /**
   * Updates autobooking status in database
   */
  async updateAutobookingStatus(
    bookingId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void> {
    if (dateType === "CUSTOM_DATES") {
      const autobooking = await prisma.autobooking.findUnique({
        where: { id: bookingId },
        select: {
          dateType: true,
          customDates: true,
          completedDates: true,
        },
      });

      if (!autobooking) return;

      const updateResult = await this.updateCompletedDates(
        autobooking,
        completedDate,
      );

      await prisma.autobooking.update({
        where: { id: bookingId },
        data: {
          completedDates: updateResult.updatedCompletedDates,
          customDates: updateResult.updatedCustomDates,
          status: updateResult.newStatus,
          ...(updateResult.newStatus === "ACTIVE" && { supplyId: null }),
        },
      });
    } else {
      // For other date types, just mark as complete
      await prisma.autobooking.update({
        where: { id: bookingId },
        data: {
          status: "COMPLETED",
          completedDates: [completedDate],
        },
      });
    }
  }

  /**
   * Updates reschedule status in database
   */
  async updateRescheduleStatus(
    rescheduleId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void> {
    if (dateType === "CUSTOM_DATES_SINGLE") {
      const reschedule = await prisma.autobookingReschedule.findUnique({
        where: { id: rescheduleId },
        select: {
          dateType: true,
          customDates: true,
          completedDates: true,
        },
      });

      if (!reschedule) return;

      const updateResult = await this.updateCompletedDates(
        reschedule,
        completedDate,
      );

      await prisma.autobookingReschedule.update({
        where: { id: rescheduleId },
        data: {
          completedDates: updateResult.updatedCompletedDates,
          customDates: updateResult.updatedCustomDates,
          status: updateResult.newStatus,
        },
      });
    } else {
      // For other date types, just mark as complete
      await prisma.autobookingReschedule.update({
        where: { id: rescheduleId },
        data: {
          status: "COMPLETED",
          completedDates: [completedDate],
        },
      });
    }
  }

  /**
   * Generic status update for any item type
   */
  async updateGenericItemStatus(
    tableName: "autobooking" | "autobookingReschedule",
    itemId: string,
    completedDate: Date,
    dateType: string,
  ): Promise<void> {
    if (tableName === "autobooking") {
      await this.updateAutobookingStatus(itemId, completedDate, dateType);
    } else {
      await this.updateRescheduleStatus(itemId, completedDate, dateType);
    }
  }

  /**
   * Checks if an item should be marked as completed
   */
  shouldMarkAsCompleted(
    dateType: string,
    customDates: Date[],
    completedDate: Date,
  ): boolean {
    if (dateType === "CUSTOM_DATES_SINGLE") {
      // For CUSTOM_DATES_SINGLE, always complete after first successful date
      return true;
    } else if (dateType === "CUSTOM_DATES") {
      // For CUSTOM_DATES, complete only when all custom dates are done
      const remainingDates = customDates.filter(
        (date) => date.toDateString() !== completedDate.toDateString(),
      );
      return remainingDates.length === 0;
    }

    // For other date types, always mark as completed after first success
    return true;
  }

  /**
   * Gets the effective dates for an item based on its date type
   */
  getEffectiveDates(
    dateType: string,
    startDate: Date | null,
    endDate: Date | null,
    customDates: Date[],
  ): Date[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateType) {
      case "CUSTOM_DATES":
      case "CUSTOM_DATES_SINGLE":
        return customDates.filter((date) => date >= today);

      case "WEEK":
        if (!startDate) return [];
        return this.generateDateRange(startDate, 7);

      case "MONTH":
        if (!startDate) return [];
        return this.generateDateRange(startDate, 30);

      case "CUSTOM_PERIOD":
        if (!startDate || !endDate) return [];
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return this.generateDateRange(startDate, daysDiff + 1);

      default:
        return [];
    }
  }

  /**
   * Generates a range of dates starting from a date
   */
  private generateDateRange(startDate: Date, days: number): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      if (date >= today) {
        dates.push(date);
      }
    }

    return dates;
  }
}

export const sharedStatusUpdateService = new SharedStatusUpdateService();
