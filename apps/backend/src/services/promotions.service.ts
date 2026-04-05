/**
 * Promotions Service
 * Handles WB promotions calendar API operations
 */

import { prisma } from '../config/database';
import { wbAccountRequest } from '../utils/wb-request';
import type { ProxyConfig } from '../utils/wb-request';
import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionExcelGetResponse,
  PromotionRecoveryResponse,
  PromotionRecoveryInitResponse,
} from '../types/wb';

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

  return items;
}

export interface PromotionExcelResult {
  items: Record<string, any>[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
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
}: {
  userId: number;
  periodID: number;
  isRecovery: boolean;
}): Promise<PromotionExcelResult> => {
  const result: PromotionExcelResult = {
    items: null,
    error: null,
  };

  try {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    // Step 1: Call init endpoint with user's isRecovery flag
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
      logger.warn('Init endpoint failed, continuing:', initError);
    }

    // Wait a bit for the init to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Fetch Excel report
    const excelResult = await fetchPromotionExcelReport(
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
    const binaryString = atob(excelResult.data.data.file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    const rawResult: RawExcelResult = {
      data: jsonData as any[][],
      totalRows: jsonData.length,
      sheetName,
      allSheets: workbook.SheetNames,
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
 * Fetch Excel report from WB
 * Simple fetch without any retry/init logic
 */
async function fetchPromotionExcelReport(
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
 * Apply promotion recovery with selected items
 * Flow: Call init endpoint (inverted) -> Fetch Excel -> Filter -> Call apply
 *
 * The Excel always contains only the selected items
 * The isRecovery flag determines the action on those items:
 * - isRecovery: true = recover the selected items (add to promotion)
 * - isRecovery: false = exclude the selected items (remove from promotion)
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
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    // Step 1: Call init endpoint with inverted isRecovery flag
    try {
      await callRecoveryInit(
        periodID,
        !isRecovery, // Inverted flag
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
    const excelResult = await fetchPromotionExcelReport(
      periodID,
      accountId,
      supplierId,
      userAgent,
      proxy,
    );

    if (excelResult.error || !excelResult.data?.data?.file) {
      return {
        success: false,
        error: excelResult.error || 'Excel файл не найден.',
      };
    }

    // Step 2: Parse the Excel file
    const binaryString = atob(excelResult.data.data.file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to array format (header: 1 means array of arrays)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as any[][];

    if (!jsonData.length || jsonData.length < 1) {
      return {
        success: false,
        error: 'Excel файл пуст или имеет неверный формат.',
      };
    }

    // Step 3: Filter data - always include only selected items
    // Column index 4 is "Артикул поставщика"
    const headerRow = jsonData[0];
    const dataRows = jsonData.slice(1);

    // In both cases (isRecovery: true or false), include only selected items
    const filteredRows = dataRows.filter((row) => {
      const supplierArticle = String(row[4] || '');
      return selectedItems.includes(supplierArticle);
    });

    // WB API requires all rows to be filled in - no empty rows allowed
    if (filteredRows.length === 0) {
      return {
        success: false,
        error: 'Выбранные товары не найдены в отчете. Пожалуйста, обновите список и попробуйте снова.',
      };
    }

    // Only include header and rows with actual data
    const finalData = [headerRow, ...filteredRows];

    // Step 4: Create new Excel workbook
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(finalData);

    // Set column widths (optional, for better formatting)
    const colWidths = headerRow.map(() => ({ wch: 20 }));
    newWorksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    // Step 5: Convert to base64 (without data URI prefix)
    const base64File = XLSX.write(newWorkbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    // Step 6: Call WB recovery apply API with user's isRecovery flag
    const recoveryUrl =
      'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/recovery/apply';

    await wbAccountRequest<PromotionRecoveryResponse>({
      url: recoveryUrl,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: {
        periodID,
        isRecovery, // Pass user's isRecovery flag (true = recover, false = exclude)
        file: base64File,
      },
    });

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    logger.error('Error in applyPromotionRecovery:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to apply promotion recovery',
    };
  }
};
