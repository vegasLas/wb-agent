/**
 * WB Cookie Advert Service
 * Handles WB advertisement/CMP API calls using browser cookies
 * Domain: cmp.wildberries.ru
 */

import { wbAccountRequest } from "@/utils/wb-request";
import type { ProxyConfig } from "@/utils/wb-request";
import {
  AdvertsParams,
  AdvertsResponse,
  AdvertPresetInfoParams,
  AdvertPresetInfoResponse,
} from "@/types/wb";
import { prisma } from "@/config/database";

interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

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

export class WBCookieAdvertService {
  /**
   * Get adverts/campaigns from WB CMP API
   */
  async getAdverts({
    userId,
    params,
  }: {
    userId: number;
    params: AdvertsParams;
  }): Promise<AdvertsResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    let url =
      `https://cmp.wildberries.ru/api/v1/adverts` +
      `?page_number=${params.page_number ?? 1}` +
      `&page_size=${params.page_size ?? 10}`;

    if (params.status && params.status.length > 0) {
      url += `&status=${encodeURIComponent(JSON.stringify(params.status))}`;
    }
    if (params.order) {
      url += `&order=${encodeURIComponent(params.order)}`;
    }
    if (params.direction) {
      url += `&direction=${encodeURIComponent(params.direction)}`;
    }
    if (params.autofill) {
      url += `&autofill=${encodeURIComponent(params.autofill)}`;
    }
    if (params.bid_type && params.bid_type.length > 0) {
      url += `&bid_type=${encodeURIComponent(JSON.stringify(params.bid_type))}`;
    }
    if (params.type && params.type.length > 0) {
      url += `&type=${encodeURIComponent(JSON.stringify(params.type))}`;
    }

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
   * Get advert preset info from WB CMP API
   */
  async getAdvertPresetInfo({
    userId,
    params,
  }: {
    userId: number;
    params: AdvertPresetInfoParams;
  }): Promise<AdvertPresetInfoResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    let url =
      `https://cmp.wildberries.ru/api/v1/advert/${params.advertId}/preset-info` +
      `?page_size=${params.page_size ?? 5}` +
      `&page_number=${params.page_number ?? 1}`;

    if (params.filter_query !== undefined) {
      url += `&filter_query=${encodeURIComponent(params.filter_query)}`;
    }
    if (params.from) {
      url += `&from=${encodeURIComponent(params.from)}`;
    }
    if (params.to) {
      url += `&to=${encodeURIComponent(params.to)}`;
    }
    if (params.sort_direction) {
      url += `&sort_direction=${encodeURIComponent(params.sort_direction)}`;
    }
    if (params.nm_id !== undefined) {
      url += `&nm_id=${params.nm_id}`;
    }
    if (params.calc_pages !== undefined) {
      url += `&calc_pages=${params.calc_pages}`;
    }
    if (params.calc_total !== undefined) {
      url += `&calc_total=${params.calc_total}`;
    }

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

export const wbCookieAdvertService = new WBCookieAdvertService();
