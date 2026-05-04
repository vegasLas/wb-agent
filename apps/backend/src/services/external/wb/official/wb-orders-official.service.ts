import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';
import { cacheService } from '@/services/infrastructure/cache.service';
import {
  validateSupplierId,
  validateDate,
} from './wb-official-validation';

const logger = createLogger('WBOrdersOfficial');

const BASE_URL = 'https://statistics-api.wildberries.ru';
const CATEGORY = 'STATISTICS';
const RATE_LIMIT_DELAY_MS = 61_000; // 1 request per minute + 1s buffer
const MAX_PAGES = 30; // Safety cap: ~30 min max per call
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — matches API data freshness

// ---------------------------------------------------------------------------
// Upstream types — match the official WB Statistics API response exactly
// ---------------------------------------------------------------------------

export interface SaleItem {
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  warehouseType: string;
  countryName: string;
  oblastOkrugName: string;
  regionName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  incomeID: number;
  isSupply: boolean;
  isRealization: boolean;
  isCancel: boolean;
  cancelDate?: string;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  forPay: number;
  saleID: string;
  orderType: string;
  sticker: string;
  gNumber: string;
  srid: string;
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface GetSalesParams {
  supplierId: string;
  dateFrom: string; // RFC3339, e.g. "2026-03-01T00:00:00"
  flag?: 0 | 1;
}

export interface GetSalesInIntervalParams {
  supplierId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Upstream types — Orders API
// ---------------------------------------------------------------------------

export interface OrderItem {
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  warehouseType: string;
  countryName: string;
  oblastOkrugName: string;
  regionName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  incomeID: number;
  isSupply: boolean;
  isRealization: boolean;
  orderId: string;
  srid: string;
  sticker: string;
  gNumber: string;
  status: string;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  forPay: number;
}

// ---------------------------------------------------------------------------
// Params — Orders API
// ---------------------------------------------------------------------------

export interface GetOrdersParams {
  supplierId: string;
  dateFrom: string; // RFC3339, e.g. "2026-03-01T00:00:00"
  flag?: 0 | 1;
}

export interface GetOrdersInIntervalParams {
  supplierId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WBOrdersOfficialService {
  /**
   * Fetch sales from the official Statistics API.
   * Returns raw sales data where lastChangeDate >= dateFrom.
   */
  async getSales({
    supplierId,
    dateFrom,
    flag = 0,
  }: GetSalesParams): Promise<SaleItem[]> {
    validateSupplierId(supplierId);

    const path =
      `/api/v1/supplier/sales?` +
      `dateFrom=${encodeURIComponent(dateFrom)}` +
      `&flag=${flag}`;

    logger.debug('Fetching sales from official API', { supplierId, dateFrom, flag });

    return wbOfficialRequest<SaleItem[]>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  /**
   * Fetch all sales within a date interval.
   * Handles pagination via lastChangeDate and filters by date range locally.
   * Respects the 1 req/min rate limit by sleeping between pages.
   */
  async getSalesInInterval({
    supplierId,
    startDate,
    endDate,
  }: GetSalesInIntervalParams): Promise<SaleItem[]> {
    validateSupplierId(supplierId);
    validateDate(startDate, 'startDate');
    validateDate(endDate, 'endDate');

    const cacheKey = `wb:orders:sales:${supplierId}:${startDate}:${endDate}`;
    const cached = cacheService.get<SaleItem[]>(cacheKey, CACHE_TTL_MS);
    if (cached) {
      logger.debug('Returning cached sales', { supplierId, startDate, endDate, count: cached.length });
      return cached;
    }

    const allSales: SaleItem[] = [];
    let dateFrom = `${startDate}T00:00:00`;
    const endTimestamp = new Date(`${endDate}T23:59:59`).getTime();
    let page = 0;

    while (true) {
      if (page >= MAX_PAGES) {
        logger.warn('Reached max pagination safety limit', { supplierId, maxPages: MAX_PAGES });
        break;
      }

      const batch = await this.getSales({ supplierId, dateFrom });
      page++;

      // Empty array means no more data
      if (batch.length === 0) {
        logger.debug('Pagination complete — empty batch returned', { supplierId, page });
        break;
      }

      // Filter items within the desired date range by the `date` field
      const filtered = batch.filter((item) => {
        const itemDate = new Date(item.date).getTime();
        return itemDate <= endTimestamp;
      });

      allSales.push(...filtered);

      logger.debug('Fetched sales batch', {
        supplierId,
        page,
        batchSize: batch.length,
        filteredSize: filtered.length,
        lastChangeDate: batch[batch.length - 1].lastChangeDate,
      });

      // If the last item's date is already past the end date, we can stop
      const lastItemDate = new Date(batch[batch.length - 1].date).getTime();
      if (lastItemDate > endTimestamp) {
        logger.debug('Last item date exceeds endDate, stopping pagination', {
          supplierId,
          lastItemDate: batch[batch.length - 1].date,
          endDate,
        });
        break;
      }

      // Use lastChangeDate of the last item for the next pagination request
      const previousDateFrom = dateFrom;
      dateFrom = batch[batch.length - 1].lastChangeDate;

      // Safety break: if dateFrom didn't advance, stop to avoid infinite loop
      if (dateFrom === previousDateFrom) {
        logger.warn('Pagination dateFrom did not advance, stopping to avoid infinite loop', {
          supplierId,
          dateFrom,
        });
        break;
      }

      // Respect Statistics API rate limit: 1 request per minute.
      // Sleep before the next page so we never exceed the limit.
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    logger.info('Fetched sales in interval', {
      supplierId,
      startDate,
      endDate,
      totalSales: allSales.length,
      pages: page,
    });

    cacheService.set(cacheKey, allSales);
    return allSales;
  }

  /**
   * Fetch orders from the official Statistics API.
   * Returns raw orders data where lastChangeDate >= dateFrom.
   */
  async getOrders({
    supplierId,
    dateFrom,
    flag = 0,
  }: GetOrdersParams): Promise<OrderItem[]> {
    validateSupplierId(supplierId);

    const path =
      `/api/v1/supplier/orders?` +
      `dateFrom=${encodeURIComponent(dateFrom)}` +
      `&flag=${flag}`;

    logger.debug('Fetching orders from official API', { supplierId, dateFrom, flag });

    return wbOfficialRequest<OrderItem[]>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  /**
   * Fetch all orders within a date interval.
   * Handles pagination via lastChangeDate and filters by date range locally.
   * Respects the 1 req/min rate limit by sleeping between pages.
   */
  async getOrdersInInterval({
    supplierId,
    startDate,
    endDate,
  }: GetOrdersInIntervalParams): Promise<OrderItem[]> {
    validateSupplierId(supplierId);
    validateDate(startDate, 'startDate');
    validateDate(endDate, 'endDate');

    const cacheKey = `wb:orders:orders:${supplierId}:${startDate}:${endDate}`;
    const cached = cacheService.get<OrderItem[]>(cacheKey, CACHE_TTL_MS);
    if (cached) {
      logger.debug('Returning cached orders', { supplierId, startDate, endDate, count: cached.length });
      return cached;
    }

    const allOrders: OrderItem[] = [];
    let dateFrom = `${startDate}T00:00:00`;
    const endTimestamp = new Date(`${endDate}T23:59:59`).getTime();
    let page = 0;

    while (true) {
      if (page >= MAX_PAGES) {
        logger.warn('Reached max pagination safety limit', { supplierId, maxPages: MAX_PAGES });
        break;
      }

      const batch = await this.getOrders({ supplierId, dateFrom });
      page++;

      // Empty array means no more data
      if (batch.length === 0) {
        logger.debug('Pagination complete — empty batch returned', { supplierId, page });
        break;
      }

      // Filter items within the desired date range by the `date` field
      const filtered = batch.filter((item) => {
        const itemDate = new Date(item.date).getTime();
        return itemDate <= endTimestamp;
      });

      allOrders.push(...filtered);

      logger.debug('Fetched orders batch', {
        supplierId,
        page,
        batchSize: batch.length,
        filteredSize: filtered.length,
        lastChangeDate: batch[batch.length - 1].lastChangeDate,
      });

      // If the last item's date is already past the end date, we can stop
      const lastItemDate = new Date(batch[batch.length - 1].date).getTime();
      if (lastItemDate > endTimestamp) {
        logger.debug('Last item date exceeds endDate, stopping pagination', {
          supplierId,
          lastItemDate: batch[batch.length - 1].date,
          endDate,
        });
        break;
      }

      // Use lastChangeDate of the last item for the next pagination request
      const previousDateFrom = dateFrom;
      dateFrom = batch[batch.length - 1].lastChangeDate;

      // Safety break: if dateFrom didn't advance, stop to avoid infinite loop
      if (dateFrom === previousDateFrom) {
        logger.warn('Pagination dateFrom did not advance, stopping to avoid infinite loop', {
          supplierId,
          dateFrom,
        });
        break;
      }

      // Respect Statistics API rate limit: 1 request per minute.
      // Sleep before the next page so we never exceed the limit.
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    logger.info('Fetched orders in interval', {
      supplierId,
      startDate,
      endDate,
      totalOrders: allOrders.length,
      pages: page,
    });

    cacheService.set(cacheKey, allOrders);
    return allOrders;
  }
}

export const wbOrdersOfficialService = new WBOrdersOfficialService();
