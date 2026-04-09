/**
 * MPStats Service
 * Handles MPStats API integration for Wildberries analytics
 * https://mpstats.io/api/
 */

import { prisma } from '@/config/database';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';
import * as pkg from 'https-proxy-agent';
const { HttpsProxyAgent } = pkg;

const logger = createLogger('MPStats');

import type {
  MpstatsSalesItem,
  MpstatsSalesByRegionItem,
} from '@/types/wb';

/**
 * Format proxy URL from ProxyConfig
 */
function formatProxyUrl(proxy: ProxyConfig): string {
  const auth =
    proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';
  return `http://${auth}${proxy.ip}:${proxy.port}`;
}

/**
 * Make HTTP request with optional proxy
 */
async function makeHttpRequest<T>(
  url: string,
  headers: Record<string, string>,
  proxy?: ProxyConfig,
): Promise<T> {
  let response: Response;

  if (proxy) {
    const proxyUrl = formatProxyUrl(proxy);
    const nodeFetch = await import('node-fetch').then((m) => m.default);
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    response = (await nodeFetch(url, {
      method: 'GET',
      headers,
      agent: proxyAgent as unknown as import('node-fetch').RequestInit['agent'],
    })) as unknown as Response;
  } else {
    response = await fetch(url, {
      method: 'GET',
      headers,
    });
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.clone().json();
    } catch {
      try {
        errorBody = await response.clone().text();
      } catch {
        errorBody = 'Could not read error response body';
      }
    }

    throw new Error(
      `Request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
    );
  }

  return (await response.json()) as T;
}

export class MPStatsService {
  /**
   * Get MPStats sales data for a specific NM ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param mpstatsToken - MPStats API token
   * @param fbs - FBS flag (default: 1)
   * @param proxy - Optional proxy configuration
   */
  async getSales({
    nmId,
    d1,
    d2,
    mpstatsToken,
    fbs = 1,
    proxy,
  }: {
    nmId: number;
    d1: string;
    d2: string;
    mpstatsToken: string;
    fbs?: number;
    proxy?: ProxyConfig;
  }): Promise<MpstatsSalesItem[]> {
    const url =
      `https://mpstats.io/api/wb/get/item/${nmId}/sales` +
      `?d1=${encodeURIComponent(d1)}` +
      `&d2=${encodeURIComponent(d2)}` +
      `&fbs=${fbs}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats sales for nmId: ${nmId}`);

    return makeHttpRequest<MpstatsSalesItem[]>(url, headers, proxy);
  }

  /**
   * Get MPStats sales by region for a specific NM ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param mpstatsToken - MPStats API token
   * @param proxy - Optional proxy configuration
   */
  async getSalesByRegion({
    nmId,
    d1,
    d2,
    mpstatsToken,
    proxy,
  }: {
    nmId: number;
    d1: string;
    d2: string;
    mpstatsToken: string;
    proxy?: ProxyConfig;
  }): Promise<MpstatsSalesByRegionItem[]> {
    const url =
      `https://mpstats.io/api/wb/get/item/${nmId}/sales_by_region` +
      `?d1=${encodeURIComponent(d1)}` +
      `&d2=${encodeURIComponent(d2)}`;

    const headers = {
      'X-Mpstats-TOKEN': mpstatsToken,
      'Content-Type': 'application/json',
    };

    logger.info(`Fetching MPStats sales by region for nmId: ${nmId}`);

    return makeHttpRequest<MpstatsSalesByRegionItem[]>(url, headers, proxy);
  }

  /**
   * Get MPStats sales data for a user (fetches token from user record)
   * @param userId - User ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   * @param fbs - FBS flag (default: 1)
   */
  async getSalesForUser({
    userId,
    nmId,
    d1,
    d2,
    fbs = 1,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
    fbs?: number;
  }): Promise<MpstatsSalesItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    const envInfo = user.envInfo as unknown as {
      proxy?: ProxyConfig;
    } | null;

    return this.getSales({
      nmId,
      d1,
      d2,
      mpstatsToken: user.mpstatsToken,
      fbs,
      proxy: envInfo?.proxy,
    });
  }

  /**
   * Get MPStats sales by region for a user (fetches token from user record)
   * @param userId - User ID
   * @param nmId - Wildberries NM ID
   * @param d1 - Start date (YYYY-MM-DD)
   * @param d2 - End date (YYYY-MM-DD)
   */
  async getSalesByRegionForUser({
    userId,
    nmId,
    d1,
    d2,
  }: {
    userId: number;
    nmId: number;
    d1: string;
    d2: string;
  }): Promise<MpstatsSalesByRegionItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mpstatsToken) {
      throw new Error('MPStats token not configured for user');
    }

    const envInfo = user.envInfo as unknown as {
      proxy?: ProxyConfig;
    } | null;

    return this.getSalesByRegion({
      nmId,
      d1,
      d2,
      mpstatsToken: user.mpstatsToken,
      proxy: envInfo?.proxy,
    });
  }
}

// Export a singleton instance
export const mpstatsService = new MPStatsService();
