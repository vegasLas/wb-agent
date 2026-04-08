/**
 * WB Cookie Supply Service
 * Handles WB supply-related API calls using browser cookies
 * Domain: seller-supply.wildberries.ru
 */

import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import {
  ListGoodsParams,
  ListDraftsParams,
  ValidateWarehouseGoodsParams,
  ListSuppliesParams,
  SupplyDetailsParams,
  ListGoodsResponse,
  ListDraftsResponse,
  ValidateWarehouseGoodsResponse,
  ListSuppliesResponse,
  SupplyDetailsResponse,
  WarehouseRecommendationsParams,
  WarehouseRecommendationsResponse,
} from '@/types/wb';

export class WBCookieSupplyService {
  /**
   * List drafts for an account
   */
  async listDrafts({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: ListDraftsParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<ListDraftsResponse> {
    return wbAccountRequest<ListDraftsResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-draft/supply-manager/api/v1/draft/listDrafts',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          filter: {
            orderBy: {
              createdAt: params.orderBy?.createdAt ?? -1,
            },
          },
          limit: params.limit ?? 100,
          offset: params.offset ?? 0,
        },
      },
    });
  }

  /**
   * List goods for a draft
   */
  async listGoods({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: ListGoodsParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<ListGoodsResponse> {
    return wbAccountRequest<ListGoodsResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-draft/supply-manager/api/v1/draft/listDraftGoods',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          filter: {
            search: params.search || '',
            brands: params.brands || [],
            subjects: params.subjects || [],
          },
          limit: params.limit || 10,
          offset: params.offset || 0,
          draftID: params.draftID,
        },
      },
    });
  }

  /**
   * Validate warehouse goods
   */
  async validateWarehouseGoods({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: ValidateWarehouseGoodsParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<ValidateWarehouseGoodsResponse> {
    return wbAccountRequest<ValidateWarehouseGoodsResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm/supply-manager/api/v1/plan/validateWarehouseGoodsV2',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          draftID: params.draftID,
          warehouseId: params.warehouseId,
          transitWarehouseId: params.transitWarehouseId,
        },
      },
    });
  }

  /**
   * Get warehouse recommendations for a draft
   */
  async getWarehouseRecommendations({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: WarehouseRecommendationsParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<WarehouseRecommendationsResponse> {
    return wbAccountRequest<WarehouseRecommendationsResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-recommendations/supply-manager/api/v1/recommendations/getRecommendationsForWarehouses',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          draftId: params.draftId,
        },
      },
    });
  }

  /**
   * List supplies
   */
  async listSupplies({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: ListSuppliesParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<ListSuppliesResponse> {
    return wbAccountRequest<ListSuppliesResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/listSupplies',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          statusId: params.statusId,
        },
      },
    });
  }

  /**
   * Get supply details
   */
  async getSupplyDetails({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: SupplyDetailsParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<SupplyDetailsResponse> {
    return wbAccountRequest<SupplyDetailsResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/supplyDetails',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          preorderID: params.preorderID,
          search: params.search,
          supplyID: params.supplyID,
        },
      },
    });
  }

  /**
   * Create supply (autobooking)
   */
  async createSupply({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: {
      draftID: string;
      warehouseID: number;
      date: string;
      preOrderType: number;
      acceptCoeff?: number;
      transitWarehouseId?: number | null;
    };
    userAgent: string;
    proxy?: ProxyConfig;
  }) {
    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/create',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          draftID: params.draftID,
          warehouseID: params.warehouseID,
          date: params.date,
          preOrderType: params.preOrderType,
          ...(params.acceptCoeff !== undefined && {
            acceptCoeff: params.acceptCoeff,
          }),
          ...(params.transitWarehouseId && {
            transitWarehouseId: params.transitWarehouseId,
          }),
        },
      },
    });
  }

  /**
   * Delete preorder
   */
  async deletePreorder({
    accountId,
    supplierId,
    preorderId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    preorderId: number;
    userAgent: string;
    proxy?: ProxyConfig;
  }) {
    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm-preorder/supply-manager/api/v1/preorder/delete',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          preorderID: preorderId,
        },
      },
    });
  }

  /**
   * Update supply plan
   */
  async updatePlan({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: {
      preorderID: number;
      date: string;
      warehouseId: number;
      preOrderType: number;
      transitWarehouseId?: number | null;
    };
    userAgent: string;
    proxy?: ProxyConfig;
  }) {
    return wbAccountRequest({
      url: 'https://seller-supply.wildberries.ru/ns/sm-plan/supply-manager/api/v1/plan/update',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: {
        params: {
          preorderID: params.preorderID,
          date: params.date,
          warehouseId: params.warehouseId,
          preOrderType: params.preOrderType,
          ...(params.transitWarehouseId && {
            transitWarehouseId: params.transitWarehouseId,
          }),
        },
      },
    });
  }
}

export const wbCookieSupplyService = new WBCookieSupplyService();
