import { prisma } from '@/config/database';
import type { Autobooking } from '@prisma/client';

/**
 * Valid date types for autobooking
 */
export type AutobookingDateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_PERIOD'
  | 'CUSTOM_DATES'
  | 'CUSTOM_DATES_SINGLE';

/**
 * Data Transfer Object for creating autobooking
 */
export interface CreateAutobookingDto {
  accountId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType: AutobookingDateType;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates?: Date[];
  maxCoefficient: number;
  monopalletCount?: number | null;
}

/**
 * Data Transfer Object for updating autobooking
 */
export interface UpdateAutobookingDto {
  id: string;
  draftId?: string;
  warehouseId?: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType?: string;
  dateType?: AutobookingDateType;
  startDate?: Date | null;
  endDate?: Date | null;
  customDates?: Date[];
  maxCoefficient?: number;
  monopalletCount?: number | null;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

/**
 * Business logic validation errors
 */
export class AutobookingUpdateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AutobookingUpdateError';
  }
}

/**
 * Service responsible for autobooking CRUD operations
 */
export class AutobookingService {
  /**
   * Get autobookings for a user with counts by status
   * Includes: ACTIVE, COMPLETED, ARCHIVED, ERROR
   */
  async getUserAutobookings(
    userId: number,
    page = 1,
    limit = 20,
    statusFilter?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'ERROR',
  ): Promise<{
    success: boolean;
    counts: Record<string, number>;
    items: Autobooking[];
    currentPage: number;
    nextPage: number | null;
  }> {
    const statuses = statusFilter
      ? [statusFilter]
      : ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ERROR'];
    const skip = (page - 1) * limit;

    const results = await Promise.all(
      statuses.map(async (status) => {
        const items = await prisma.autobooking.findMany({
          where: { status, userId },
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
        });
        const total = await prisma.autobooking.count({
          where: { status, userId },
        });

        return {
          status,
          items,
          total,
          currentPage: page,
          nextPage: total > page * limit ? page + 1 : null,
        };
      }),
    );

    return {
      success: true,
      counts: results.reduce(
        (acc, curr) => {
          acc[curr.status] = curr.total;
          return acc;
        },
        {} as Record<string, number>,
      ),
      items: results.flatMap((item) => item.items),
      currentPage: page,
      nextPage: results.some((result) => result.nextPage !== null)
        ? page + 1
        : null,
    };
  }

  /**
   * Create a new autobooking
   * Checks subscription, validates account, manages credits
   */
  async createAutobooking(
    userId: number,
    data: CreateAutobookingDto,
  ): Promise<Autobooking> {
    // Get user for subscription and credit check
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AutobookingUpdateError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Validate account
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
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

    // Validate monopallet count for MONOPALLETE
    if (
      data.supplyType === 'MONOPALLETE' &&
      (!data.monopalletCount || data.monopalletCount < 1)
    ) {
      throw new AutobookingUpdateError(
        'Для типа поставки "Монопаллета" необходимо указать количество монопаллет (минимум 1)',
        'INVALID_MONOPALLET_COUNT',
        400,
      );
    }

    // Calculate required credits
    const requiredCount =
      data.dateType === 'CUSTOM_DATES' && data.customDates?.length
        ? data.customDates.length
        : 1;

    // Check credits
    if (user.autobookingCount < requiredCount) {
      throw new AutobookingUpdateError(
        `У вас недостаточно кредитов. Требуется: ${requiredCount}, доступно: ${user.autobookingCount}`,
        'INSUFFICIENT_CREDITS',
        403,
      );
    }

    // Normalize dates to UTC midnight
    const normalizedStartDate = data.startDate
      ? new Date(
          Date.UTC(
            data.startDate.getFullYear(),
            data.startDate.getMonth(),
            data.startDate.getDate(),
          ),
        )
      : null;
    const normalizedEndDate = data.endDate
      ? new Date(
          Date.UTC(
            data.endDate.getFullYear(),
            data.endDate.getMonth(),
            data.endDate.getDate(),
          ),
        )
      : null;
    const normalizedCustomDates =
      data.customDates?.map(
        (date) =>
          new Date(
            Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
          ),
      ) || [];

    // Create autobooking and decrement credits in transaction
    const [autobooking] = await prisma.$transaction([
      prisma.autobooking.create({
        data: {
          userId,
          supplierId: account.selectedSupplierId,
          draftId: data.draftId,
          warehouseId: data.warehouseId,
          transitWarehouseId: data.transitWarehouseId,
          transitWarehouseName: data.transitWarehouseName,
          supplyType: data.supplyType,
          dateType: data.dateType,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          customDates: normalizedCustomDates,
          maxCoefficient: data.maxCoefficient,
          monopalletCount: data.monopalletCount,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { autobookingCount: { decrement: requiredCount } },
      }),
    ]);

    return autobooking;
  }

  /**
   * Update an autobooking
   * Validates ownership, handles credit adjustments
   */
  async updateAutobooking(
    userId: number,
    data: UpdateAutobookingDto,
  ): Promise<Autobooking> {
    // Check if there's any data to update
    if (
      Object.keys(data).length === 0 ||
      (Object.keys(data).length === 1 && 'id' in data)
    ) {
      throw new AutobookingUpdateError(
        'No valid update data provided',
        'NO_UPDATE_DATA',
        400,
      );
    }

    // Validate ownership
    const existing = await prisma.autobooking.findFirst({
      where: { id: data.id, userId },
    });

    if (!existing) {
      throw new AutobookingUpdateError(
        'Autobooking not found or access denied',
        'AUTOBOOKING_NOT_FOUND',
        404,
      );
    }

    if (existing.status === 'COMPLETED') {
      throw new AutobookingUpdateError(
        'The autobooking status is COMPLETED',
        'AUTOBOOKING_IS_COMPLETED',
        400,
      );
    }

    // Calculate credit adjustment
    const countAdjustment = this.calculateCountAdjustment(existing, data);

    // Validate user has enough credits if adjustment is positive
    if (countAdjustment > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { autobookingCount: true },
      });

      if (!user || user.autobookingCount < countAdjustment) {
        throw new AutobookingUpdateError(
          'Insufficient autobooking count. Required: ' + countAdjustment,
          'INSUFFICIENT_AUTOBOOKING_COUNT',
          403,
        );
      }
    }

