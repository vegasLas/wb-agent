import { prisma } from '@/config/database';
import { withRetry, type ProxyConfig } from '@/utils/wb-request';
import { safeDecrypt } from '@/utils/encryption';
import { createLogger } from '@/utils/logger';
import type { WbApiCategory } from '@prisma/client';
import * as pkg from 'https-proxy-agent';

const { HttpsProxyAgent } = pkg;

const logger = createLogger('WBOfficialRequest');

const REQUEST_TIMEOUT_MS = 30000;

export class WbOfficialApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public url?: string,
  ) {
    super(message);
  }
}

export interface WbOfficialRequestParams<T = unknown> {
  baseUrl: string;
  path: string;
  /** Maps to WbApiProfileSupplier.id in the database. */
  supplierId: string;
  category: WbApiCategory;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  parseResponse?: boolean;
  proxy?: ProxyConfig;
}

/**
 * Format a ProxyConfig into a proxy URL string.
 */
function formatProxyUrl(proxy: ProxyConfig): string {
  const auth =
    proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';
  return `http://${auth}${proxy.ip}:${proxy.port}`;
}

/**
 * Resolve the best active API key for a given account + category.
 * Only keys that decrypt successfully are returned.
 */
export async function resolveOfficialApiKey(
  supplierId: string,
  category: WbApiCategory,
): Promise<{ apiKey: string; keyId: string } | null> {
  const keys = await prisma.wbApiKey.findMany({
    where: {
      supplierId,
      isActive: true,
      categories: { has: category },
    },
    orderBy: { updatedAt: 'desc' },
  });

  for (const key of keys) {
    const decrypted = safeDecrypt(key.apiKey);
    if (decrypted) {
      return { apiKey: decrypted, keyId: key.id };
    }
  }
  return null;
}

async function wbOfficialRequestImpl<T>({
  baseUrl,
  path,
  supplierId,
  category,
  method = 'GET',
  body,
  headers = {},
  parseResponse = true,
  proxy,
}: WbOfficialRequestParams): Promise<T> {
  if (!baseUrl || !path || !supplierId) {
    throw new WbOfficialApiError(
      'Missing required parameter: baseUrl, path, and supplierId are required',
      400,
      'VALIDATION_ERROR',
    );
  }

  const keyInfo = await resolveOfficialApiKey(supplierId, category);
  if (!keyInfo) {
    throw new WbOfficialApiError(
      `No active official API key found for category ${category}`,
      401,
      'MISSING_API_KEY',
    );
  }

  const url = `${baseUrl}${path}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: keyInfo.apiKey,
    ...headers,
  };

  logger.debug(`${method} ${url}`, {
    body: body ?? undefined,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    if (proxy) {
      const proxyUrl = formatProxyUrl(proxy);
      const nodeFetch = await import('node-fetch').then((m) => m.default);
      const proxyAgent = new HttpsProxyAgent(proxyUrl);

      response = (await nodeFetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        agent: proxyAgent as unknown as import('node-fetch').RequestInit['agent'],
        signal: controller.signal as unknown as import('node-fetch').RequestInit['signal'],
      })) as unknown as Response;
    } else {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new WbOfficialApiError(
        `Request timeout after ${REQUEST_TIMEOUT_MS}ms`,
        408,
        'REQUEST_TIMEOUT',
        url,
      );
    }

    throw new WbOfficialApiError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
      0,
      'NETWORK_ERROR',
      url,
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = 'Could not read error response body';
    }

    logger.error(`${method} ${url}`, {
      status: response.status,
      statusText: response.statusText,
      requestBody: body ?? undefined,
      responseBody: errorBody,
    });

    // Map specific status codes to descriptive error codes per Plan 11
    const errorCode =
      response.status === 401
        ? 'UNAUTHORIZED'
        : response.status === 403
          ? 'FORBIDDEN'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'API_ERROR';

    throw new WbOfficialApiError(
      `WB Official API error: ${errorBody}`,
      response.status,
      errorCode,
      url,
    );
  }

  if (!parseResponse) {
    return response as unknown as T;
  }

  return (await response.json()) as T;
}

/**
 * Makes a request to WB Official API with automatic retry on transient errors.
 */
export const wbOfficialRequest = withRetry(wbOfficialRequestImpl, {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
});

export { ProxyConfig };
