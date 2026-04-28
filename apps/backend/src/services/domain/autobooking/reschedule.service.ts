import { prisma } from '@/config/database';
import type { AutobookingReschedule } from '@prisma/client';
import { AutobookingUpdateError } from './autobooking.service';
import { RESCHEDULE_SLOTS } from '@/constants/payments';
import { calculateSlotCount } from '@/utils/slot-utils';

/**
 * Valid date types for reschedule
 */
export type RescheduleDateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_PERIOD'
  | 'CUSTOM_DATES_SINGLE';

/**
 * Data Transfer Object for creating reschedule
 */
export interface CreateRescheduleDto {
  warehouseId: number;
  dateType: RescheduleDateType;
  startDate?: Date | null;
  endDate?: Date | null;
  currentDate: Date;
  customDates?: Date[];
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId: string;
  maxCoefficient: number;
}

/**
 * Data Transfer Object for updating reschedule
 */
export interface UpdateRescheduleDto {
  id: string;
  warehouseId?: number;
  dateType?: RescheduleDateType;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates?: Date[];
  maxCoefficient?: number;
  supplyType?: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

/**
 * Service responsible for reschedule CRUD operations
 */
export class RescheduleService {
  /**
   * Get reschedules for a user with counts by status
   * Includes: ACTIVE, COMPLETED, ARCHIVED
   */
  async getUserReschedules(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<{
    success: boolean;
    counts: Record<string, number>;
    items: AutobookingReschedule[];
    currentPage: number;
    nextPage: number | null;
    total: number;
  }> {
    const skip = (page - 1) * limit;

    // Get all reschedules for the user
    const items = await prisma.autobookingReschedule.findMany({
      where: { userId },
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
    });

    // Get counts for each status using groupBy
    const counts = await prisma.autobookingReschedule.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    // Convert counts to proper format
    const statusCounts = counts.reduce(
      (
        acc: Record<string, number>,
        curr: { status: string; _count: { status: number } },
      ) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Ensure all statuses are represented
    const allCounts = {
      ACTIVE: statusCounts['ACTIVE'] || 0,
      COMPLETED: statusCounts['COMPLETED'] || 0,
      ARCHIVED: statusCounts['ARCHIVED'] || 0,
    };

    // Calculate total and check for next page
    const total = await prisma.autobookingReschedule.count({
      where: { userId },
    });
    const hasNextPage = total > page * limit;

    return {
      success: true,
      counts: allCounts,
      items,
      currentPage: page,
      nextPage: hasNextPage ? page + 1 : null,
      total,
    };
  }

  /**
   * Create a new reschedule
   * Checks subscription, validates account, checks slot limits
   */
  async createReschedule(
    userId: number,
    selectedAccountId: string | null,
    data: CreateRescheduleDto,
  ): Promise<AutobookingReschedule> {
    // Get user for subscription and slot check
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AutobookingUpdateError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Get user's selected account
    if (!selectedAccountId) {
      throw new AutobookingUpdateError(
        'User must select an account first',
        'NO_ACCOUNT_SELECTED',
        400,
      );
    }

    const account = await prisma.account.findFirst({
      where: {
        id: selectedAccountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new AutobookingUpdateError(
        'Selected account not found',
        'ACCOUNT_NOT_FOUND',
        404,
      );
    }

    if (!account.selectedSupplierId) {
      throw new AutobookingUpdateError(
        'Selected account does not have a supplier configured',
        'NO_SUPPLIER',
        400,
      );
    }

    // Validate supply type
    const validSupplyTypes = ['BOX', 'MONOPALLETE', 'SUPERSAFE'];
    if (!validSupplyTypes.includes(data.supplyType)) {
      throw new AutobookingUpdateError(
        'Valid supplyType is required (BOX, MONOPALLETE, or SUPERSAFE)',
        'INVALID_SUPPLY_TYPE',
        400,
      );
    }

    // Normalize dates to UTC midnight (matching deprecated project)
    const normalizedStartDate = data.startDate
      ? new Date(new Date(data.startDate).setUTCHours(0, 0, 0, 0))
      : null;
    const normalizedEndDate = data.endDate
      ? new Date(new Date(data.endDate).setUTCHours(0, 0, 0, 0))
      : null;
    const normalizedCurrentDate = new Date(
      new Date(data.currentDate).setUTCHours(0, 0, 0, 0),
    );
    const normalizedCustomDates = Array.isArray(data.customDates)
      ? data.customDates.map((date: string | Date) =>
          typeof date === 'string'
            ? new Date(new Date(date).setUTCHours(0, 0, 0, 0))
            : new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
        )
      : [];

    const maxSlots = RESCHEDULE_SLOTS[user.subscriptionTier ?? 'FREE'];

    // Check active reschedule slot limit (sum of slots) and create atomically
    const reschedule = await prisma.$transaction(async (tx) => {
      const activeReschedules = await tx.autobookingReschedule.findMany({
        where: { userId, status: { in: ['PENDING', 'ACTIVE'] } },
        select: { dateType: true, customDates: true },
      });
      const usedSlots = activeReschedules.reduce(
        (sum, r) => sum + calculateSlotCount(r.dateType, r.customDates as Date[]),
        0,
      );
      const newSlots = calculateSlotCount(data.dateType, normalizedCustomDates);
      if (usedSlots + newSlots > maxSlots) {
        throw new AutobookingUpdateError(
          `Достигнут лимит активных перепланирований (${maxSlots}). Обновите подписку для увеличения лимита.`,
          'SLOT_LIMIT_REACHED',
          403,
        );
      }
      return tx.autobookingReschedule.create({
        data: {
          userId,
          supplierId: account.selectedSupplierId,
          warehouseId: data.warehouseId,
          dateType: data.dateType,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          currentDate: normalizedCurrentDate,
          customDates: normalizedCustomDates,
          maxCoefficient: data.maxCoefficient || 0,
          supplyType: data.supplyType,
          supplyId: data.supplyId,
        },
      });
    });

    return reschedule;
  }

  /**
   * Update a reschedule
   * Validates ownership, prevents updating completed reschedules
   */
  async updateReschedule(
    userId: number,
    data: UpdateRescheduleDto,
  ): Promise<AutobookingReschedule> {
    // Find the existing reschedule record
    const existingReschedule = await prisma.autobookingReschedule.findFirst({
      where: {
        id: data.id,
        userId,
      },
    });

    if (!existingReschedule) {
      throw new AutobookingUpdateError(
        'Autobooking reschedule not found',
        'RESCHEDULE_NOT_FOUND',
        404,
      );
    }

    // Prevent updating completed reschedules
    if (existingReschedule.status === 'COMPLETED') {
      throw new AutobookingUpdateError(
        'Завершенные перепланирования нельзя изменять',
        'COMPLETED_RESCHEDULE_IMMUTABLE',
        400,
      );
    }

    // Prepare update data
    const updateData: Partial<AutobookingReschedule> = {};

    if (data.warehouseId !== undefined)
      updateData.warehouseId = data.warehouseId;
    if (data.dateType !== undefined) updateData.dateType = data.dateType;
    if (data.maxCoefficient !== undefined)
      updateData.maxCoefficient = data.maxCoefficient;
    if (data.supplyId !== undefined) updateData.supplyId = data.supplyId;
    if (data.status !== undefined) updateData.status = data.status;

    // Handle supply type with validation
    if (data.supplyType !== undefined) {
      const validSupplyTypes = ['BOX', 'MONOPALLETE', 'SUPERSAFE'];
      if (!validSupplyTypes.includes(data.supplyType)) {
        throw new AutobookingUpdateError(
          'Valid supplyType is required (BOX, MONOPALLETE, or SUPERSAFE)',
          'INVALID_SUPPLY_TYPE',
          400,
        );
      }
      updateData.supplyType = data.supplyType;
    }

    // Handle date fields with UTC normalization
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate
        ? new Date(new Date(data.startDate).setUTCHours(0, 0, 0, 0))
        : null;
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate
        ? new Date(new Date(data.endDate).setUTCHours(0, 0, 0, 0))
        : null;
    }

    // Handle custom dates array
    if (data.customDates !== undefined) {
      updateData.customDates = data.customDates.map(
        (date) => new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
      );
    }

    // Validate required fields based on dateType
    this.validateDateTypeFields(updateData, existingReschedule);

    // Validate that reschedule dates are older than supply date
    await this.validateRescheduleDates(updateData, existingReschedule);

    // Check slot limits on status activation or on expanding custom dates
    await this.checkUpdateSlotLimits(userId, existingReschedule, updateData);

    // Update the reschedule record
    return prisma.autobookingReschedule.update({
      where: { id: data.id },
      data: updateData,
    });
  }

  /**
   * Delete a reschedule
   * Slots are freed automatically when the record is deleted
   */
  async deleteReschedule(
    userId: number,
    rescheduleId: string,
  ): Promise<{ message: string }> {
    const reschedule = await prisma.autobookingReschedule.findFirst({
      where: {
        id: rescheduleId,
        userId,
      },
    });

    if (!reschedule) {
      throw new AutobookingUpdateError(
        'Autobooking reschedule not found',
        'RESCHEDULE_NOT_FOUND',
        404,
      );
    }

    // Prevent deletion of COMPLETED reschedules only
    if (reschedule.status === 'COMPLETED') {
      throw new AutobookingUpdateError(
        'Нельзя удалить перенос автобронирования со статусом COMPLETED',
        'COMPLETED_RESCHEDULE_CANNOT_DELETE',
        403,
      );
    }

    // Delete reschedule
    await prisma.autobookingReschedule.delete({
      where: { id: rescheduleId },
    });

    return {
      message: 'Перенос автобронирования успешно удален',
    };
  }

  /**
   * Validate required fields based on dateType
   */
  private validateDateTypeFields(
    updateData: Partial<AutobookingReschedule>,
    existingReschedule: AutobookingReschedule,
  ): void {
    const dateType = updateData.dateType || existingReschedule.dateType;

    if (!dateType) return;

    switch (dateType) {
      case 'WEEK':
      case 'MONTH': {
        const startDate =
          updateData.startDate !== undefined
            ? updateData.startDate
            : existingReschedule.startDate;
        if (!startDate) {
          throw new AutobookingUpdateError(
            `startDate is required for dateType ${dateType}`,
            'START_DATE_REQUIRED',
            400,
          );
        }
        break;
      }

      case 'CUSTOM_PERIOD': {
        const periodStartDate =
          updateData.startDate !== undefined
            ? updateData.startDate
            : existingReschedule.startDate;
        const periodEndDate =
          updateData.endDate !== undefined
            ? updateData.endDate
            : existingReschedule.endDate;
        if (!periodStartDate) {
          throw new AutobookingUpdateError(
            'startDate is required for CUSTOM_PERIOD dateType',
            'START_DATE_REQUIRED',
            400,
          );
        }
        if (!periodEndDate) {
          throw new AutobookingUpdateError(
            'endDate is required for CUSTOM_PERIOD dateType',
            'END_DATE_REQUIRED',
            400,
          );
        }
        break;
      }

      case 'CUSTOM_DATES_SINGLE': {
        const customDates =
          updateData.customDates !== undefined
            ? updateData.customDates
            : existingReschedule.customDates;
        if (
          !customDates ||
          !Array.isArray(customDates) ||
          customDates.length === 0
        ) {
          throw new AutobookingUpdateError(
            'customDates is required and cannot be empty for dateType CUSTOM_DATES_SINGLE',
            'CUSTOM_DATES_REQUIRED',
            400,
          );
        }
        break;
      }
    }
  }

  /**
   * Validate that reschedule dates are older than supply date
   */
  private async validateRescheduleDates(
    updateData: Partial<AutobookingReschedule>,
    existingReschedule: AutobookingReschedule,
  ): Promise<void> {
    // Get the supply date (created date of the reschedule represents when the supply was created)
    const supplyDate = new Date(existingReschedule.createdAt);

    const dateType = updateData.dateType || existingReschedule.dateType;

    // Check different date types
    switch (dateType) {
      case 'WEEK':
      case 'MONTH':
      case 'CUSTOM_PERIOD': {
        const startDate =
          updateData.startDate !== undefined
            ? updateData.startDate
            : existingReschedule.startDate;
        if (startDate && startDate <= supplyDate) {
          throw new AutobookingUpdateError(
            'Дата начала перепланирования должна быть позже даты создания поставки',
            'INVALID_START_DATE',
            400,
          );
        }

        if (dateType === 'CUSTOM_PERIOD') {
          const endDate =
            updateData.endDate !== undefined
              ? updateData.endDate
              : existingReschedule.endDate;
          if (endDate && endDate <= supplyDate) {
            throw new AutobookingUpdateError(
              'Дата окончания перепланирования должна быть позже даты создания поставки',
              'INVALID_END_DATE',
              400,
            );
          }
        }
        break;
      }

      case 'CUSTOM_DATES_SINGLE': {
        const customDates =
          updateData.customDates !== undefined
            ? updateData.customDates
            : (existingReschedule.customDates as Date[]);
        if (customDates && Array.isArray(customDates)) {
          for (const date of customDates) {
            const rescheduleDate = new Date(date);
            if (rescheduleDate <= supplyDate) {
              throw new AutobookingUpdateError(
                'Все даты перепланирования должны быть позже даты создания поставки',
                'INVALID_CUSTOM_DATE',
                400,
              );
            }
          }
        }
        break;
      }
    }
  }

  /**
   * Check slot limits when updating a reschedule.
   * Blocks activation if it would exceed the user's max slots,
   * and blocks expanding customDates on an already-active record.
   */
  private async checkUpdateSlotLimits(
    userId: number,
    existing: AutobookingReschedule,
    updateData: Partial<AutobookingReschedule>,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const maxSlots = RESCHEDULE_SLOTS[user.subscriptionTier ?? 'FREE'];

    const isActivating =
      updateData.status === 'ACTIVE' &&
      !['PENDING', 'ACTIVE'].includes(existing.status);

    const newDateType = (updateData.dateType ?? existing.dateType) as string;
    const newCustomDates =
      updateData.customDates ?? (existing.customDates as Date[]);
    const newSlotCount = calculateSlotCount(newDateType, newCustomDates);

    // Case 1: Activating a non-active reschedule
    if (isActivating) {
      const activeReschedules = await prisma.autobookingReschedule.findMany({
        where: { userId, status: { in: ['PENDING', 'ACTIVE'] }, id: { not: existing.id } },
        select: { dateType: true, customDates: true },
      });
      const usedSlots = activeReschedules.reduce(
        (sum, r) => sum + calculateSlotCount(r.dateType, r.customDates as Date[]),
        0,
      );
      if (usedSlots + newSlotCount > maxSlots) {
        throw new AutobookingUpdateError(
          `Достигнут лимит активных перепланирований (${maxSlots}). Обновите подписку для увеличения лимита.`,
          'SLOT_LIMIT_REACHED',
          403,
        );
      }
      return;
    }

    // Case 2: Already active and expanding slot count
    if (['PENDING', 'ACTIVE'].includes(existing.status)) {
      const existingSlots = calculateSlotCount(
        existing.dateType,
        existing.customDates as Date[],
      );
      if (newSlotCount > existingSlots) {
        const activeReschedules = await prisma.autobookingReschedule.findMany({
          where: { userId, status: { in: ['PENDING', 'ACTIVE'] }, id: { not: existing.id } },
          select: { dateType: true, customDates: true },
        });
        const usedSlots = activeReschedules.reduce(
          (sum, r) => sum + calculateSlotCount(r.dateType, r.customDates as Date[]),
          0,
        );
        if (usedSlots + newSlotCount > maxSlots) {
          throw new AutobookingUpdateError(
            `Достигнут лимит активных перепланирований (${maxSlots}). Обновите подписку для увеличения лимита.`,
            'SLOT_LIMIT_REACHED',
            403,
          );
        }
      }
    }
  }
}

export const rescheduleService = new RescheduleService();
