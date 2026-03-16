import { Cookie } from 'playwright';
import { prisma } from '../config/database';
import { logger } from './logger';
import { getCookiesFromAccount } from './cookies';
import pkg from 'https-proxy-agent';
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
    cookieMap.get('__zzatw-wb') ? `__zzatw-wb=${cookieMap.get('__zzatw-wb')}` : '',
    cookieMap.get('_wbauid') ? `_wbauid=${cookieMap.get('_wbauid')}` : '',
    cookieMap.get('cfidsw-wb') ? `cfidsw-wb=${cookieMap.get('cfidsw-wb')}` : '',
    cookieMap.get('current_feature_version') ? `current_feature_version=${cookieMap.get('current_feature_version')}` : '',
    cookieMap.get('external-locale') ? `external-locale=${cookieMap.get('external-locale')}` : '',
    cookieMap.get('locale') ? `locale=${cookieMap.get('locale')}` : '',
    cookieMap.get('wbx-validation-key') ? `wbx-validation-key=${cookieMap.get('wbx-validation-key')}` : '',
    cookieMap.get('x-supplier-id') ? `x-supplier-id=${cookieMap.get('x-supplier-id')}` : '',
    cookieMap.get('x-supplier-id-external') ? `x-supplier-id-external=${cookieMap.get('x-supplier-id-external')}` : '',
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
  order?: number
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
  parseResponse: boolean = true
): Promise<unknown> {
  let response: Response;

  if (proxy) {
    const proxyUrl = formatProxyUrl(proxy);
    // Use dynamic import for node-fetch
    const nodeFetch = await import('node-fetch').then(m => m.default);
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    response = await nodeFetch(url, {
      method,
      headers,
      body,
      agent: proxyAgent as any,
    }) as unknown as Response;
  } else {
    response = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
    });
  }

  if (!response.ok) {
    const error: WBError = {
      message: `Request failed with status ${response.status}`,
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
      options.parseResponse !== false
    );

    // Check for JSON-RPC error in response
    const response = responseData as { error?: { message: string; code: number } };
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
 * Makes a request to WB API using account-based authentication
 * Uses the provided accountId to get cookies directly
 */
export async function wbAccountRequest<T>({
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
  try {
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
    
    // If supplierId is provided, override it in the cookie string
    if (supplierId) {
      const cookieEntries = cookieString.split('; ').filter(Boolean);
      const filteredEntries = cookieEntries.filter(
        entry => !entry.startsWith('x-supplier-id') && !entry.startsWith('x-supplier-id-external')
      );
      filteredEntries.push(`x-supplier-id=${supplierId}`);
      filteredEntries.push(`x-supplier-id-external=${supplierId}`);
      cookieString = filteredEntries.join('; ');
    }

    // Get WBTokenV3 for authorizev3 header
    const wbTokenV3 = cookies.find(c => c.name === 'WBTokenV3')?.value || '';

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
        requestBody = JSON.stringify(buildJsonRpcBody(body as JsonRpcBody | JsonRpcBody[], order));
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
      parseResponse
    );

    // Check for JSON-RPC error in response
    const response = responseData as { error?: { message: string; code: number } };
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
    logger.error(`Error in wbAccountRequest for account ${accountId}:`, error);
    if ((error as WBError).message) {
      throw error;
    }
    // Handle unexpected errors
    throw {
      message: `Unexpected error during account request: ${(error as Error).message}`,
      url,
      method,
    };
  }
}
