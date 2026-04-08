/**
 * WB Cookie Warehouse Service
 * Handles WB warehouse-related API calls using browser cookies
 * Domain: seller-supply.wildberries.ru, seller.wildberries.ru
 */

import { wbAccountRequest } from "@/utils/wb-request";
import type { ProxyConfig } from "@/utils/wb-request";
import {
  TransitResponse,
  WarehouseRecommendationsResponse,
  AcceptanceCoefficientsResponse,
  WarehousesRoot,
} from "@/types/wb";
import { prisma } from "@/config/database";
import { getCookiesFromAccount } from "@/utils/cookies";
import { logger } from "@/utils/logger";

export class WBCookieWarehouseService {
  /**
   * Get transit offices for a warehouse
   */
  async getTransitTariffs({
    accountId,
    supplierId,
    warehouseId,
    userAgent,
    proxy,
    order,
  }: {
    accountId: string;
    supplierId: string;
    warehouseId: number;
    userAgent: string;
    proxy?: ProxyConfig;
    order?: number;
  }): Promise<TransitResponse> {
    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm/supply-manager/api/v1/plan/transitTariffsV2',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          warehouseID: warehouseId,
        },
      },
      order,
    });
  }

  /**
   * Get warehouse recommendations for a draft
   */
  async getWarehouseRecommendations({
    accountId,
    supplierId,
    draftId,
    userAgent,
    proxy,
    order,
  }: {
    accountId: string;
    supplierId: string;
    draftId: string;
    userAgent: string;
    proxy?: ProxyConfig;
    order?: number;
  }): Promise<WarehouseRecommendationsResponse> {
    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm-recommendations/supply-manager/api/v1/recommendations/getRecommendationsForWarehouses',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          draftId,
        },
      },
      order,
    });
  }

  /**
   * Get acceptance coefficients report (Close API)
   */
  async getAcceptanceCoefficients({
    accountId,
    supplierId,
    userAgent,
    proxy,
    order,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
    order?: number;
  }): Promise<AcceptanceCoefficientsResponse> {
    const now = new Date();

    // Set dateFrom to 14 days from now
    const dateFromDate = new Date(now);
    dateFromDate.setDate(dateFromDate.getDate() + 14);
    const dateFrom = dateFromDate.toISOString();

    // Set dateTo to 28 days from now (14 days from dateFrom)
    const dateTo = new Date(now);
    dateTo.setDate(dateTo.getDate() + 28);
    dateTo.setMinutes(0);
    dateTo.setSeconds(0);
    dateTo.setMilliseconds(0);
    dateTo.setHours(dateTo.getHours() + 1);

    // Format the date manually to ensure ".000Z" format
    const dateToFormatted =
      dateTo.getUTCFullYear() +
      '-' +
      String(dateTo.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(dateTo.getUTCDate()).padStart(2, '0') +
      'T21:00:00.000Z';

    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/acceptanceCoefficientsReport',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          dateTo: dateToFormatted,
          dateFrom,
        },
      },
      order,
    });
  }

  /**
   * Get all warehouses list
   */
  async getAllWarehouses({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<WarehousesRoot> {
    try {
      // Get account directly by ID
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account?.wbCookies) {
        throw {
          message: 'Failed to get account cookies',
          method: 'getAllWarehouses',
        };
      }

      // Extract WBTokenV3 from cookies
      const cookies = await getCookiesFromAccount(accountId);
      const wbTokenValue = cookies.find((c) => c.name === 'WBTokenV3')?.value;
      if (!wbTokenValue) {
        throw {
          message: 'Failed to get WBTokenV3 from account cookies',
          method: 'getAllWarehouses',
        };
      }

      return wbAccountRequest<WarehousesRoot>({
        url: 'https://seller.wildberries.ru/ns/distribution-offices/distribution-offices/api/v1/office/getAllWarehouse',
        accountId,
        userAgent,
        proxy,
        supplierId,
        isJsonRpc: true,
        body: {
          params: {
            filters: [],
            sorting: 'ratingDesc',
          },
        },
      });
    } catch (error) {
      logger.error(
        `Failed to get all warehouses by account: ${(error as Error).message}`,
      );
      throw {
        message: `Failed to get all warehouses by account: ${(error as Error).message}`,
        method: 'getAllWarehouses',
      };
    }
  }
}

export const wbCookieWarehouseService = new WBCookieWarehouseService();
