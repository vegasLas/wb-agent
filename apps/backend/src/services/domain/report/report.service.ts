/**
 * Report Service
 * Handles sales report fetching using the official WB Statistics API.
 * Replaces the legacy cookie-based XLSX report flow with a single
 * official-API call to GET /api/v1/supplier/sales.
 */

import { prisma } from '@/config/database';
import {
  wbOrdersOfficialService,
  resolveOfficialSupplierId,
  mapSaleItemsToSalesReportData,
  mapOrderItemsToOrdersReportData,
} from '@/services/external/wb/official';
import { FriendlyExcelData } from '@/utils/parseExcelDataNode';
import { logger } from '@/utils/logger';
import { convertWarehouseName } from '@/utils/warehouseNames';

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
 * Convert date format from DD.MM.YY to YYYY-MM-DD for API usage
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
 * Get sales report for user using the official WB Statistics API.
 * Replaces the legacy create-order → poll → download-XLSX flow
 * with a single `getSalesInInterval` call.
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Resolve official supplier ID for the Statistics category
    const officialSupplierId = await resolveOfficialSupplierId(
      userId,
      'STATISTICS',
    );

    if (!officialSupplierId) {
      throw new Error(
        'No official Statistics API key configured for this account',
      );
    }

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

    const rawDateFrom = dateFrom || formatShortYear(thirtyDaysAgo);
    const rawDateTo = dateTo || formatShortYear(currentDate);

    // Convert to YYYY-MM-DD for the official API
    const startDate = convertDateFormat(rawDateFrom);
    const endDate = convertDateFormat(rawDateTo);

    logger.info(
      `Fetching official sales report for user ${userId}, date range: ${startDate} - ${endDate}`,
    );

    // Single official-API call replaces create + poll + download
    const sales = await wbOrdersOfficialService.getSalesInInterval({
      supplierId: officialSupplierId,
      startDate,
      endDate,
    });

    // Map upstream sales into aggregated report DTO
    const reportData = mapSaleItemsToSalesReportData(
      sales,
      startDate,
      endDate,
    );

    // Convert warehouse names to Russian (idempotent for already-Russian names)
    const items = reportData.items.map((item) => ({
      ...item,
      warehouse: convertWarehouseName(item.warehouse || ''),
    }));

    const parsedData = {
      items: items as FriendlyExcelData['items'],
      meta: {
        totalItems: items.length,
        sheetName: 'Sales Report',
        allSheets: ['Sales Report'],
        reportInfo: {
          supplier: '',
          dateFrom: startDate,
          dateTo: endDate,
          generatedAt: reportData.meta.generatedAt,
          warehouse: '',
          rawTitle: `Sales report from ${startDate} to ${endDate}`,
        },
      },
    };

    result.parsedData = parsedData;
    return result;
  } catch (error) {
    logger.error('Error in getSalesReport:', error);
    result.error = (error as Error).message;
    return result;
  }
};

/**
 * Get orders report for user using the official WB Statistics API.
 * Returns all orders within the date range, including cancelled ones.
 */
export const getOrdersReport = async ({
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const officialSupplierId = await resolveOfficialSupplierId(
      userId,
      'STATISTICS',
    );

    if (!officialSupplierId) {
      throw new Error(
        'No official Statistics API key configured for this account',
      );
    }

    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    const formatShortYear = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().substring(2);
      return `${day}.${month}.${year}`;
    };

    const rawDateFrom = dateFrom || formatShortYear(thirtyDaysAgo);
    const rawDateTo = dateTo || formatShortYear(currentDate);

    const startDate = convertDateFormat(rawDateFrom);
    const endDate = convertDateFormat(rawDateTo);

    logger.info(
      `Fetching official orders report for user ${userId}, date range: ${startDate} - ${endDate}`,
    );

    const orders = await wbOrdersOfficialService.getOrdersInInterval({
      supplierId: officialSupplierId,
      startDate,
      endDate,
    });

    const reportData = mapOrderItemsToOrdersReportData(
      orders,
      startDate,
      endDate,
    );

    const items = reportData.items.map((item) => ({
      ...item,
      warehouse: convertWarehouseName(item.warehouse || ''),
    }));

    const parsedData = {
      items: items as unknown as FriendlyExcelData['items'],
      meta: {
        totalItems: items.length,
        sheetName: 'Orders Report',
        allSheets: ['Orders Report'],
        reportInfo: {
          supplier: '',
          dateFrom: startDate,
          dateTo: endDate,
          generatedAt: reportData.meta.generatedAt,
          warehouse: '',
          rawTitle: `Orders report from ${startDate} to ${endDate}`,
        },
      },
    };

    result.parsedData = parsedData;
    return result;
  } catch (error) {
    logger.error('Error in getOrdersReport:', error);
    result.error = (error as Error).message;
    return result;
  }
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
