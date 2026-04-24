import { Cookie } from 'playwright';
import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WBRequest');
import { getCookiesFromAccount } from '@/utils/cookies';
import * as pkg from 'https-proxy-agent';
const { HttpsProxyAgent } = pkg;

// Define Proxy interface
export interface ProxyConfig {
  ip: string;
  port: string;
  username: string;
  password: string;
}

export interface WBRequestParams {
  url: string;
  cookiesString: string;
  userAgent: string;
  proxy?: ProxyConfig;
  options?: WBRequestOptions;
}

export interface WBAccountRequestParams {
  url: string;
  accountId: string;
  userAgent: string;
  proxy?: ProxyConfig;
  supplierId?: string;
  method?: string;
  body?: JsonRpcBody | JsonRpcBody[] | Record<string, unknown>;
  headers?: Record<string, string>;
  isJsonRpc?: boolean;
  order?: number;
  parseResponse?: boolean;
}

export interface JsonRpcBody {
  method?: string;
  params: unknown;
}

export interface WBRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: JsonRpcBody | JsonRpcBody[];
  isJsonRpc?: boolean;
  parseResponse?: boolean;
  order?: number;
}

export interface WBError {
  message: string;
  status?: number;
  method?: string;
  url?: string;
}

// ─── Retry Configuration ────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, opts: Required<RetryOptions>): boolean {
  const wbError = error as WBError;
  if (wbError.status && opts.retryableStatuses.includes(wbError.status)) {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED')
    );
  }
  return false;
}

/**
 * Wrap an async function with exponential backoff retry logic.
 */
export function withRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {},
): (...args: TArgs) => Promise<TReturn> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return async (...args: TArgs): Promise<TReturn> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        if (attempt === opts.maxAttempts || !isRetryableError(error, opts)) {
          throw error;
        }

        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs,
        );
        logger.warn(
          `Retryable error on attempt ${attempt}/${opts.maxAttempts}, retrying in ${delay}ms`,
          { error: (error as Error).message },
        );
        await sleep(delay);
      }
    }

    throw lastError;
  };
}

// ─── Cookie String Builder ──────────────────────────────────────────────────

/**
 * Builds a cookie string from Cookie array
 */