    // Build update data with validation
    const updateData: Partial<Autobooking> = {};

    if (data.draftId !== undefined) {
      this.validateDraftId(data.draftId);
      updateData.draftId = data.draftId;
    }

    if (data.warehouseId !== undefined) {
      this.validateWarehouseId(data.warehouseId);
      updateData.warehouseId = data.warehouseId;
    }

    if (data.transitWarehouseId !== undefined) {
      updateData.transitWarehouseId = data.transitWarehouseId;
    }

    if (data.transitWarehouseName !== undefined) {
      updateData.transitWarehouseName = data.transitWarehouseName;
    }

    if (data.supplyType !== undefined) {
      this.validateSupplyType(data.supplyType);
      updateData.supplyType = data.supplyType;
    }

    if (data.dateType !== undefined) {
      this.validateDateType(data.dateType);
      updateData.dateType = data.dateType;
    }

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate
        ? new Date(
            Date.UTC(
              data.startDate.getFullYear(),
              data.startDate.getMonth(),
              data.startDate.getDate(),
            ),
          )
        : null;
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate
        ? new Date(
            Date.UTC(
              data.endDate.getFullYear(),
              data.endDate.getMonth(),
              data.endDate.getDate(),
            ),
          )
        : null;
    }

    if (data.customDates !== undefined) {
      updateData.customDates = data.customDates.map(
        (date) =>
          new Date(
            Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
          ),
      );
    }

    if (data.maxCoefficient !== undefined) {
      this.validateMaxCoefficient(data.maxCoefficient);
      updateData.maxCoefficient = data.maxCoefficient;
    }

    if (data.monopalletCount !== undefined) {
      if (data.monopalletCount !== null) {
        this.validateMonopalletCount(data.monopalletCount);
      }
      updateData.monopalletCount = data.monopalletCount;
    }

    if (data.status !== undefined) {
      this.validateStatus(data.status);
      updateData.status = data.status;
    }

    // Validate business rules
    this.validateBusinessRules(updateData, data);

    // Perform update with credit adjustment
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.autobooking.update({
        where: { id: data.id },
        data: updateData,
      });

      if (countAdjustment !== 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            autobookingCount: {
              increment: -countAdjustment,
            },
          },
        });
      }

      return updated;
    });
  }

  /**
   * Delete an autobooking
   * Returns credits if not completed
   */
  async deleteAutobooking(
    userId: number,
    autobookingId: string,
  ): Promise<{ message: string; returnedCredits: number }> {
    const autobooking = await prisma.autobooking.findFirst({
      where: { id: autobookingId, userId },
    });

    if (!autobooking) {
      throw new AutobookingUpdateError(
        'Autobooking not found',
        'AUTOBOOKING_NOT_FOUND',
        404,
      );
    }

    // Calculate return count
    const returnCount =
      autobooking.dateType === 'CUSTOM_DATES' &&
      Array.isArray(autobooking.customDates)
        ? autobooking.customDates.length
        : 1;

    await prisma.$transaction(async (tx) => {
      await tx.autobooking.delete({ where: { id: autobookingId } });

      // Return credits if not completed
      if (autobooking.status !== 'COMPLETED') {
        await tx.user.update({
          where: { id: userId },
          data: { autobookingCount: { increment: returnCount } },
        });
      }
    });

    return {
      message:
        autobooking.status !== 'COMPLETED'
          ? `Автобронирование успешно удалено. Вам возвращено ${returnCount} кредитов`
          : 'Автобронирование успешно удалено',
      returnedCredits: autobooking.status !== 'COMPLETED' ? returnCount : 0,
    };
  }

  /**
   * Calculate credit adjustment for update
   */
  private calculateCountAdjustment(
    existing: Autobooking,
    update: UpdateAutobookingDto,
  ): number {
    const currentDateType = this.validateDateType(existing.dateType);
    const currentCost = this.calculateCost(
      currentDateType,
      existing.customDates || [],
    );

    const newDateType = update.dateType || currentDateType;
    const newCustomDates = update.customDates || existing.customDates || [];
    const newCost = this.calculateCost(newDateType, newCustomDates);

    return newCost - currentCost;
  }

  /**
   * Validate and cast date type string to union type
   */
  private validateDateType(dateType: string): AutobookingDateType {
    const validTypes: AutobookingDateType[] = [
      'WEEK',
      'MONTH',
      'CUSTOM_PERIOD',
      'CUSTOM_DATES',
      'CUSTOM_DATES_SINGLE',
    ];
    if (!validTypes.includes(dateType as AutobookingDateType)) {
      throw new AutobookingUpdateError(
        `Invalid date type: ${dateType}`,
        'INVALID_DATE_TYPE',
        400,
      );
    }
    return dateType as AutobookingDateType;
  }

  /**
   * Calculate cost based on date type
   */
  private calculateCost(
    dateType: AutobookingDateType,
    customDates: Date[],
  ): number {
    switch (dateType) {
      case 'CUSTOM_DATES':
        return customDates.length;
      case 'CUSTOM_DATES_SINGLE':
        return 1;
      case 'WEEK':
      case 'MONTH':
      case 'CUSTOM_PERIOD':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Validate draft ID
   */
  private validateDraftId(draftId: string): void {
    if (
      !draftId ||
      typeof draftId !== 'string' ||
      draftId.trim().length === 0
    ) {
      throw new AutobookingUpdateError(
        'Draft ID must be a non-empty string',
        'INVALID_DRAFT_ID',
        400,
      );
    }
  }

  /**
   * Validate warehouse ID
   */
  private validateWarehouseId(warehouseId: number): void {
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      throw new AutobookingUpdateError(
        'Warehouse ID must be a positive integer',
        'INVALID_WAREHOUSE_ID',
        400,
      );
    }
  }

  /**
   * Validate supply type
   */
  private validateSupplyType(supplyType: string): void {
    const validTypes = ['BOX', 'MONOPALLETE', 'SUPERSAFE'];
    if (!validTypes.includes(supplyType)) {
      throw new AutobookingUpdateError(
        `Supply type must be one of: ${validTypes.join(', ')}`,
        'INVALID_SUPPLY_TYPE',
        400,
      );
    }
  }

  /**
   * Validate max coefficient
   */
  private validateMaxCoefficient(maxCoefficient: number): void {
    if (
      typeof maxCoefficient !== 'number' ||
      maxCoefficient < 0 ||
      maxCoefficient > 20
    ) {
      throw new AutobookingUpdateError(
        'Max coefficient must be a number between 0 and 20',
        'INVALID_MAX_COEFFICIENT',
        400,
      );
    }
  }

  /**
   * Validate monopallet count
   */
  private validateMonopalletCount(monopalletCount: number): void {
    if (
      !Number.isInteger(monopalletCount) ||
      monopalletCount <= 0 ||
      monopalletCount > 100
    ) {
      throw new AutobookingUpdateError(
        'Monopallet count must be an integer between 1 and 100',
        'INVALID_MONOPALLET_COUNT',
        400,
      );
    }
  }

  /**
   * Validate status
   */
  private validateStatus(status: string): void {
    const validStatuses = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new AutobookingUpdateError(
        `Status must be one of: ${validStatuses.join(', ')}`,
        'INVALID_STATUS',
        400,
      );
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    processedData: Partial<Autobooking>,
    updateData: UpdateAutobookingDto,
  ): void {
    // Monopallet count required for MONOPALLETE
    if (
      processedData.supplyType === 'MONOPALLETE' &&
      !updateData.monopalletCount
    ) {
      throw new AutobookingUpdateError(
        'Monopallet count is required for MONOPALLETE supply type',
        'MONOPALLET_COUNT_REQUIRED',
        400,
      );
    }

    // Custom dates required for custom date types
    if (
      (processedData.dateType === 'CUSTOM_DATES' ||
        processedData.dateType === 'CUSTOM_DATES_SINGLE') &&
      (!updateData.customDates || updateData.customDates.length === 0)
    ) {
      throw new AutobookingUpdateError(
        'Custom dates are required for custom date types',
        'CUSTOM_DATES_REQUIRED',
        400,
      );
    }

    // Start date required for period-based types
    if (
      (processedData.dateType === 'WEEK' ||
        processedData.dateType === 'MONTH' ||
        processedData.dateType === 'CUSTOM_PERIOD') &&
      !updateData.startDate
    ) {
      throw new AutobookingUpdateError(
        'Start date is required for period-based date types',
        'START_DATE_REQUIRED',
        400,
      );
    }

    // End date required for CUSTOM_PERIOD
    if (processedData.dateType === 'CUSTOM_PERIOD' && !updateData.endDate) {
      throw new AutobookingUpdateError(
        'End date is required for CUSTOM_PERIOD date type',
        'END_DATE_REQUIRED',
        400,
      );
    }
  }
}

export const autobookingService = new AutobookingService();
