/**
 * Promotions Service
 * Handles WB promotions calendar API operations
 */

import { prisma } from '../config/database';
import { wbAccountRequest } from '../utils/wb-request';
import type { ProxyConfig } from '../utils/wb-request';
import { parseExcelDataNode, FriendlyExcelData, promotionColumnMapping } from '../utils/parseExcelDataNode';
import { logger } from '../utils/logger';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionExcelCreateResponse,
  PromotionExcelGetResponse,
} from '../types/wb';

export interface PromotionExcelResult {
  parsedData: FriendlyExcelData | null;
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

  const supplierId = account.selectedSupplierId || account.suppliers[0]?.supplierId;
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
  const { accountId, supplierId, userAgent, proxy } = await resolveAccountContext(userId);

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
  const { accountId, supplierId, userAgent, proxy } = await resolveAccountContext(userId);

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
    parsedData: null,
    error: null,
  };

  try {
    const { accountId, supplierId, userAgent, proxy } = await resolveAccountContext(userId);

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
      const parsedData = parseExcelDataNode(response.data.file, {
        columnMapping: promotionColumnMapping,
      });
      result.parsedData = parsedData;
    } else {
      result.error = 'Отчет создается. Пожалуйста, подождите около 30 секунд и попробуйте снова.';
      result.reportPending = true;
      result.estimatedWaitTime = 30;
    }

    return result;
  } catch (error) {
    logger.error('Error in getPromotionExcel:', error);
    result.error = (error as Error).message || 'Failed to fetch promotion Excel';
    return result;
  }
};
