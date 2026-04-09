/**
 * Excel Data Parser Utility
 * Migrated from deprecated project server/utils/parseExcelDataNode.ts
 * Parses base64-encoded Excel data from WB API into friendly format
 */

import * as XLSX from 'xlsx';
import { logger } from '@/utils/logger';

export interface ParseOptions {
  header?: boolean;
  sheet?: string | null;
  columnMapping?: Record<string, string>;
}

export interface RawExcelData {
  data: any[];
  totalRows: number;
  sheetName: string;
  allSheets: string[];
}

export interface ExcelItem {
  brand: string;
  category: string;
  season: string;
  collection: string;
  productName: string;
  vendorCode: string;
  wbArticle: number;
  barcode: string;
  size: string;
  contract: string;
  warehouse: string;
  orderedQty: number;
  orderedSum: number;
  purchasedQty: number;
  purchasedSum: number;
  stockQty: number;
}

export interface ReportInfo {
  supplier: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  warehouse: string;
  rawTitle: string;
}

export interface FriendlyExcelData {
  items: ExcelItem[];
  meta: {
    totalItems: number;
    sheetName: string;
    allSheets: string[];
    reportInfo: ReportInfo;
  };
}

/**
 * Parses base64-encoded Excel data into a JavaScript object
 * @param base64data - Base64 encoded Excel file data
 * @param options - Optional parsing configuration
 * @returns Parsed Excel data in friendly format
 */
