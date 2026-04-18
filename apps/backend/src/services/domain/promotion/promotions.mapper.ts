/**
 * Promotions Mapper
 * Transforms raw WB API responses into application-level types.
 */

import { logger } from '@/utils/logger';

// ─── Excel Column Mapping ───────────────────────────────────────────────────

/** English header → Russian field name (as sent by WB) */
export const PROMOTION_EXCEL_COLUMN_MAP: Record<string, string> = {
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

/** Fields excluded from the parsed result */
const EXCLUDED_FIELDS = ['Последний баркод', 'Статус'];

/** Normalized header → camelCase property name */
export const EXCEL_FIELD_TO_CAMEL_CASE: Record<string, string> = {
  'Товар уже участвует в акции': 'inPromo',
  Бренд: 'brand',
  Предмет: 'subject',
  Наименование: 'name',
  'Артикул поставщика': 'vendorCode',
  'Артикул WB': 'wbCode',
  'Количество дней на сайте': 'daysOnSite',
  Оборачиваемость: 'turnover',
  'Остаток товара на складах Wb (шт.)': 'wbStock',
  'Остаток товара на складе продавца Wb (шт.)': 'sellerStock',
  'Плановая цена для акции': 'promoPrice',
  'Текущая розничная цена': 'currentPrice',
  Валюта: 'currency',
  'Текущая скидка на сайте, %': 'currentDiscount',
  'Загружаемая скидка для участия в акции': 'uploadedDiscount',
};

/** Canonical camelCase keys for a promotion Excel item */
export interface PromotionExcelItem {
  inPromo: string;
  brand: string;
  subject: string;
  name: string;
  vendorCode: string;
  wbCode: string;
  daysOnSite: number;
  turnover: number;
  wbStock: number;
  sellerStock: number;
  promoPrice: number;
  currentPrice: number;
  currency: string;
  currentDiscount: number;
  uploadedDiscount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeHeader(header: string): string {
  return header.replace(/\s+/g, ' ').trim();
}

function parseYesNo(value: unknown): string {
  if (value === 'Yes') return 'Да';
  if (value === 'No') return 'Нет';
  return String(value ?? '');
}

function parseNumeric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(/,/g, '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ─── Raw Excel Parsing ──────────────────────────────────────────────────────

export interface RawExcelResult {
  data: unknown[][];
  totalRows: number;
  sheetName: string;
  allSheets: string[];
}

/**
 * Parse promotion Excel data from raw parsed result.
 * Row 0 is headers, rows 1+ are data.
 */
export function parsePromotionExcelData(
  rawResult: RawExcelResult,
): PromotionExcelItem[] {
  if (!rawResult?.data?.length || rawResult.data.length < 2) {
    return [];
  }

  const headers = (rawResult.data[0] as unknown[]).map((h) =>
    normalizeHeader(String(h ?? '')),
  );
  const dataRows = rawResult.data.slice(1);

  // Build normalized mapping for lookup
  const normalizedMapping: Record<string, string> = {};
  for (const [key, value] of Object.entries(PROMOTION_EXCEL_COLUMN_MAP)) {
    normalizedMapping[normalizeHeader(key)] = value;
  }

  // Build field name → camelCase mapping
  const headerToCamelCase: Record<string, string> = {};
  for (const header of headers) {
    const russianName = normalizedMapping[header] || header;
    const camelCase = EXCEL_FIELD_TO_CAMEL_CASE[russianName];
    if (camelCase) {
      headerToCamelCase[russianName] = camelCase;
    }
  }

  const items: PromotionExcelItem[] = [];

  for (const row of dataRows) {
    const raw: Record<string, unknown> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = normalizeHeader(String(headers[i] || ''));
      const fieldName = normalizedMapping[header] || header;

      if (EXCLUDED_FIELDS.includes(fieldName)) {
        continue;
      }

      let value: unknown = (row as unknown[])[i];

      if (fieldName === 'Товар уже участвует в акции') {
        value = parseYesNo(value);
      }

      raw[fieldName] = value;
    }

    const mapped = mapRawExcelRowToItem(raw, headerToCamelCase);
    if (mapped) {
      items.push(mapped);
    }
  }

  if (items.length > 0) {
    logger.info('Parsed promotion Excel', {
      fieldCount: Object.keys(items[0]).length,
      items: items.length,
    });
  }

  return items;
}

/**
 * Map a raw Excel row (Russian field names) to a canonical PromotionExcelItem.
 */
function mapRawExcelRowToItem(
  raw: Record<string, unknown>,
  headerToCamelCase: Record<string, string>,
): PromotionExcelItem | null {
  const get = (russianKey: string): unknown => {
    const camelKey = headerToCamelCase[russianKey];
    return raw[russianKey] ?? raw[camelKey] ?? '';
  };

  const vendorCode = String(get('Артикул поставщика') ?? '').trim();
  if (!vendorCode) {
    // Skip rows without a vendor code — they are likely empty or malformed
    return null;
  }

  return {
    inPromo: String(get('Товар уже участвует в акции') ?? 'Нет'),
    brand: String(get('Бренд') ?? ''),
    subject: String(get('Предмет') ?? ''),
    name: String(get('Наименование') ?? ''),
    vendorCode,
    wbCode: String(get('Артикул WB') ?? ''),
    daysOnSite: parseNumeric(get('Количество дней на сайте')),
    turnover: parseNumeric(get('Оборачиваемость')),
    wbStock: parseNumeric(get('Остаток товара на складах Wb (шт.)')),
    sellerStock: parseNumeric(
      get('Остаток товара на складе продавца Wb (шт.)'),
    ),
    promoPrice: parseNumeric(get('Плановая цена для акции')),
    currentPrice: parseNumeric(get('Текущая розничная цена')),
    currency: String(get('Валюта') ?? ''),
    currentDiscount: parseNumeric(get('Текущая скидка на сайте, %')),
    uploadedDiscount: parseNumeric(
      get('Загружаемая скидка для участия в акции'),
    ),
  };
}
