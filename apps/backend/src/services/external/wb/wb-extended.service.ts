/**
 * WB Extended Service
 * Handles additional Wildberries API endpoints including:
 * - Measurement penalties (seller-weekly-report.wildberries.ru)
 * - Adverts management (cmp.wildberries.ru)
 */

import { prisma } from '@/config/database';
import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WBExtended');

import type {
  MeasurementPenaltyResponse,
  MeasurementPenaltyData,
  AdvertsResponse,
  AdvertPresetInfoResponse,
} from '@/types/wb';

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

export class WBExtendedService {
  /**
   * Get measurement penalties from seller-weekly-report.wildberries.ru
   * @param userId - User ID
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @param limit - Number of records to return (default: 10)
   * @param offset - Offset for pagination (default: 0)
   */
  async getMeasurementPenalties({
    userId,
    dateFrom,
    dateTo,
    limit = 10,
    offset = 0,
  }: {
    userId: number;
    dateFrom: string;
    dateTo: string;
    limit?: number;
    offset?: number;
  }): Promise<MeasurementPenaltyData> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      `https://seller-weekly-report.wildberries.ru/ns/dimensionpenalty/analytics-back/api/v1/measurement-penalties` +
      `?dateFrom=${encodeURIComponent(dateFrom)}` +
      `&dateTo=${encodeURIComponent(dateTo)}` +
      `&limit=${limit}` +
      `&offset=${offset}`;

    logger.info(`Fetching measurement penalties for user ${userId}`);

    const response = await wbAccountRequest<MeasurementPenaltyResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    return response.data;
  }

  /**
   * Get adverts list from cmp.wildberries.ru
   * @param userId - User ID
   * @param pageNumber - Page number (default: 1)
   * @param pageSize - Page size (default: 10)
   * @param status - Array of status IDs (default: [4, 9, 11])
   * @param order - Order field (default: 'createDate')
   * @param direction - Sort direction (default: 'desc')
   * @param autofill - Autofill filter (default: 'all')
   * @param bidType - Array of bid types (default: [1, 2])
   * @param type - Array of advert types (default: [8, 9])
   */
  async getAdverts({
    userId,
    pageNumber = 1,
    pageSize = 10,
    status = [4, 9, 11],
    order = 'createDate',
    direction = 'desc',
    autofill = 'all',
    bidType = [1, 2],
    type = [8, 9],
  }: {
    userId: number;
    pageNumber?: number;
    pageSize?: number;
    status?: number[];
    order?: string;
    direction?: string;
    autofill?: string;
    bidType?: number[];
    type?: number[];
  }): Promise<AdvertsResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      `https://cmp.wildberries.ru/api/v1/adverts` +
      `?page_number=${pageNumber}` +
      `&page_size=${pageSize}` +
      `&status=${encodeURIComponent(JSON.stringify(status))}` +
      `&order=${order}` +
      `&direction=${direction}` +
      `&autofill=${autofill}` +
      `&bid_type=${encodeURIComponent(JSON.stringify(bidType))}` +
      `&type=${encodeURIComponent(JSON.stringify(type))}`;

    logger.info(`Fetching adverts list for user ${userId}`);

    return wbAccountRequest<AdvertsResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }

  /**
   * Get advert preset info from cmp.wildberries.ru
   * @param userId - User ID
   * @param advertId - Advert ID
   * @param pageSize - Page size (default: 5)
   * @param pageNumber - Page number (default: 1)
   * @param filterQuery - Filter query (default: empty)
   * @param from - Start date (default: 7 days ago)
   * @param to - End date (default: today)
   * @param sortDirection - Sort direction (default: 'descend')
   * @param nmId - NM ID for filtering
   * @param calcPages - Calculate pages (default: true)
   * @param calcTotal - Calculate total (default: true)
   */
  async getAdvertPresetInfo({
    userId,
    advertId,
    pageSize = 5,
    pageNumber = 1,
    filterQuery = '',
    from,
    to,
    sortDirection = 'descend',
    nmId,
    calcPages = true,
    calcTotal = true,
  }: {
    userId: number;
    advertId: number;
    pageSize?: number;
    pageNumber?: number;
    filterQuery?: string;
    from?: string;
    to?: string;
    sortDirection?: string;
    nmId?: number;
    calcPages?: boolean;
    calcTotal?: boolean;
  }): Promise<AdvertPresetInfoResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    // Set default date range if not provided (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const finalFrom = from || formatDate(sevenDaysAgo);
    const finalTo = to || formatDate(now);

    let url =
      `https://cmp.wildberries.ru/api/v1/advert/${advertId}/preset-info` +
      `?page_size=${pageSize}` +
      `&page_number=${pageNumber}` +
      `&filter_query=${encodeURIComponent(filterQuery)}` +
      `&from=${finalFrom}` +
      `&to=${finalTo}` +
      `&sort_direction=${sortDirection}` +
      `&calc_pages=${calcPages}` +
      `&calc_total=${calcTotal}`;

    if (nmId !== undefined) {
      url += `&nm_id=${nmId}`;
    }

    logger.info(
      `Fetching advert preset info for user ${userId}, advertId: ${advertId}`,
    );

    return wbAccountRequest<AdvertPresetInfoResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });
  }
}

// Export a singleton instance
export const wbExtendedService = new WBExtendedService();
