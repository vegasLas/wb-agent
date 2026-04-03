/**
 * Orders Controller
 * Migrated from deprecated project server/controllers/orders/*.ts
 * Handles order report operations
 */

import { wbAccountRequest } from '../utils/wb-request';
import { ProxyConfig } from '../utils/wb-request';
import { logger } from '../utils/logger';

interface NewOrderResponse {
  data: {
    id: string;
    createdAt?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

interface OrdersListResponse {
  data: Array<{
    id: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    createdAt: string;
  }>;
}

interface XlsxReportResponse {
  data: string;
  error: boolean;
  errorText: string;
  additionalErrors: any;
}

/**
 * Create a new sales order report
 */
export const createSalesOrder = async ({
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
}): Promise<NewOrderResponse> => {
  try {
    const response = await wbAccountRequest<NewOrderResponse>({
      url: `https://seller-weekly-report.wildberries.ru/ns/reportsviewer/analytics-back/api/report/supplier-goods/order?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Failed to create sales order');
  }
};

/**
 * Fetch XLSX report by report ID
 * Returns JSON with base64 encoded data
 * EXACT implementation from deprecated project
 */
export const fetchReportXlsx = async ({
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
}): Promise<{ data: string }> => {
  try {
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
  } catch (error: unknown) {
    logger.error('Error fetching XLSX report:', error);
    const err = error as { message?: string };
    throw new Error(err.message || 'Failed to fetch report XLSX');
  }
};

/**
 * Get all orders for a supplier
 */
export const getAllOrders = async ({
  accountId,
  supplierId,
  userAgent,
  proxy,
}: {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy?: ProxyConfig;
}): Promise<OrdersListResponse> => {
  try {
    const response = await wbAccountRequest<OrdersListResponse>({
      url: 'https://seller-weekly-report.wildberries.ru/ns/reportsviewer/analytics-back/api/report/supplier-goods/orders',
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || 'Failed to fetch orders');
  }
};

// Export all functions
export default {
  createSalesOrder,
  fetchReportXlsx,
  getAllOrders,
};
