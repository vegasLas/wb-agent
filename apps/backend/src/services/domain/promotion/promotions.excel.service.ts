/**
 * Promotions Excel Service
 * Handles Excel report creation, fetching, parsing, and recovery application.
 * Uses the Strategy pattern to handle different promotion states.
 */

import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import {
  parseExcelFromBase64,
  filterExcelRows,
  buildFilteredExcel,
} from '@/utils/excel';
import {
  parsePromotionExcelData,
  type RawExcelResult,
  type PromotionExcelItem,
} from './promotions.mapper';
import { createLogger } from '@/utils/logger';
import type {
  PromotionExcelGetResponse,
  PromotionExcelCreateResponse,
  PromotionRecoveryInitResponse,
  PromotionRecoveryResponse,
} from '@/types/wb';

const logger = createLogger('PromotionsExcel');

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface PromotionExcelResult {
  items: PromotionExcelItem[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
}

export interface ExcelStrategyContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

/**
 * Strategy for fetching promotion Excel data.
 */
interface PromotionExcelStrategy {
  readonly name: string;
  init(
    periodID: number,
    isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<void>;
  fetch(
    periodID: number,
    isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<{ data?: PromotionExcelGetResponse; error?: string }>;
}

// ─── Strategy: Promotion Already Started ────────────────────────────────────

class StartedPromotionStrategy implements PromotionExcelStrategy {
  readonly name = 'StartedPromotion';

  async init(
    periodID: number,
    _isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<void> {
    const url =
      'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel/create';
    try {
      await wbAccountRequest<PromotionExcelCreateResponse>({
        url,
        accountId: ctx.accountId,
        userAgent: ctx.userAgent,
        proxy: ctx.proxy,
        supplierId: ctx.supplierId,
        method: 'POST',
        body: { periodID },
      });
    } catch (error) {
      logger.warn('Excel create endpoint failed, continuing:', error);
    }
  }

  async fetch(
    periodID: number,
    _isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
    const url =
      `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel` +
      `?periodID=${encodeURIComponent(periodID)}`;

    try {
      const response = await wbAccountRequest<PromotionExcelGetResponse>({
        url,
        accountId: ctx.accountId,
        userAgent: ctx.userAgent,
        proxy: ctx.proxy,
        supplierId: ctx.supplierId,
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
}

// ─── Strategy: Promotion Not Started ────────────────────────────────────────

class UpcomingPromotionStrategy implements PromotionExcelStrategy {
  readonly name = 'UpcomingPromotion';

  async init(
    periodID: number,
    isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<void> {
    const url =
      'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery';
    try {
      await wbAccountRequest<PromotionRecoveryInitResponse>({
        url,
        accountId: ctx.accountId,
        userAgent: ctx.userAgent,
        proxy: ctx.proxy,
        supplierId: ctx.supplierId,
        method: 'POST',
        body: { periodID, isRecovery },
      });
    } catch (error) {
      logger.warn('Recovery init endpoint failed, continuing:', error);
    }
  }

  async fetch(
    periodID: number,
    isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
    const url =
      `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery` +
      `?isRecovery=${encodeURIComponent(isRecovery)}` +
      `&periodID=${encodeURIComponent(periodID)}`;

    try {
      const response = await wbAccountRequest<PromotionExcelGetResponse>({
        url,
        accountId: ctx.accountId,
        userAgent: ctx.userAgent,
        proxy: ctx.proxy,
        supplierId: ctx.supplierId,
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
}

// ─── Strategy: Legacy (backward compatible) ─────────────────────────────────

class LegacyPromotionStrategy implements PromotionExcelStrategy {
  readonly name = 'LegacyPromotion';

  async init(
    periodID: number,
    isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<void> {
    // Same as upcoming: recovery init + fetch from /excel
    const upcoming = new UpcomingPromotionStrategy();
    await upcoming.init(periodID, isRecovery, ctx);
  }

  async fetch(
    periodID: number,
    _isRecovery: boolean,
    ctx: ExcelStrategyContext,
  ): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
    // Fetch from /excel endpoint (original behavior)
    const started = new StartedPromotionStrategy();
    return started.fetch(periodID, _isRecovery, ctx);
  }
}

// ─── Strategy Resolver ──────────────────────────────────────────────────────

function resolveStrategy(hasStarted?: boolean): PromotionExcelStrategy {
  if (hasStarted === true) return new StartedPromotionStrategy();
  if (hasStarted === false) return new UpcomingPromotionStrategy();
  return new LegacyPromotionStrategy();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface GetPromotionExcelParams {
  userId: number;
  periodID: number;
  isRecovery: boolean;
  hasStarted?: boolean;
}

/**
 * Create promotion Excel report and fetch parsed data.
 * Flow: Determine strategy → Init → Fetch → Parse
 */
export async function getPromotionExcel(
  params: GetPromotionExcelParams,
  ctx: ExcelStrategyContext,
): Promise<PromotionExcelResult> {
  const { periodID, isRecovery, hasStarted } = params;
  const result: PromotionExcelResult = {
    items: null,
    error: null,
  };

  try {
    const strategy = resolveStrategy(hasStarted);
    logger.info(`Using Excel strategy: ${strategy.name}`);

    // Step 1: Init/create the report
    await strategy.init(periodID, isRecovery, ctx);

    // Step 2: Wait a bit for the init/create to take effect
    await delay(1000);

    // Step 3: Fetch Excel report
    const excelResult = await strategy.fetch(periodID, isRecovery, ctx);

    if (excelResult.error || !excelResult.data?.data?.file) {
      result.error =
        excelResult.error ||
        'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
      result.reportPending = true;
      result.estimatedWaitTime = 30;
      return result;
    }

    // Step 4: Parse base64 Excel
    const {
      data: jsonData,
      sheetName,
      allSheets,
    } = parseExcelFromBase64(excelResult.data.data.file);

    const rawResult: RawExcelResult = {
      data: jsonData,
      totalRows: jsonData.length,
      sheetName,
      allSheets,
    };

    const items = parsePromotionExcelData(rawResult);
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
 * Fetch the recovery report (21 columns) for applying recovery.
 */
export async function fetchRecoveryReport(
  periodID: number,
  isRecovery: boolean,
  ctx: ExcelStrategyContext,
): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
  const strategy = new UpcomingPromotionStrategy();
  return strategy.fetch(periodID, isRecovery, ctx);
}

/**
 * Apply promotion recovery with selected items.
 */
export async function applyPromotionRecovery(
  params: {
    userId: number;
    periodID: number;
    selectedItems: string[];
    isRecovery: boolean;
  },
  ctx: ExcelStrategyContext,
): Promise<{ success: boolean; error: string | null }> {
  const { periodID, selectedItems, isRecovery } = params;

  try {
    // Fetch recovery report
    const excelResult = await fetchRecoveryReport(periodID, isRecovery, ctx);

    if (excelResult.error || !excelResult.data?.data?.file) {
      return {
        success: false,
        error: excelResult.error || 'Excel файл не найден.',
      };
    }

    // Parse and filter Excel
    const { workbook, data } = parseExcelFromBase64(excelResult.data.data.file);
    if (!data.length) {
      return { success: false, error: 'Excel файл пуст.' };
    }

    // Find vendor code column index from headers
    const headers = data[0] as string[];
    const vendorCodeIndex = headers.findIndex(
      (h) => h === 'Артикул поставщика',
    );

    if (vendorCodeIndex === -1) {
      return {
        success: false,
        error: 'Не найдена колонка Артикул поставщика в Excel.',
      };
    }

    const { headerRow, filteredRows } = filterExcelRows(data, (row) =>
      selectedItems.includes(String(row[vendorCodeIndex] ?? '')),
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
      body: { periodID, isRecovery: !isRecovery, file: base64File },
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('applyPromotionRecovery error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