function buildCookieStringFromCookies(cookies: Cookie[]): string {
  const cookieMap = new Map<string, string>();

  for (const cookie of cookies) {
    cookieMap.set(cookie.name, cookie.value);
  }

  return [
    cookieMap.get('WBTokenV3') ? `WBTokenV3=${cookieMap.get('WBTokenV3')}` : '',
    cookieMap.get('__zzatw-wb')
      ? `__zzatw-wb=${cookieMap.get('__zzatw-wb')}`
      : '',
    cookieMap.get('_wbauid') ? `_wbauid=${cookieMap.get('_wbauid')}` : '',
    cookieMap.get('cfidsw-wb') ? `cfidsw-wb=${cookieMap.get('cfidsw-wb')}` : '',
    cookieMap.get('current_feature_version')
      ? `current_feature_version=${cookieMap.get('current_feature_version')}`
      : '',
    cookieMap.get('external-locale')
      ? `external-locale=${cookieMap.get('external-locale')}`
      : '',
    cookieMap.get('locale') ? `locale=${cookieMap.get('locale')}` : '',
    cookieMap.get('wbx-validation-key')
      ? `wbx-validation-key=${cookieMap.get('wbx-validation-key')}`
      : '',
    cookieMap.get('x-supplier-id')
      ? `x-supplier-id=${cookieMap.get('x-supplier-id')}`
      : '',
    cookieMap.get('x-supplier-id-external')
      ? `x-supplier-id-external=${cookieMap.get('x-supplier-id-external')}`
      : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * Generates a random JSON-RPC order number between 80 and 150
 */
function generateRandomOrder(): number {
  return Math.floor(Math.random() * (149 - 74 + 1)) + 80;
}

/**
 * Builds a JSON-RPC request body with proper ID formatting
 */
function buildJsonRpcBody(
  body: JsonRpcBody | JsonRpcBody[],
  order?: number,
): unknown {
  const baseOrder = order ?? generateRandomOrder();

  if (Array.isArray(body)) {
    return body.map((item, index) => ({
      ...item,
      jsonrpc: '2.0',
      id: `json-rpc_${baseOrder + index}`,
    }));
  }

  return {
    ...body,
    jsonrpc: '2.0',
    id: `json-rpc_${baseOrder}`,
  };
}

/**
 * Formats a Proxy object into a proxy URL string
 */
function formatProxyUrl(proxy: ProxyConfig): string {
  const auth =
    proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';
  return `http://${auth}${proxy.ip}:${proxy.port}`;
}

/**
 * Makes HTTP request with proxy support
 */
async function makeHttpRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  proxy?: ProxyConfig,
  parseResponse = true,
): Promise<unknown> {
  let response: Response;

  // Log request body for debugging
  logger.debug(`${method} ${url}`, {
    body: body ? JSON.parse(body) : undefined,
  });

  if (proxy) {
    const proxyUrl = formatProxyUrl(proxy);
    // Use dynamic import for node-fetch
    const nodeFetch = await import('node-fetch').then((m) => m.default);
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    response = (await nodeFetch(url, {
      method,
      headers,
      body,
      agent: proxyAgent as unknown as import('node-fetch').RequestInit['agent'],
    })) as unknown as Response;
  } else {
    response = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
    });
  }

  if (!response.ok) {
    // Try to get the error response body
    let errorBody: unknown;
    try {
      const responseClone = response.clone();
      errorBody = await responseClone.json();
    } catch {
      try {
        const responseClone = response.clone();
        errorBody = await responseClone.text();
      } catch {
        errorBody = 'Could not read error response body';
      }
    }

    logger.error(`${method} ${url}`, {
      status: response.status,
      statusText: response.statusText,
      requestBody: body ? JSON.parse(body) : undefined,
      responseBody: errorBody,
    });

    const error: WBError = {
      message: `Request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
      status: response.status,
      method,
      url,
    };
    throw error;
  }

  if (!parseResponse) {
    return response;
  }

  return await response.json();
}

/**
 * Makes a request to WB API with proper authentication and error handling
 */
export async function wbRequest<T>({
  url,
  cookiesString,
  userAgent,
  options = {},
  proxy,
}: WBRequestParams): Promise<T> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      Origin: 'https://seller.wildberries.ru',
      Cookie: cookiesString,
      'User-Agent': userAgent,
      ...options.headers,
    };

    const requestBody = options.body
      ? options.isJsonRpc
        ? JSON.stringify(buildJsonRpcBody(options.body, options.order))
        : JSON.stringify(options.body)
      : undefined;
    const method = options.method || 'POST';

    const responseData = await makeHttpRequest(
      url.toString(),
      method,
      headers,
      requestBody,
      proxy,
      options.parseResponse !== false,
    );

    // Check for JSON-RPC error in response
    const response = responseData as {
      error?: { message: string; code: number };
    };
    if (response.error) {
      const error: WBError = {
        message: response.error.message || 'JSON-RPC error occurred',
        status: response.error.code,
        url,
      };
      throw error;
    }

    return responseData as T;
  } catch (error) {
    if ((error as WBError).message) {
      throw error;
    }
    // Handle unexpected errors
    throw {
      message: `Unexpected error during request: ${(error as Error).message}`,
      url,
      method: options.method || 'POST',
    };
  }
}

/**
 * Internal implementation of account-based WB request.
 */
async function wbAccountRequestImpl<T>({
  url,
  accountId,
  userAgent,
  proxy,
  supplierId,
  method = 'POST',
  body,
  headers = {},
  isJsonRpc = false,
  order,
  parseResponse = true,
}: WBAccountRequestParams): Promise<T> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account?.wbCookies) {
    throw new Error(`No cookies found for account ${accountId}`);
  }

  // Get cookies from account
  const cookies = await getCookiesFromAccount(accountId);

  // Build cookie string, optionally overriding supplier ID
  let cookieString = buildCookieStringFromCookies(cookies);

  // Override locale cookies to ru and supplierId if provided
  const cookieEntries = cookieString.split('; ').filter(Boolean);
  const filteredEntries = cookieEntries.filter(
    (entry) =>
      !entry.startsWith('external-locale') &&
      !entry.startsWith('locale') &&
      !entry.startsWith('x-supplier-id') &&
      !entry.startsWith('x-supplier-id-external'),
  );
  filteredEntries.push('external-locale=ru');
  filteredEntries.push('locale=ru');
  if (supplierId) {
    filteredEntries.push(`x-supplier-id=${supplierId}`);
    filteredEntries.push(`x-supplier-id-external=${supplierId}`);
  }
  cookieString = filteredEntries.join('; ');

  // Get WBTokenV3 for authorizev3 header
  const wbTokenV3 = cookies.find((c) => c.name === 'WBTokenV3')?.value || '';

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: 'https://seller.wildberries.ru',
    Cookie: cookieString,
    'User-Agent': userAgent,
    ...(supplierId && {
      'x-supplier-id': supplierId,
      'x-supplier-id-external': supplierId,
    }),
    ...(wbTokenV3 && { authorizev3: wbTokenV3 }),
    ...headers,
  };

  let requestBody: string | undefined = undefined;
  if (body) {
    if (isJsonRpc) {
      requestBody = JSON.stringify(
        buildJsonRpcBody(body as JsonRpcBody | JsonRpcBody[], order),
      );
    } else {
      requestBody = JSON.stringify(body);
    }
  }

  const responseData = await makeHttpRequest(
    url,
    method,
    requestHeaders,
    requestBody,
    proxy,
    parseResponse,
  );

  // Check for JSON-RPC error in response
  const response = responseData as {
    error?: { message: string; code: number };
  };
  if (response.error) {
    const error: WBError = {
      message: response.error.message || 'JSON-RPC error occurred',
      status: response.error.code,
      url,
    };
    throw error;
  }

  return responseData as T;
}

/**
 * Makes a request to WB API using account-based authentication.
 * Automatically retries on transient errors (5xx, timeouts, connection issues).
 */
export const wbAccountRequest = withRetry(wbAccountRequestImpl, {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
});

/**
 * Slow-retry variant for WB API posting operations (e.g., feedback answers).
 * Delays: 10s, 20s — then stops. Useful when WB API is rate-limited or flaky.
 */
export const wbAccountRequestSlowRetry = withRetry(wbAccountRequestImpl, {
  maxAttempts: 3,
  baseDelayMs: 10000,
  maxDelayMs: 20000,
});