export const parseExcelDataNode = (
  base64data: string,
  options: ParseOptions = {},
): FriendlyExcelData => {
  const { header = true, sheet = null } = options;

  try {
    // Convert base64 to binary string using atob
    const binaryString = atob(base64data);

    // Convert binary string to array buffer
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Parse workbook from array buffer
    const workbook = XLSX.read(bytes, { type: 'array' });

    // Get the first sheet name if not specified
    const sheetName = sheet || workbook.SheetNames[0];

    // Get worksheet
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in the Excel file`);
    }

    // Convert to JSON with arrays
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    // Create result object
    const result: RawExcelData = {
      data: jsonData,
      totalRows: jsonData.length,
      sheetName,
      allSheets: workbook.SheetNames,
    };

    return transformToFriendlyFormat(result, options.columnMapping);
  } catch (error) {
    logger.error('Error parsing Excel data:', error);
    throw new Error(`Failed to parse Excel data: ${(error as Error).message}`);
  }
};

/**
 * Transforms raw Excel data into a more friendly format
 * @param rawData - Raw parsed Excel data
 * @returns Friendly formatted data
 */
const transformToFriendlyFormat = (
  rawData: RawExcelData,
  customColumnMapping?: Record<string, string>,
): FriendlyExcelData => {
  try {
    if (!rawData?.data?.length) {
      return {
        items: [],
        meta: {
          totalItems: 0,
          sheetName: '',
          allSheets: [],
          reportInfo: {} as ReportInfo,
        },
      };
    }

    // Need at least 2 rows: headers + data
    if (rawData.data.length < 2) {
      return {
        items: [],
        meta: {
          totalItems: 0,
          sheetName: rawData.sheetName || '',
          allSheets: rawData.allSheets || [],
          reportInfo: {} as ReportInfo,
        },
      };
    }

    // Row 0: Metadata (report title in first cell)
    const metadataRow = rawData.data[0] as any[];
    const reportTitle = Array.isArray(metadataRow)
      ? metadataRow[0]
      : Object.values(metadataRow)[0];

    // Row 1: Headers (column names)
    const headerRow = rawData.data[1] as any[];

    // Create column mapping from header row
    const columnMap = createColumnMapping(headerRow, customColumnMapping);

    // Data rows: skip first 2 rows (metadata + headers)
    const dataRows = rawData.data.slice(2);

    // Transform data rows
    const items = dataRows.map((row) => {
      const friendlyRow: Record<string, any> = {};

      if (Array.isArray(row)) {
        // Row is an array - use column mapping by index
        row.forEach((value, colIndex) => {
          const friendlyKey = columnMap[colIndex] || `col${colIndex}`;
          friendlyRow[friendlyKey] = value;
        });
      } else if (row && typeof row === 'object') {
        // Row is an object - use keys
        Object.keys(row).forEach((key) => {
          const friendlyKey = columnMap[key] || key;
          friendlyRow[friendlyKey] = row[key];
        });
      }

      return friendlyRow;
    });

    const reportInfo = parseReportInfo(String(reportTitle || ''));

    return {
      items: items as ExcelItem[],
      meta: {
        totalItems: items.length,
        sheetName: rawData.sheetName,
        allSheets: rawData.allSheets,
        reportInfo,
      },
    };
  } catch (error) {
    logger.error('Error transforming Excel data:', error);
    return {
      items: [],
      meta: {
        totalItems: 0,
        sheetName: rawData.sheetName || '',
        allSheets: rawData.allSheets || [],
        reportInfo: {} as ReportInfo,
      },
    };
  }
};

/**
 * Creates a mapping from column index to friendly field name
 */
const createColumnMapping = (
  headerRow: any[],
  customMapping?: Record<string, string>,
): Record<string | number, string> => {
  if (!headerRow || !Array.isArray(headerRow)) {
    return {};
  }

  const mapping: Record<string, string> = {
    ...(customMapping || {}),
    // English headers
    Brand: 'brand',
    Subject: 'category',
    Season: 'season',
    Collection: 'collection',
    Name: 'productName',
    "Seller's article": 'vendorCode',
    'Article WB': 'wbArticle',
    Barcode: 'barcode',
    Size: 'size',
    Contract: 'contract',
    Warehouse: 'warehouse',
    'Ordered pcs.': 'orderedQty',
    'The amount to be transferred for the product, rub.': 'orderedSum',
    'Redeemed, pcs.': 'purchasedQty',
    'Redeemed, rub.': 'purchasedSum',
    'Current stock balance, pcs.': 'stockQty',
    // Russian headers
    Бренд: 'brand',
    Предмет: 'category',
    Сезон: 'season',
    Коллекция: 'collection',
    Наименование: 'productName',
    'Артикул продавца': 'vendorCode',
    'Артикул WB': 'wbArticle',
    Баркод: 'barcode',
    Размер: 'size',
    Контракт: 'contract',
    Склад: 'warehouse',
    'шт.': 'orderedQty',
    'Заказано шт.': 'orderedQty',
    'Сумма заказов минус комиссия WB, руб.': 'orderedSum',
    'Выкупили, шт.': 'purchasedQty',
    'К перечислению за товар, руб.': 'purchasedSum',
    'Текущий остаток, шт.': 'stockQty',
  };

  const columnMap: Record<string | number, string> = {};

  headerRow.forEach((headerValue, index) => {
    const headerStr = String(headerValue || '').trim();
    if (mapping[headerStr]) {
      columnMap[index] = mapping[headerStr];
    } else {
      columnMap[index] = headerStr || `col${index}`;
    }
  });

  return columnMap;
};

export const promotionColumnMapping: Record<string, string> = {
  'Товар уже участвует в акции': 'alreadyParticipating',
  Бренд: 'brand',
  Предмет: 'subject',
  Наименование: 'name',
  'Артикул поставщика': 'vendorCode',
  'Артикул WB': 'wbArticle',
  'Последний баркод': 'lastBarcode',
  'Количество дней на сайте': 'daysOnSite',
  Оборачиваемость: 'turnover',
  'Остаток товара на складах Wb (шт.)': 'stockWbWh',
  'Остаток товара на складе продавца Wb (шт.)': 'stockSellerWh',
  'Плановая цена для акции': 'plannedPromoPrice',
  'Текущая розничная цена': 'currentRetailPrice',
  Валюта: 'currency',
  'Текущая скидка на сайте, %': 'currentDiscount',
  'Загружаемая скидка для участия в акции': 'uploadedDiscount',
  Статус: 'status',
};

/**
 * Extracts metadata from the report title
 */
const parseReportInfo = (reportTitle?: string): ReportInfo => {
  if (!reportTitle) {
    return {
      supplier: '',
      dateFrom: '',
      dateTo: '',
      generatedAt: '',
      warehouse: '',
      rawTitle: '',
    };
  }

  // Extract supplier name
  const supplierMatch = reportTitle.match(/поставщика\s+«([^»]+)»/);

  // Extract date range (DD.MM.YYYY format)
  const dateRangeMatch = reportTitle.match(
    /с\s+(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})/,
  );

  // Extract generation timestamp
  const generatedMatch = reportTitle.match(
    /сформирован\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/,
  );

  // Extract warehouse info
  const warehouseMatch = reportTitle.match(/Склад:\s+(\w+)/);

  return {
    supplier: supplierMatch ? supplierMatch[1] : '',
    dateFrom: dateRangeMatch ? dateRangeMatch[1] : '',
    dateTo: dateRangeMatch ? dateRangeMatch[2] : '',
    generatedAt: generatedMatch ? generatedMatch[1] : '',
    warehouse: warehouseMatch ? warehouseMatch[1] : '',
    rawTitle: reportTitle,
  };
};
