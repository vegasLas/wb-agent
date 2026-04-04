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
  PromotionExcelCreateResponse,
  PromotionExcelGetResponse,
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

/**
 * Resolve account, supplier, envInfo for a user
 */
async function resolveAccountContext(userId: number) {
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
 */
export const getPromotionExcel = async ({
  userId,
  periodID,
}: {
  userId: number;
  periodID: number;
}): Promise<PromotionExcelResult> => {
  const result: PromotionExcelResult = {
    items: null,
    error: null,
  };

  try {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    // Step 1: Create Excel report
    const createUrl =
      'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel/create';

    await wbAccountRequest<PromotionExcelCreateResponse>({
      url: createUrl,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: { periodID },
    });

    // Wait for report generation to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Fetch Excel report
    const fetchUrl =
      `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/suppliers/api/v2/excel` +
      `?periodID=${encodeURIComponent(periodID)}`;

    const response = await wbAccountRequest<PromotionExcelGetResponse>({
      url: fetchUrl,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    if (response?.data?.file) {
      // Parse base64 Excel
      const binaryString = atob(response.data.file);
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
    } else {
      result.error =
        'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
      result.reportPending = true;
      result.estimatedWaitTime = 30;
    }

    return result;
  } catch (error) {
    logger.error('Error in getPromotionExcel:', error);
    result.error =
      (error as Error).message || 'Failed to fetch promotion Excel';
    return result;
  }
};
