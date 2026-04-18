/**
 * Promotions Service
 * Handles WB promotions calendar API operations
 */

import { prisma } from '@/config/database';
import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Promotions');
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
  PromotionExcelCreateResponse,
} from '@/types/wb';

// Promotion Excel column mapping: English header -> Russian field name
const promotionExcelColumnMap: Record<string, string> = {
  'Item in promo (Yes / No)': 'Товар уже участвует в акции',
  Brand: 'Бренд',
  Subcategory: 'Предмет',
  Name: 'Наименование',
  'Seller item No.': 'Артикул поставщика',
  'WB item No.': 'Артикул WB',
  'Last barcode': 'Последний баркод',
  'Days listed': 'Количество дней на сайте',
  DSI: 'Оборачиваемость',
  'WB warehouse inventory': 'Остаток товара на складах Wb (шт.)',
  'Seller warehouse inventory': 'Остаток товара на складе продавца Wb (шт.)',
  'Target promo price': 'Плановая цена для акции',
  'Current retail price': 'Текущая розничная цена',
  Валюта: 'Валюта',
  'Minimum price for Smart Promo discount':
    'Минимальная цена для скидки Смарт-промо',
  'Minimum price: Days remaining': 'Минимальная цена: Осталось дней',
  'Smart Promos disabled (Yes / No)': 'Смарт-промо отключены',
  'Days until Smart Promo discount can be changed':
    'Дней до изменения скидки Смарт-промо',
  'Current discount (%)': 'Текущая скидка на сайте, %',
  'Recommended promo discount': 'Загружаемая скидка для участия в акции',
  Status: 'Статус',
};
interface RawExcelResult {
  data: any[][];
  totalRows: number;
  sheetName: string;
  allSheets: string[];
}

// Fields to exclude from the result
const excludedFields = ['Последний баркод', 'Статус'];

/**
 * Normalize header string by replacing non-breaking spaces and trimming
 */
function normalizeHeader(header: string): string {
  return header
    .replace(/\s+/g, ' ') // Replace all whitespace (including non-breaking) with regular space
    .trim();
}

/**
 * Parse promotion Excel data from raw parsed result
 * Row 0 is headers, rows 1+ are data
 */
function parsePromotionExcelData(
  rawResult: RawExcelResult,
): Record<string, any>[] {
  if (!rawResult?.data?.length || rawResult.data.length < 2) {
    return [];
  }

  // Row 0: Headers
  const headers = rawResult.data[0] as string[];

  // Rows 1+: Data
  const dataRows = rawResult.data.slice(1);

  // Normalize the mapping keys for lookup
  const normalizedMapping: Record<string, string> = {};
  for (const [key, value] of Object.entries(promotionExcelColumnMap)) {
    normalizedMapping[normalizeHeader(key)] = value;
  }

  const items: Record<string, any>[] = [];

  for (const row of dataRows) {
    const item: Record<string, any> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = normalizeHeader(String(headers[i] || ''));
      let value = row[i];

      // Map English header to Russian field name
      const fieldName = normalizedMapping[header] || header;

      // Skip excluded fields
      if (excludedFields.includes(fieldName)) {
        continue;
      }

      // Translate Yes/No to Russian for the promo participation field
      if (fieldName === 'Товар уже участвует в акции') {
        value = value === 'Yes' ? 'Да' : value === 'No' ? 'Нет' : value;
      }

      item[fieldName] = value;
    }

    items.push(item);
  }

  // DEBUG: Log first item fields to see what columns are being returned
  if (items.length > 0) {
    logger.info('First item fields:', {
      fieldCount: Object.keys(items[0]).length,
      fields: Object.keys(items[0]),
    });
  }

  return items;
}

