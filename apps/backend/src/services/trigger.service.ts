import { prisma } from '@/config/database';
import type { SupplyTrigger } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { apiKeyRateLimiterService } from '@/services/api-key-rate-limiter.service';
import {
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_SEARCH_MODE,
} from '@/constants/triggers';
import type { Supply } from '@/types/wb';

export interface CreateTriggerDto {
  warehouseIds: number[];
  supplyTypes: string[];
  checkInterval?: number;
  maxCoefficient: number;
  searchMode?: string;
  startDate?: Date;
  endDate?: Date;
  selectedDates?: Date[];
}

export interface UpdateTriggerDto {
  triggerId: string;
  warehouseIds?: number[];
  supplyTypes?: string[];
  isActive?: boolean;
}

/**
 * Trigger service for managing supply triggers
 * Uses singleton pattern to maintain API client state
 */
export class TriggerService {
  private static instance: TriggerService;
  private api: AxiosInstance;

  private constructor() {
    this.api = axios.create({
      baseURL: 'https://common-api.wildberries.ru',
      timeout: 10000,
    });
  }

  static getInstance(): TriggerService {
    if (!TriggerService.instance) {
      TriggerService.instance = new TriggerService();
    }
    return TriggerService.instance;
  }

  private async getNextApiKey(): Promise<{
    userId: number;
    apiKey: string;
  } | null> {
    return apiKeyRateLimiterService.getAvailableApiKey();
  }

  private async deactivateApiKey(userId: number): Promise<void> {
    await apiKeyRateLimiterService.deactivateApiKey(userId);
  }

  /**
   * Fetch coefficients from WB API
   * Uses rotating API keys with rate limiting
   */
  async getCoefficients(warehouseIDs?: string): Promise<Supply[]> {
    const apiKeyInfo = await this.getNextApiKey();

    if (!apiKeyInfo) {
      const nextAvailableTime = apiKeyRateLimiterService.getNextAvailableTime();
      if (nextAvailableTime !== null && nextAvailableTime > 0) {
        throw new Error(
          `No API keys available. Next available in ${Math.ceil(nextAvailableTime / 1000)} seconds`,
        );
      }
      throw new Error('No active API keys available');
    }

    try {
      const params = warehouseIDs ? { warehouseIDs } : {};
      const response = await this.api.get<Supply[]>(
        '/api/tariffs/v1/acceptance/coefficients',
        {
          params,
          headers: {
            Authorization: apiKeyInfo.apiKey,
          },
        },
      );

      // Mark key as successful use
      apiKeyRateLimiterService.markKeyAsUsed(apiKeyInfo.userId);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Check if it's an authentication error
        if (error.response?.status === 401 || error.response?.status === 403) {
          await this.deactivateApiKey(apiKeyInfo.userId);
          throw new Error(
            'API key authentication failed and has been deactivated',
          );
        }

        // Check if it's a rate limiting error
        if (
          error.response?.data?.detail?.includes('Limited by global limiter') ||
          error.message?.includes('Limited by global limiter')
        ) {
          apiKeyRateLimiterService.temporarilyBlockApiKey(
            apiKeyInfo.userId,
            10,
          );
          throw new Error(
            'Rate limit exceeded. API key has been temporarily blocked for 10 seconds',
          );
        }

        throw new Error(
          error.response?.data?.detail || 'Failed to fetch coefficients',
        );
      }
      throw error;
    }
  }

  /**
   * Get all triggers for a user
   */
  async getUserTriggers(userId: number): Promise<SupplyTrigger[]> {
    return prisma.supplyTrigger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active triggers count for a user
   */
  async getActiveTriggersCount(userId: number): Promise<number> {
    return prisma.supplyTrigger.count({
      where: { userId, isActive: true },
    });
  }

  /**
   * Create a new trigger
   * Note: Validation (subscription, warehouse count, trigger limit) is done in route handler
   */
  async createTrigger(
    userId: number,
    data: CreateTriggerDto,
  ): Promise<SupplyTrigger> {
    const { selectedDates, ...triggerData } = data;

    return prisma.supplyTrigger.create({
      data: {
        userId,
        warehouseIds: triggerData.warehouseIds,
        supplyTypes: triggerData.supplyTypes,
        checkInterval: triggerData.checkInterval || DEFAULT_CHECK_INTERVAL,
        maxCoefficient: triggerData.maxCoefficient,
        searchMode: triggerData.searchMode || DEFAULT_SEARCH_MODE,
        startDate: triggerData.startDate,
        endDate: triggerData.endDate,
        selectedDates: selectedDates?.map((d) => new Date(d)) || [],
      },
    });
  }

  /**
   * Update a trigger - matches deprecated project logic
   * Only updates warehouseIds, supplyTypes, and isActive
   */
  async updateTrigger(
    userId: number,
    data: UpdateTriggerDto,
  ): Promise<SupplyTrigger> {
    const trigger = await prisma.supplyTrigger.findFirst({
      where: { id: data.triggerId, userId },
    });

    if (!trigger) {
      throw new Error('Trigger not found');
    }

    return prisma.supplyTrigger.update({
      where: { id: data.triggerId },
      data: {
        warehouseIds: data.warehouseIds,
        supplyTypes: data.supplyTypes,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(userId: number, triggerId: string): Promise<void> {
    const trigger = await prisma.supplyTrigger.findFirst({
      where: { id: triggerId, userId },
    });

    if (!trigger) {
      throw new Error('Trigger not found');
    }

    await prisma.supplyTrigger.delete({ where: { id: triggerId } });
  }

  /**
   * Toggle trigger active status - with limit check when activating
   * Checks 30 trigger limit only when activating (not when deactivating)
   */
  async toggleTrigger(
    userId: number,
    triggerId: string,
  ): Promise<SupplyTrigger> {
    const trigger = await prisma.supplyTrigger.findFirst({
      where: { id: triggerId, userId },
    });

    if (!trigger) {
      throw new Error('Trigger not found');
    }

    // Only check limit when activating (trigger is currently inactive)
    if (!trigger.isActive) {
      const activeTriggersCount = await this.getActiveTriggersCount(userId);
      if (activeTriggersCount >= 30) {
        throw new Error('Достигнут лимит активных таймслотов (30)');
      }
    }

    return prisma.supplyTrigger.update({
      where: { id: triggerId },
      data: { isActive: !trigger.isActive },
    });
  }

  /**
   * Get trigger by ID
   */
  async getTrigger(userId: number, triggerId: string): Promise<SupplyTrigger> {
    const trigger = await prisma.supplyTrigger.findFirst({
      where: { id: triggerId, userId },
    });

    if (!trigger) {
      throw new Error('Trigger not found');
    }

    return trigger;
  }

  /**
   * Update trigger status
   */
  async updateTriggerStatus(
    triggerId: string,
    status: 'COMPLETED' | 'EXPIRED' | 'RELEVANT',
  ): Promise<void> {
    await prisma.supplyTrigger.update({
      where: { id: triggerId },
      data: { status, isActive: status === 'RELEVANT' },
    });
  }

  /**
   * Update last notification time
   */
  async updateLastNotificationTime(triggerId: string): Promise<void> {
    await prisma.supplyTrigger.update({
      where: { id: triggerId },
      data: { lastNotificationAt: new Date() },
    });
  }
}

export const triggerService = TriggerService.getInstance();
