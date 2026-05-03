/**
 * WB Supplier Service
 * Migrated from deprecated project server/services/wbSupplier.ts
 * Handles all Wildberries supplier-related API calls with multi-account support
 */

import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import {
  ListGoodsParams,
  ListDraftsParams,
  ValidateWarehouseGoodsParams,
  WarehouseRecommendationsParams,
  ListSuppliesParams,
  SupplyDetailsParams,
  BalancesParams,
  ListGoodsResponse,
  ListDraftsResponse,
  ValidateWarehouseGoodsResponse,
  WarehouseRecommendationsResponse,
  ListSuppliesResponse,
  SupplyDetailsResponse,
  BalancesResponse,
  SupplierResponse,
} from '@/types/wb';

export class WBSupplierService {
  /**
   * Validate authentication for an account
   */
  async validateAuthByAccount({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }) {
    return wbAccountRequest({
      url: 'https://seller.wildberries.ru/ns/passport-portal/suppliers-portal-ru/validate',
      accountId,
      userAgent,
      proxy,
      supplierId,
      parseResponse: false,
    });
  }

  /**
   * List goods for a draft
   */
  async listGoodsByAccount({
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
   * List drafts for an account
   */
  async listDraftsByAccount({
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
   * Get user suppliers from WB API
   */
  async getUserSuppliersByAccount({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<Array<{ name: string; id: string }>> {
    const response = await wbAccountRequest<[SupplierResponse]>({
      url: 'https://seller.wildberries.ru/ns/suppliers/suppliers-portal-core/suppliers',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: [
        { method: 'getUserSuppliers', params: {} },
        { method: 'listCountries', params: {} },
      ],
    });

    const suppliers =
      response.find((item) => 'suppliers' in (item.result || {}))?.result
        ?.suppliers || [];

    return suppliers.map((supplier: { name: string; id: string }) => ({
      name: supplier.name,
      id: supplier.id,
    }));
  }

  /**
   * Validate warehouse goods
   */
  async validateWarehouseGoodsV2ByAccount({
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
   * Get warehouse recommendations
   */
  async getWarehouseRecommendationsByAccount({
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
  async listSuppliesByAccount({
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
  async getSupplyDetailsByAccount({
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
   * Get balances from WB API
   * @deprecated Use wbStatisticsOfficialService.getBalances() instead.
   */
  async getBalancesByAccount({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: BalancesParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<BalancesResponse> {
    return wbAccountRequest<BalancesResponse>({
      url: 'https://seller-weekly-report.wildberries.ru/ns/balances/analytics-back/api/v1/balances?limit=100&offset=0',
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      isJsonRpc: false,
      body: {
        filters: [
          'brand',
          'subject',
          'supplierArticle',
          'quantityInTransitToClient',
          'quantityInTransitFromClient',
          'quantityForSaleTotal',
        ],
        dimension: 0,
        kiz: 0,
      },
    });
  }
}

// Export a singleton instance
export const wbSupplierService = new WBSupplierService();
