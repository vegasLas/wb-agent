/**
 * Report Service
 * Handles sales report fetching, order management, and Excel parsing
 * Migrated from deprecated project server/api/v1/report/index.get.ts
 */

import { prisma } from '@/config/database';
import {
  parseExcelDataNode,
  FriendlyExcelData,
} from '@/utils/parseExcelDataNode';
import * as ordersController from '@/controllers/orders.controller';
import { logger } from '@/utils/logger';
import { convertWarehouseName } from '@/utils/warehouseNames';
import type { ProxyConfig } from '@/utils/wb-request';

export interface OrderSummary {
  id: string;
  createdAt: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportResult {
  selectedOrder: OrderSummary | null;
  parsedData: FriendlyExcelData | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
}

export interface ReportRequestParams {
  userId: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get or create sales report for user
 * Main orchestration function that:
 * 1. Validates user subscription and account
 * 2. Checks for existing reports
 * 3. Creates new report if needed
 * 4. Fetches and parses XLSX data
 */
export const getSalesReport = async ({
  userId,
  dateFrom,
  dateTo,
}: ReportRequestParams): Promise<ReportResult> => {
  const result: ReportResult = {
    selectedOrder: null,
    parsedData: null,
    error: null,
  };

  try {
    // Get user with subscription check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          include: {
            suppliers: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check subscription
    if (
      !user.subscriptionExpiresAt ||
      new Date(user.subscriptionExpiresAt) <= new Date()
    ) {
      throw new Error('Для получения отчетов требуется активная подписка');
    }

    // Get selected account
    const account = user.accounts.find((a) => a.id === user.selectedAccountId);

    if (!account) {
      throw new Error('No account selected for user');
    }

    if (!account) {
      throw new Error('Selected account not found');
    }

    const accountId = account.id;
    const supplierId =
      account.selectedSupplierId || account.suppliers[0]?.supplierId;

    if (!supplierId) {
      throw new Error('No supplier found for account');
    }

    // Get user envInfo for proxy and userAgent
    const envInfo = user.envInfo as unknown as {
      userAgent?: string;
      proxy?: ProxyConfig;
    } | null;

    // Set default date range if not provided (last 30 days)
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    const formatShortYear = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().substring(2);
      return `${day}.${month}.${year}`;
    };

    const finalDateFrom = dateFrom || formatShortYear(thirtyDaysAgo);
    const finalDateTo = dateTo || formatShortYear(currentDate);

    // Get account environment info for WB requests
    const userAgent =
      envInfo?.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const proxy = envInfo?.proxy;

    // Fetch all existing orders
    const ordersResponse = await ordersController.getAllOrders({
      accountId,
      supplierId,
      userAgent,
      proxy,
    });

    // Look for existing report with matching date range
    let existingOrder: OrderSummary | null = null;

    if (ordersResponse?.data?.length > 0) {
      const requestDateFrom = convertDateFormat(finalDateFrom);
      const requestDateTo = convertDateFormat(finalDateTo);

      existingOrder =
        ordersResponse.data.find(
          (order) =>
            order.dateFrom === requestDateFrom &&
            order.dateTo === requestDateTo,
        ) || null;
    }

    let orderToUse: OrderSummary;

    // Create new order if no matching report found
    if (!existingOrder) {
      const orderResponse = await ordersController.createSalesOrder({
        accountId,
        supplierId,
        userAgent,
        proxy,
        dateFrom: finalDateFrom,
        dateTo: finalDateTo,
      });

      // Wait for report generation to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (orderResponse?.data?.id) {
        orderToUse = {
          id: orderResponse.data.id,
          createdAt: orderResponse.data.createdAt || new Date().toISOString(),
          dateFrom: orderResponse.data.dateFrom || finalDateFrom,
          dateTo: orderResponse.data.dateTo || finalDateTo,
        };
      } else {
        // Fallback to most recent order
        if (ordersResponse?.data?.length > 0) {
          const sortedOrders = [...ordersResponse.data].sort(
            (a: OrderSummary, b: OrderSummary) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          orderToUse = sortedOrders[0];
        } else {
          result.error = 'Failed to create order and no existing orders found';
          return result;
        }
      }
    } else {
      orderToUse = existingOrder;
    }

    // Fetch and parse XLSX data
    try {
      result.selectedOrder = orderToUse;

      const xlsxResponse = await ordersController.fetchReportXlsx({
        accountId,
        supplierId,
        userAgent,
        proxy,
        reportId: orderToUse.id,
      });

      if (xlsxResponse?.data) {
        const parsedData = parseExcelDataNode(xlsxResponse.data);

        // Convert warehouse names to Russian
        if (parsedData?.items) {
          parsedData.items = parsedData.items.map((item) => ({
            ...item,
            warehouse: convertWarehouseName(item.warehouse || ''),
          }));
        }

        result.parsedData = parsedData;
      } else {
        result.parsedData = null;
        result.error = 'Empty response from report API';
      }
    } catch (error) {
      logger.error('Error fetching or parsing XLSX:', error);
      result.parsedData = null;
      result.error =
        'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
      result.reportPending = true;
      result.estimatedWaitTime = 30;
    }

    return result;
  } catch (error) {
    logger.error('Error in getSalesReport:', error);
    result.error = (error as Error).message;
    return result;
  }
};

/**
 * Convert date format from DD.MM.YY to YYYY-MM-DD for comparison
 */
const convertDateFormat = (date: string): string => {
  if (date.includes('.')) {
    const [day, month, shortYear] = date.split('.');
    const fullYear = shortYear?.length === 2 ? `20${shortYear}` : shortYear;
    return `${fullYear}-${month}-${day}`;
  }
  return date;
};

/**
 * Clear old reports (utility function for cleanup)
 */
export const cleanupOldReports = async (
  userId: number,
  keepCount = 5,
): Promise<void> => {
  // TODO: implement cleanup logic
  void userId;
  void keepCount;
};
