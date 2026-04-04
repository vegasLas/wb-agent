import { Cookie } from 'playwright';
import { encrypt, decrypt } from './encryption';
import { prisma } from '../config/database';

export interface CookieUpdate {
  name: string;
  value: string;
}

export interface CookieProps {
  WBTokenV3: string;
  zzatw: string;
  cfidsw: string;
  currentFeatureVersion: string;
  externalLocale: string;
  locale: string;
  wbxValidationKey: string;
  supplierId: string;
  supplierIdExternal: string;
  _wbauid?: string;
  landing_version_ru?: string;
  landing_version?: string;
}

/**
 * Encodes cookies by encrypting them
 * @param cookies - Array of Playwright cookies
 * @returns Encrypted cookie string
 */
export function encodeCookies(cookies: Cookie[]): string {
  const sanitizedCookies = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));

  const cookieString = JSON.stringify(sanitizedCookies);
  return encrypt(cookieString);
}

/**
 * Decodes encrypted cookies string back to Cookie array
 * @param encodedCookies - Encrypted cookie string
 * @returns Array of cookies or empty array on error
 */
export function decodeCookies(encodedCookies: string): Cookie[] {
  try {
    const decrypted = decrypt(encodedCookies);
    const cookies = JSON.parse(decrypted) as Cookie[];

    // Validate cookie structure
    if (!Array.isArray(cookies) || !cookies.every(isValidCookie)) {
      throw new Error('Invalid cookie structure');
    }

    return cookies;
  } catch (error) {
    console.error('Error decoding cookies:', error);
    return [];
  }
}

function isValidCookie(cookie: unknown): cookie is Cookie {
  return (
    typeof cookie === 'object' &&
    cookie !== null &&
    typeof (cookie as Cookie).name === 'string' &&
    typeof (cookie as Cookie).value === 'string' &&
    typeof (cookie as Cookie).domain === 'string' &&
    typeof (cookie as Cookie).path === 'string'
  );
}

/**
 * Saves cookies to a specific account
 * @param cookies - Array of cookies to save
 * @param accountId - Account ID
 */
export async function saveCookiesToAccount(
  cookies: Cookie[],
  accountId: string,
): Promise<void> {
  const encodedCookies = encodeCookies(cookies);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      wbCookies: encodedCookies,
      updatedAt: new Date(),
    },
  });
}

/**
 * Gets cookies from a specific account
 * @param accountId - Account ID
 * @returns Array of cookies or empty array
 */
export async function getCookiesFromAccount(
  accountId: string,
): Promise<Cookie[]> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account?.wbCookies) {
    return [];
  }

  return decodeCookies(account.wbCookies);
}

/**
 * Updates specific cookie values for an account
 * @param accountId - Account ID
 * @param cookieUpdates - Array of cookie updates
 */
export async function updateAccountCookieValues(
  accountId: string,
  cookieUpdates: CookieUpdate[],
): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account?.wbCookies) {
    throw new Error('No cookies found for account');
  }

  // Decode existing cookies
  const cookies = decodeCookies(account.wbCookies);

  // Update each cookie
  for (const update of cookieUpdates) {
    const cookieIndex = cookies.findIndex(
      (cookie) => cookie.name === update.name,
    );

    if (cookieIndex === -1) {
      console.warn(`Cookie with name '${update.name}' not found, skipping...`);
      continue;
    }

    // Update the cookie value while preserving other properties
    cookies[cookieIndex] = {
      ...cookies[cookieIndex],
      value: update.value,
    };
  }

  // Encode and save updated cookies
  const encodedCookies = encodeCookies(cookies);
  await prisma.account.update({
    where: { id: accountId },
    data: {
      wbCookies: encodedCookies,
      updatedAt: new Date(),
    },
  });
}

/**
 * Gets a specific cookie by name from an account
 * @param accountId - Account ID
 * @param cookieName - Name of the cookie to find
 * @returns Cookie or null if not found
 */
export async function getCookieByName(
  accountId: string,
  cookieName: string,
): Promise<Cookie | null> {
  const cookies = await getCookiesFromAccount(accountId);
  return cookies.find((cookie) => cookie.name === cookieName) || null;
}

/**
 * Parse cookies from an encrypted cookie string
 * @param cookiesString - Encrypted cookie string from account
 * @returns CookieProps object with extracted cookie values
 */
export function getCookiesFromString(cookiesString: string): CookieProps {
  const decodedCookies = decodeCookies(cookiesString);
  const cookieMap = new Map(decodedCookies.map((c) => [c.name, c.value]));

  const locale = cookieMap.get('locale') || '';
  const isRussianLocale = locale === 'ru';
  const landingVersionKey = isRussianLocale
    ? 'landing_version_ru'
    : 'landing_version';

  return {
    WBTokenV3: cookieMap.get('WBTokenV3') || '',
    zzatw: cookieMap.get('__zzatw-wb') || '',
    cfidsw: cookieMap.get('cfidsw-wb') || '',
    currentFeatureVersion: cookieMap.get('current_feature_version') || '',
    externalLocale: cookieMap.get('external-locale') || '',
    locale: locale,
    [landingVersionKey]: cookieMap.get(landingVersionKey) || '',
    wbxValidationKey: cookieMap.get('wbx-validation-key') || '',
    supplierId: cookieMap.get('x-supplier-id') || '',
    supplierIdExternal: cookieMap.get('x-supplier-id-external') || '',
    _wbauid: cookieMap.get('_wbauid') || '',
  } as CookieProps;
}