export interface PromotionExcelResult {
  items: Record<string, any>[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
}

export interface GetPromotionExcelParams {
  userId: number;
  periodID: number;
  isRecovery: boolean;
  hasStarted?: boolean;
}

interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

/**
 * Resolve account, supplier, envInfo for a user
 */
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

/**
 * Get promotions timeline
 */
export const getPromotionsTimeline = async ({
  userId,
  startDate,
  endDate,
  filter,
}: {
  userId: number;
  startDate?: string;
  endDate?: string;
  filter?: string;
}): Promise<PromotionsTimelineResponse> => {
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
};

/**
 * Get promotion detail by promoID
 */
export const getPromotionDetail = async ({
  userId,
  promoID,
}: {
  userId: number;
  promoID: number;
}): Promise<PromotionDetailResponse> => {
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
};

/**
 * Create promotion Excel report and fetch parsed data
 * Flow: Call init endpoint -> Fetch Excel -> Parse
 */
export const getPromotionExcel = async ({
  userId,
  periodID,
  isRecovery,
  hasStarted,
}: GetPromotionExcelParams): Promise<PromotionExcelResult> => {
  const result: PromotionExcelResult = {
    items: null,
    error: null,
  };

  try {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    // Step 1: Init/create the report based on whether promotion has started
    if (hasStarted === true) {
      // Promotion already started: create excel first, then fetch it
      try {
        await createPromotionExcel(
          periodID,
          accountId,
          supplierId,
          userAgent,
          proxy,
        );
      } catch (createError) {
        logger.warn('Excel create endpoint failed, continuing:', createError);
      }
    } else if (hasStarted === false) {
      // Promotion not started yet: use recovery init
      try {
        await callRecoveryInit(
          periodID,
          isRecovery,
          accountId,
          supplierId,
          userAgent,
          proxy,
        );
      } catch (initError) {
        logger.warn('Recovery init endpoint failed, continuing:', initError);
      }
    } else {
      // Backward compatibility: old clients don't send hasStarted.
      // Preserve original behavior: recovery init + fetch from /excel endpoint.
      try {
        await callRecoveryInit(
          periodID,
          isRecovery,
          accountId,
          supplierId,
          userAgent,
          proxy,
        );
      } catch (initError) {
        logger.warn('Recovery init endpoint failed, continuing:', initError);
      }
    }

    // Wait a bit for the init/create to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Fetch Excel report
    let excelResult: { data?: PromotionExcelGetResponse; error?: string };
    if (hasStarted === true) {
      excelResult = await fetchPromotionExcel(
        periodID,
        accountId,
        supplierId,
        userAgent,
        proxy,
      );
    } else if (hasStarted === false) {
      excelResult = await fetchPromotionRecoveryReport(
        periodID,
        isRecovery,
        accountId,
        supplierId,
        userAgent,
        proxy,
      );
    } else {
      // Backward compatibility: fetch from /excel (original behavior)
      excelResult = await fetchPromotionExcel(
        periodID,
        accountId,
        supplierId,
        userAgent,
        proxy,
      );
    }

    if (excelResult.error || !excelResult.data?.data?.file) {
      result.error =
        excelResult.error ||
        'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
      result.reportPending = true;
      result.estimatedWaitTime = 30;
      return result;
    }

    // Step 3: Parse base64 Excel
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

    // Use dedicated promotion parser
    const items = parsePromotionExcelData(rawResult);
    result.items = items;

    return result;
  } catch (error) {
    logger.error('Error in getPromotionExcel:', error);
    result.error =
      (error as Error).message || 'Failed to fetch promotion Excel';
    return result;
  }
};

/**
 * Create promotion Excel report on WB side
 */
async function createPromotionExcel(
  periodID: number,
  accountId: string,
  supplierId: string,
  userAgent: string,
  proxy: ProxyConfig | undefined,
): Promise<void> {
  const url =
    'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel/create';
  await wbAccountRequest<PromotionExcelCreateResponse>({
    url,
    accountId,
    userAgent,
    proxy,
    supplierId,
    method: 'POST',
    body: {
      periodID,
    },
  });
}

/**
 * Call the recovery init endpoint
 */
async function callRecoveryInit(
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
 * Fetch Excel report from WB (17 columns)
 */
async function fetchPromotionExcel(
  periodID: number,
  accountId: string,
  supplierId: string,
  userAgent: string,
  proxy: ProxyConfig | undefined,
): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
  const fetchUrl =
    `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel` +
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
 * Fetch recovery report from WB (21 columns)
 */
async function fetchPromotionRecoveryReport(
  periodID: number,
  isRecovery: boolean,
  accountId: string,
  supplierId: string,
  userAgent: string,
  proxy: ProxyConfig | undefined,
): Promise<{ data?: PromotionExcelGetResponse; error?: string }> {
  const fetchUrl =
    `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery` +
    `?isRecovery=${encodeURIComponent(isRecovery)}` +
    `&periodID=${encodeURIComponent(periodID)}`;

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
 * Apply promotion recovery with selected items
 * - isRecovery: true = recover (add to promotion)
 * - isRecovery: false = exclude (remove from promotion)
 */
export const applyPromotionRecovery = async ({
  userId,
  periodID,
  selectedItems,
  isRecovery,
}: {
  userId: number;
  periodID: number;
  selectedItems: string[];
  isRecovery: boolean;
}): Promise<{ success: boolean; error: string | null }> => {
  try {
    const ctx = await resolveAccountContext(userId);

    // Fetch Excel (use /recovery endpoint to get full 21 columns like browser)
    await new Promise((r) => setTimeout(r, 1000));
    const excelResult = await fetchPromotionRecoveryReport(
      periodID,
      true, // isRecovery=true
      ctx.accountId,
      ctx.supplierId,
      ctx.userAgent,
      ctx.proxy,
    );

    if (excelResult.error || !excelResult.data?.data?.file) {
      return {
        success: false,
        error: excelResult.error || 'Excel файл не найден.',
      };
    }

    // Parse and filter Excel (column 4 = "Артикул поставщика")
    const { workbook, data } = parseExcelFromBase64(excelResult.data.data.file);
    if (!data.length) {
      return { success: false, error: 'Excel файл пуст.' };
    }

    const { headerRow, filteredRows } = filterExcelRows(data, (row) =>
      selectedItems.includes(String(row[4] || '')),
    );

    if (filteredRows.length === 0) {
      return { success: false, error: 'Выбранные товары не найдены в отчете.' };
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
};
