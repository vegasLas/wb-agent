/**
 * WB API Tariff Service
 * Handles WB tariff/coefficient API calls using API key authentication
 * Domain: common-api.wildberries.ru
 */

import axios, { AxiosInstance } from 'axios';
import { apiKeyRateLimiterService } from "@/services/internal/api-key-rate-limiter.service";
import type { Supply } from "@/types/wb";

export class WBApiTariffService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://common-api.wildberries.ru',
      timeout: 10000,
    });
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
}

export const wbApiTariffService = new WBApiTariffService();
