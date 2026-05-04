import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';
import {
  validateSupplierId,
  validateDate,
  validatePagination,
} from './wb-official-validation';

const logger = createLogger('WBStatisticsOfficial');

const BASE_URL = 'https://seller-analytics-api.wildberries.ru';
const CATEGORY = 'ANALYTICS';

// ---------------------------------------------------------------------------
// Upstream types — match the official WB Seller Analytics API response exactly
// ---------------------------------------------------------------------------

export interface WarehouseRemainsItem {
  nmID: number;
  brandName: string;
  subjectName: string;
  supplierArticle: string;
  warehouseName: string;
  quantity: number;
  inWayToClient: number;
  inWayFromClient: number;
}

export interface ReportStatus {
  taskId: string;
  status: 'new' | 'processing' | 'done' | 'error';
  errorText?: string;
}

export interface RegionSaleItem {
  country: string;
  region: string;
  city: string;
  quantity: number;
  reward: number;
}

export interface RegionSaleCity {
  city: string;
  qty: number;
  reward: number;
  share: number;
}

export interface RegionSaleOblast {
  oblast: string;
  cities: RegionSaleCity[];
  qty: number;
  reward: number;
  share: number;
}

export interface RegionSaleRow {
  country: string;
  fedOkr: string;
  oblasts: RegionSaleOblast[];
  qty: number;
  reward: number;
  share: number;
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface GetBalancesParams {
  supplierId: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export interface GetRegionSalesParams {
  supplierId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WBStatisticsOfficialService {
  // ── Balances (async report flow) ────────────────────────────────────────

  async createBalanceReport(supplierId: string): Promise<{ taskId: string }> {
    validateSupplierId(supplierId);

    logger.debug('Creating warehouse remains report', { supplierId });

    const response = await wbOfficialRequest<unknown>({
      baseUrl: BASE_URL,
      path: '/api/v1/warehouse_remains',
      supplierId,
      category: CATEGORY,
      method: 'GET',
      parseResponse: false,
    });

    // The task ID comes from the X-Task-Id response header
    const taskId = (response as Response).headers.get('x-task-id');
    if (!taskId) {
      throw new Error(
        'Failed to create warehouse remains report: no X-Task-Id header received',
      );
    }

    logger.debug('Warehouse remains report created', { supplierId, taskId });

    return { taskId };
  }

  async getReportStatus(
    supplierId: string,
    taskId: string,
  ): Promise<ReportStatus> {
    validateSupplierId(supplierId);
    if (!taskId || taskId.trim().length === 0) {
      throw new Error('taskId is required');
    }

    return wbOfficialRequest<ReportStatus>({
      baseUrl: BASE_URL,
      path: `/api/v1/warehouse_remains/tasks/${encodeURIComponent(taskId)}/status`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  async downloadBalanceReport(
    supplierId: string,
    taskId: string,
  ): Promise<WarehouseRemainsItem[]> {
    validateSupplierId(supplierId);
    if (!taskId || taskId.trim().length === 0) {
      throw new Error('taskId is required');
    }

    const response = await wbOfficialRequest<WarehouseRemainsItem[]>({
      baseUrl: BASE_URL,
      path: `/api/v1/warehouse_remains/tasks/${encodeURIComponent(taskId)}/download`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
    return response || [];
  }

  /**
   * High-level helper: generate, poll, and return balances.
   * Polls every 3 seconds, times out after 60 seconds.
   */
  async getBalances({
    supplierId,
    dateFrom,
    dateTo,
  }: GetBalancesParams): Promise<WarehouseRemainsItem[]> {
    validateSupplierId(supplierId);
    if (dateFrom) validateDate(dateFrom, 'dateFrom');
    if (dateTo) validateDate(dateTo, 'dateTo');

    const createRes = await this.createBalanceReport(supplierId);
    const taskId = createRes.taskId;

    const maxAttempts = 20;
    const pollIntervalMs = 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const statusRes = await this.getReportStatus(supplierId, taskId);

      logger.debug('Poll balance report status', {
        supplierId,
        taskId,
        attempt: attempt + 1,
        status: statusRes.status,
      });

      if (statusRes.status === 'done') {
        logger.info('Balance report ready, downloading', { supplierId, taskId });
        return this.downloadBalanceReport(supplierId, taskId);
      }

      if (statusRes.status === 'error') {
        logger.error('Balance report generation failed', {
          supplierId,
          taskId,
          errorText: statusRes.errorText,
        });
        throw new Error(
          `Report generation failed: ${statusRes.errorText || 'unknown error'}`,
        );
      }
    }

    logger.error('Balance report generation timed out', { supplierId, taskId });
    throw new Error('Report generation timed out');
  }

  // ── Region Sales ────────────────────────────────────────────────────────

  async getRegionSales({
    supplierId,
    dateFrom,
    dateTo,
    limit = 10,
    offset = 0,
  }: GetRegionSalesParams): Promise<{
    rows: RegionSaleItem[];
    grouped: RegionSaleRow[];
    cursor: { limit: number; offset: number; total: number };
  }> {
    validateSupplierId(supplierId);
    validateDate(dateFrom, 'dateFrom');
    validateDate(dateTo, 'dateTo');
    validatePagination(limit, offset);

    const path =
      `/api/v1/analytics/region-sale?` +
      `dateFrom=${encodeURIComponent(dateFrom)}` +
      `&dateTo=${encodeURIComponent(dateTo)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&offset=${encodeURIComponent(offset)}`;

    logger.debug('Fetching region sales', { supplierId, dateFrom, dateTo, limit, offset });

    const response = await wbOfficialRequest<{
      data: RegionSaleItem[];
    }>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    const rows = response.data || [];

    if (rows.length === 0) {
      logger.debug('No region sales returned from official API', { supplierId, dateFrom, dateTo });
    }

    const grouped = new Map<
      string,
      Map<string, Map<string, { qty: number; reward: number }>>
    >();

    for (const item of rows) {
      const country = item.country || 'Россия';
      const region = item.region || 'Не указан';
      const city = item.city || 'Не указан';

      if (!grouped.has(country)) grouped.set(country, new Map());
      const regions = grouped.get(country)!;
      if (!regions.has(region)) regions.set(region, new Map());
      const cities = regions.get(region)!;
      const existing = cities.get(city) || { qty: 0, reward: 0 };
      existing.qty += item.quantity;
      existing.reward += item.reward;
      cities.set(city, existing);
    }

    const totalReward = rows.reduce((sum: number, i: RegionSaleItem) => sum + i.reward, 0);

    const groupedRows = Array.from(grouped.entries()).map(
      ([country, regions]) => {
        const regionList = Array.from(regions.entries());
        const countryQty = regionList
          .flatMap(([, cities]) => Array.from(cities.values()))
          .reduce((s, c) => s + c.qty, 0);
        const countryReward = regionList
          .flatMap(([, cities]) => Array.from(cities.values()))
          .reduce((s, c) => s + c.reward, 0);

        return {
          country,
          fedOkr: country,
          oblasts: regionList.map(([oblast, cities]) => {
            const cityList = Array.from(cities.entries());
            const oblastQty = cityList.reduce(
              (s, [, d]) => s + d.qty,
              0,
            );
            const oblastReward = cityList.reduce(
              (s, [, d]) => s + d.reward,
              0,
            );

            return {
              oblast,
              cities: cityList.map(([city, data]) => ({
                city,
                qty: data.qty,
                reward: data.reward,
                share: totalReward > 0 ? data.reward / totalReward : 0,
              })),
              qty: oblastQty,
              reward: oblastReward,
              share: totalReward > 0 ? oblastReward / totalReward : 0,
            };
          }),
          qty: countryQty,
          reward: countryReward,
          share: totalReward > 0 ? countryReward / totalReward : 0,
        };
      },
    );

    return {
      rows,
      grouped: groupedRows,
      cursor: {
        limit,
        offset,
        total: rows.length === limit ? offset + limit + 1 : offset + rows.length,
      },
    };
  }
}

export const wbStatisticsOfficialService = new WBStatisticsOfficialService();
