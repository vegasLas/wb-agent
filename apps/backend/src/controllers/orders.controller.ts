/**
 * Orders Controller
 * Migrated from deprecated project server/controllers/orders/*.ts
 * Handles order report operations
 */

import { wbAccountRequest } from '../utils/wb-request';
import { ProxyConfig } from '../utils/wb-request';

interface NewOrderResponse {
  data: {
    reportId: string;
  };
}

interface XlsxReportResponse {
  data: Buffer;
}

interface OrdersListResponse {
  data: Array<{
    id: string;
    dateFrom: string;
    dateTo: string;
    status: string;
  }>;
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
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create sales order');
  }
};

/**
 * Fetch XLSX report by report ID
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
}): Promise<XlsxReportResponse> => {
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

    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch report XLSX');
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
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch orders');
  }
};

// Export all functions
export default {
  createSalesOrder,
  fetchReportXlsx,
  getAllOrders,
};
