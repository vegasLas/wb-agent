/**
 * MPStats Service
 * Handles MPStats API integration for Wildberries analytics
 * https://mpstats.io/api/
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import { ApiError } from '@/utils/errors';
import axios, { AxiosError } from 'axios';

const logger = createLogger('MPStats');

import type {
  MpstatsSalesItem,
  MpstatsSalesByRegionItem,
  MpstatsBalanceByRegionItem,
  MpstatsSkuSummary,
  MpstatsItemFull,
} from '@/types/wb';

async function axiosGet<T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> {
  try {
    logger.info(`MPStats request: ${url}`);
    const response = await axios.get<T>(url, {
      headers,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError;
      logger.error(
        `MPStats API error [${url}]: ${axiosErr.response?.status} - ${JSON.stringify(axiosErr.response?.data)}`,
      );
      const errorData = axiosErr.response?.data as
        | { message?: string }
        | undefined;

      if (axiosErr.response?.status === 401) {
        throw ApiError.badRequest(
          'Invalid or expired MPStats token. Please check your token in settings.',
          'MPSTATS_TOKEN_INVALID',
        );
      }

      if (axiosErr.response?.status === 403) {
        throw ApiError.forbidden(
          'MPStats API access denied. Your subscription may not include this endpoint.',
          'MPSTATS_FORBIDDEN',
        );
      }

      throw new Error(
        `MPStats API error: ${errorData?.message || axiosErr.message}`,
      );
    }
    throw error;
  }
}

export class MPStatsService {
  /**
   * Get MPStats sales data for a specific NM ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param mpstatsToken - MPStats API token
   * @param fbs - FBS flag (default: 1)
   */
  async getSales({
    nmId,
    d1,
    d2,
    mpstatsToken,
    fbs = 1,
  }: {
    nmId: number;
    d1: string;
    d2: string;
    mpstatsToken: string;
    fbs?: number;
  }): Promise<MpstatsSalesItem[]> {
    const url =
      `https://mpstats.io/api/wb/get/item/${nmId}/sales` +
      `?d1=${encodeURIComponent(d1)}` +
      `&d2=${encodeURIComponent(d2)}` +
      `&fbs=${fbs}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats sales for nmId: ${nmId}`);
    return axiosGet<MpstatsSalesItem[]>(url, headers);
  }

  /**
   * Get MPStats sales by region for a specific NM ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param mpstatsToken - MPStats API token
   */
  async getSalesByRegion({
    nmId,
    d1,
    d2,
    mpstatsToken,
    fbs = 1,
  }: {
    nmId: number;
    d1: string;
    d2: string;
    mpstatsToken: string;
    fbs?: number;
  }): Promise<MpstatsSalesByRegionItem[]> {
    const url =
      `https://mpstats.io/api/wb/get/item/${nmId}/sales_by_region` +
      `?d1=${encodeURIComponent(d1)}` +
      `&d2=${encodeURIComponent(d2)}` +
      `&fbs=${fbs}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats sales by region for nmId: ${nmId}`);
    return axiosGet<MpstatsSalesByRegionItem[]>(url, headers);
  }

  /**
   * Get MPStats sales data for a user (fetches token from user record)
   * @param userId - User ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param fbs - FBS flag (default: 1)
   */
  async getSalesForUser({
    userId,
    nmId,
    d1,
    d2,
    fbs = 1,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
    fbs?: number;
  }): Promise<MpstatsSalesItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    return this.getSales({
      nmId,
      d1,
      d2,
      mpstatsToken: user.mpstatsToken,
      fbs,
    });
  }

  /**
   * Get MPStats balance by region for a specific NM ID
   * @param nmId - Wildberries NM ID
   * @param mpstatsToken - MPStats API token
   */
  async getBalanceByRegion({
    nmId,
    d,
    mpstatsToken,
    fbs = 1,
  }: {
    nmId: number;
    d: string;
    mpstatsToken: string;
    fbs?: number;
  }): Promise<MpstatsBalanceByRegionItem[]> {
    const url =
      `https://mpstats.io/api/wb/get/item/${nmId}/balance_by_region` +
      `?d=${encodeURIComponent(d)}` +
      `&fbs=${fbs}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats balance by region for nmId: ${nmId}`);
    return axiosGet<MpstatsBalanceByRegionItem[]>(url, headers);
  }

  /**
   * Get MPStats sales by region for a user (fetches token from user record)
   * @param userId - User ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   */
  async getSalesByRegionForUser({
    userId,
    nmId,
    d1,
    d2,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
  }): Promise<MpstatsSalesByRegionItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    return this.getSalesByRegion({
      nmId,
      d1,
      d2,
      mpstatsToken: user.mpstatsToken,
    });
  }

  /**
   * Get MPStats balance by region for a user (fetches token from user record)
   * @param userId - User ID
   * @param nmId - Wildberries NM ID
   */
  async getBalanceByRegionForUser({
    userId,
    nmId,
    d,
  }: {
    userId: number;
    nmId: number;
    d: string;
  }): Promise<MpstatsBalanceByRegionItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    return this.getBalanceByRegion({
      nmId,
      d,
      mpstatsToken: user.mpstatsToken,
    });
  }

  /**
   * Get MPStats full item info
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param mpstatsToken - MPStats API token
   */
  async getItemFull({
    nmId,
    d1,
    d2,
    mpstatsToken,
  }: {
    nmId: number;
    d1: string;
    d2: string;
    mpstatsToken: string;
  }): Promise<MpstatsItemFull> {
    const url = `https://mpstats.io/api/analytics/v1/wb/items/${nmId}/full?d1=${encodeURIComponent(d1)}&d2=${encodeURIComponent(d2)}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats item full for nmId: ${nmId}`);
    return axiosGet<MpstatsItemFull>(url, headers);
  }

  async getItemFullForUser({
    userId,
    nmId,
    d1,
    d2,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
  }): Promise<MpstatsItemFull> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    return this.getItemFull({
      nmId,
      d1,
      d2,
      mpstatsToken: user.mpstatsToken,
    });
  }

  async getSkuSummary({
    userId,
    nmId,
    d1,
    d2,
    fbs = 1,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
    fbs?: number;
  }): Promise<MpstatsSkuSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    const mpstatsToken = user.mpstatsToken;

    const [sales, salesByRegion, balanceByRegion, itemFull] = await Promise.all([
      this.getSales({ nmId, d1, d2, mpstatsToken, fbs }),
      this.getSalesByRegion({ nmId, d1, d2, mpstatsToken, fbs }),
      this.getBalanceByRegion({ nmId, d: d2, mpstatsToken, fbs }),
      this.getItemFull({ nmId, d1, d2, mpstatsToken }),
    ]);

    return {
      nmId,
      sales,
      salesByRegion,
      balanceByRegion,
      itemFull,
    };
  }
}

// Export a singleton instance
export const mpstatsService = new MPStatsService();
