/**
 * WB Cookie Promotion Service
 * Handles WB promotions calendar API calls using browser cookies
 * Domain: discounts-prices.wildberries.ru
 */

import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';
import {
  parseExcelFromBase64,
  filterExcelRows,
  buildFilteredExcel,
} from '@/utils/excel';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionExcelGetResponse,
  PromotionRecoveryResponse,
  PromotionRecoveryInitResponse,
} from '@/types/wb';
import { prisma } from '@/config/database';

const logger = createLogger('Promotions');

interface RawExcelResult {
  data: any[][];
  totalRows: number;
  sheetName: string;
  allSheets: string[];
}

interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

async function resolveAccountContext(userId: number): Promise<AccountContext> {
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

  const account = user.accounts.find((a) => a.id === user.selectedAccountId);
  if (!account) {
    throw new Error('No account selected for user');
  }

  const supplierId =
    account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new Error('No supplier found for account');
  }

  const envInfo = user.envInfo as unknown as {
    userAgent?: string;
    proxy?: ProxyConfig;
  } | null;

  const userAgent =
    envInfo?.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const proxy = envInfo?.proxy;

  return {
    accountId: account.id,
    supplierId,
    userAgent,
    proxy,
  };
}

export interface PromotionExcelResult {
  items: Record<string, any>[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
}

export class WBCookiePromotionService {
  /**
   * Get promotions timeline
   */
  async getPromotionsTimeline({
    userId,
    startDate,
    endDate,
    filter,
  }: {
    userId: number;
    startDate?: string;
    endDate?: string;
    filter?: string;
  }): Promise<PromotionsTimelineResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const defaultEnd = new Date(now.getFullYear() + 1, 11, 31).toISOString();

    const finalStartDate = startDate || defaultStart;
    const finalEndDate = endDate || defaultEnd;
    const finalFilter = filter || 'PARTICIPATING';

    const url =
      `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/web/api/v3/promotions/timeline` +
      `?endDate=${encodeURIComponent(finalEndDate)}` +
      `&filter=${encodeURIComponent(finalFilter)}` +
      `&startDate=${encodeURIComponent(finalStartDate)}`;

    return wbAccountRequest<PromotionsTimelineResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }

  /**
   * Get promotion detail by promoID
   */
  async getPromotionDetail({
    userId,
    promoID,
  }: {
    userId: number;
    promoID: number;
  }): Promise<PromotionDetailResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/web/api/v3/promotions/detail` +
      `?promoID=${encodeURIComponent(promoID)}`;

    return wbAccountRequest<PromotionDetailResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }

  /**
   * Create promotion Excel report and fetch parsed data
   */
  async getPromotionExcel({
    userId,
    periodID,
    isRecovery,
  }: {
    userId: number;
    periodID: number;
    isRecovery: boolean;
  }): Promise<PromotionExcelResult> {
    const result: PromotionExcelResult = {
      items: null,
      error: null,
    };

    try {
      const { accountId, supplierId, userAgent, proxy } =
        await resolveAccountContext(userId);

      // Step 1: Call init endpoint
      try {
        await this.callRecoveryInit(
          periodID,
          isRecovery,
          accountId,
          supplierId,
          userAgent,
          proxy,
        );
      } catch (initError) {
        logger.warn('Init endpoint failed, continuing:', initError);
      }

      // Wait a bit for the init to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Fetch Excel report
      const excelResult = await this.fetchPromotionExcelReport(
        periodID,
        accountId,
        supplierId,
        userAgent,
        proxy,
      );

      if (excelResult.error || !excelResult.data?.data?.file) {
        result.error =
          excelResult.error ||
          'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
        result.reportPending = true;
        result.estimatedWaitTime = 30;
        return result;
      }

      // Step 3: Parse base64 Excel
      const { data: jsonData } = parseExcelFromBase64(
        excelResult.data.data.file,
      );

      const rawResult: RawExcelResult = {
        data: jsonData,
        totalRows: jsonData.length,
        sheetName: '',
        allSheets: [],
      };

      // Parse promotion Excel data
      const items = this.parsePromotionExcelData(rawResult);
      result.items = items;

      return result;
    } catch (error) {
      logger.error('Error in getPromotionExcel:', error);
      result.error =
        (error as Error).message || 'Failed to fetch promotion Excel';
      return result;
    }
  }

  /**
   * Apply promotion recovery with selected items
   */
  async applyPromotionRecovery({
    userId,
    periodID,
    selectedItems,
    isRecovery,
  }: {
    userId: number;
    periodID: number;
    selectedItems: string[];
    isRecovery: boolean;
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await resolveAccountContext(userId);

      // Fetch Excel (use /recovery endpoint)
      await new Promise((r) => setTimeout(r, 1000));
      const excelResult = await this.fetchPromotionExcelReport(
        periodID,
        ctx.accountId,
        ctx.supplierId,
        ctx.userAgent,
        ctx.proxy,
        true,
        true,
      );

      if (excelResult.error || !excelResult.data?.data?.file) {
        return {
          success: false,
          error: excelResult.error || 'Excel файл не найден.',
        };
      }

      // Parse and filter Excel
      const { workbook, data } = parseExcelFromBase64(
        excelResult.data.data.file,
      );
      if (!data.length) {
        return { success: false, error: 'Excel файл пуст.' };
      }

      const { headerRow, filteredRows } = filterExcelRows(data, (row) =>
        selectedItems.includes(String(row[4] || '')),
      );

      if (filteredRows.length === 0) {
        return {
          success: false,
          error: 'Выбранные товары не найдены в отчете.',
        };
      }

      // Build filtered Excel and send to WB
      const base64File = buildFilteredExcel(
        workbook,
        filteredRows,
        headerRow.length,
      );
      await wbAccountRequest<PromotionRecoveryResponse>({
        url: 'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery/apply',
        accountId: ctx.accountId,
        userAgent: ctx.userAgent,
        proxy: ctx.proxy,
        supplierId: ctx.supplierId,
        method: 'POST',
        body: { periodID, isRecovery, file: base64File },
      });

      return { success: true, error: null };
    } catch (error) {
      logger.error('applyPromotionRecovery error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Call the recovery init endpoint
   */
  private async callRecoveryInit(
    periodID: number,
    isRecovery: boolean,
    accountId: string,
    supplierId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
  ): Promise<void> {
    const initUrl =
      'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery';
    await wbAccountRequest<PromotionRecoveryInitResponse>({
      url: initUrl,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: {
        periodID,
        isRecovery,
      },
    });
  }

  /**
   * Fetch Excel report from WB
   */
  private async fetchPromotionExcelReport(
    periodID: number,
    accountId: string,
    supplierId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    useRecoveryEndpoint = false,
    isRecovery = true,
  ): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
    const fetchUrl = useRecoveryEndpoint
      ? `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery` +
        `?isRecovery=${encodeURIComponent(isRecovery)}` +
        `&periodID=${encodeURIComponent(periodID)}`
      : `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel` +
        `?periodID=${encodeURIComponent(periodID)}`;

    try {
      const response = await wbAccountRequest<PromotionExcelGetResponse>({
        url: fetchUrl,
        accountId,
        userAgent,
        proxy,
        supplierId,
        method: 'GET',
      });

      if (response?.data?.file) {
        return { data: response };
      }

      return { error: 'Excel файл не найден' };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  /**
   * Parse promotion Excel data
   */
  private parsePromotionExcelData(
    rawResult: RawExcelResult,
  ): Record<string, any>[] {
    if (!rawResult?.data?.length || rawResult.data.length < 2) {
      return [];
    }

    const headers = rawResult.data[0] as string[];
    const dataRows = rawResult.data.slice(1);
    const items: Record<string, any>[] = [];

    for (const row of dataRows) {
      const item: Record<string, any> = {};
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || '').trim();
        item[header] = row[i];
      }
      items.push(item);
    }

    return items;
  }
}

export const wbCookiePromotionService = new WBCookiePromotionService();

// Individual function exports for backward compatibility
export const getPromotionsTimeline =
  wbCookiePromotionService.getPromotionsTimeline.bind(wbCookiePromotionService);
export const getPromotionDetail =
  wbCookiePromotionService.getPromotionDetail.bind(wbCookiePromotionService);
export const getPromotionExcel =
  wbCookiePromotionService.getPromotionExcel.bind(wbCookiePromotionService);
export const applyPromotionRecovery =
  wbCookiePromotionService.applyPromotionRecovery.bind(
    wbCookiePromotionService,
  );
