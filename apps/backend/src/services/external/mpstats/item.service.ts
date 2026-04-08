/**
 * MPStats Item Service
 * Handles MPStats API operations for Wildberries analytics
 * Domain: mpstats.io
 */

import { prisma } from "@/config/database";
import { createLogger } from "@/utils/logger";
import type {
  MPStatsItemSalesParams,
  MPStatsItemSalesResponse,
  MPStatsItemSalesByRegionParams,
  MPStatsItemSalesByRegionResponse,
} from "@/types/wb";

const logger = createLogger('MPStats');

export class MPStatsItemService {
  /**
   * Get MPStats item sales data
   * Endpoint: GET https://mpstats.io/api/wb/get/item/{nmId}/sales
   */
  async getItemSales({
    userId,
    params,
  }: {
    userId: number;
    params: MPStatsItemSalesParams;
  }): Promise<MPStatsItemSalesResponse[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mpstatsToken) {
      throw new Error('MPStats token not found for user');
    }

    let url = `https://mpstats.io/api/wb/get/item/${params.nmId}/sales`;
    const queryParams: string[] = [];
    queryParams.push(`d1=${encodeURIComponent(params.d1)}`);
    queryParams.push(`d2=${encodeURIComponent(params.d2)}`);
    if (params.fbs !== undefined) {
      queryParams.push(`fbs=${params.fbs}`);
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    const headers: Record<string, string> = {
      'X-Mpstats-TOKEN': user.mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.debug(`Fetching MPStats item sales: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        const responseClone = response.clone();
        errorBody = await responseClone.json();
      } catch {
        try {
          const responseClone = response.clone();
          errorBody = await responseClone.text();
        } catch {
          errorBody = 'Could not read error response body';
        }
      }

      logger.error(`MPStats item sales request failed:`, {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorBody,
      });

      throw new Error(
        `MPStats request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
      );
    }

    return (await response.json()) as MPStatsItemSalesResponse[];
  }

  /**
   * Get MPStats item sales by region
   * Endpoint: GET https://mpstats.io/api/wb/get/item/{nmId}/sales_by_region
   */
  async getItemSalesByRegion({
    userId,
    params,
  }: {
    userId: number;
    params: MPStatsItemSalesByRegionParams;
  }): Promise<MPStatsItemSalesByRegionResponse[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mpstatsToken) {
      throw new Error('MPStats token not found for user');
    }

    const url =
      `https://mpstats.io/api/wb/get/item/${params.nmId}/sales_by_region` +
      `?d1=${encodeURIComponent(params.d1)}` +
      `&d2=${encodeURIComponent(params.d2)}`;

    const headers: Record<string, string> = {
      'X-Mpstats-TOKEN': user.mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.debug(`Fetching MPStats item sales by region: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        const responseClone = response.clone();
        errorBody = await responseClone.json();
      } catch {
        try {
          const responseClone = response.clone();
          errorBody = await responseClone.text();
        } catch {
          errorBody = 'Could not read error response body';
        }
      }

      logger.error(`MPStats item sales by region request failed:`, {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorBody,
      });

      throw new Error(
        `MPStats request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
      );
    }

    return (await response.json()) as MPStatsItemSalesByRegionResponse[];
  }
}

export const mpstatsItemService = new MPStatsItemService();
