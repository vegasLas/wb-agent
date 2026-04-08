/**
 * WB Cookie Report Service
 * Handles WB report and analytics API calls using browser cookies
 * Domain: seller-weekly-report.wildberries.ru
 */

import { wbAccountRequest } from "@/utils/wb-request";
import type { ProxyConfig } from "@/utils/wb-request";
import {
  BalancesParams,
  BalancesResponse,
  MeasurementPenaltiesParams,
  MeasurementPenaltiesResponse,
} from "@/types/wb";

export interface NewOrderResponse {
  data: {
    id: string;
    createdAt?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface OrdersListResponse {
  data: Array<{
    id: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    createdAt: string;
  }>;
}

export interface XlsxReportResponse {
  data: string;
  error: boolean;
  errorText: string;
  additionalErrors: any;
}

export class WBCookieReportService {
  /**
   * Get balances from WB API
   */
  async getBalances({
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

  /**
   * Get measurement penalties from WB API
   */
  async getMeasurementPenalties({
    accountId,
    supplierId,
    params,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    params: MeasurementPenaltiesParams;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<MeasurementPenaltiesResponse> {
    const url =
      `https://seller-weekly-report.wildberries.ru/ns/dimensionpenalty/analytics-back/api/v1/measurement-penalties` +
      `?dateFrom=${encodeURIComponent(params.dateFrom)}` +
      `&dateTo=${encodeURIComponent(params.dateTo)}` +
      `&limit=${params.limit ?? 10}` +
      `&offset=${params.offset ?? 0}`;

    return wbAccountRequest<MeasurementPenaltiesResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }

  /**
   * Create a new sales order report
   */
  async createSalesOrder({
    accountId,
    supplierId,
    userAgent,
    proxy,
    dateFrom,
    dateTo,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
    dateFrom: string;
    dateTo: string;
  }): Promise<NewOrderResponse> {
    return wbAccountRequest<NewOrderResponse>({
      url: `https://seller-weekly-report.wildberries.ru/ns/reportsviewer/analytics-back/api/report/supplier-goods/order?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
    });
  }

  /**
   * Fetch XLSX report by report ID
   */
  async fetchReportXlsx({
    accountId,
    supplierId,
    userAgent,
    proxy,
    reportId,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
    reportId: string;
  }): Promise<{ data: string }> {
    const url = `https://seller-weekly-report.wildberries.ru/ns/reportsviewer/analytics-back/api/report/supplier-goods/xlsx/${reportId}`;

    const response = await wbAccountRequest<XlsxReportResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    if (response.error) {
      throw new Error(response.errorText || 'Failed to fetch XLSX');
    }

    return { data: response.data };
  }

  /**
   * Get all orders for a supplier
   */
  async getAllOrders({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<OrdersListResponse> {
    return wbAccountRequest<OrdersListResponse>({
      url: 'https://seller-weekly-report.wildberries.ru/ns/reportsviewer/analytics-back/api/report/supplier-goods/orders',
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }
}

export const wbCookieReportService = new WBCookieReportService();
