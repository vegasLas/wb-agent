/**
 * Telegram Web App Utilities
 *
 * Re-implementation of Telegram Web App functionality without relying on window.Telegram.
 * Communicates directly with Telegram via postMessage/TelegramWebviewProxy.
 *
 * Based on: https://telegram.org/js/telegram-web-app.js
 */

import {
  getThemeParams,
  getTelegramColorScheme,
  isTelegramWebApp,
  type TelegramThemeParams,
  type ColorScheme,
} from './theme';

// Re-export theme utilities for convenience
export {
  getThemeParams,
  getTelegramColorScheme,
  isTelegramWebApp,
  type TelegramThemeParams,
  type ColorScheme,
};

// LocalStorage key for initData
const INITDATA_STORAGE_KEY = '__telegram__initData';

/**
 * Get initData from localStorage
 */
function getStoredInitData(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(INITDATA_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store initData in localStorage
 */
function storeInitData(initData: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INITDATA_STORAGE_KEY, initData);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get initData from URL hash or search params
 */
function getInitDataFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const fromSearch = urlParams.get('tgWebAppData');
  if (fromSearch) return fromSearch;

  const hash = window.location.hash.slice(1);
  if (hash.includes('tgWebAppData=')) {
    const hashParams = new URLSearchParams(hash);
    const fromHash = hashParams.get('tgWebAppData');
    if (fromHash) return fromHash;
  }

  return null;
}

/**
 * Get Telegram initData
 * 
 * Logic:
 * 1. ALWAYS check URL first (freshest data from Telegram)
 *    - If found: update localStorage and return it
 * 2. If no URL data: check localStorage (sub-route reload fallback)
 * 3. If neither: return null (web mode)
 */
export function getInitData(): string | null {
  if (typeof window === 'undefined') return null;

  const fromUrl = getInitDataFromUrl();
  if (fromUrl) {
    storeInitData(fromUrl);
    return fromUrl;
  }

  const fromStorage = getStoredInitData();
  if (fromStorage) {
    console.log('[Telegram InitData] Using cached initData from localStorage');
    return fromStorage;
  }

  return null;
}

/**
 * Clear stored initData (useful for logout)
 */
export function clearInitData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(INITDATA_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// WebApp version (minimum supported)
const MIN_WEBAPP_VERSION = '6.0';

/**
 * Get WebApp version from URL init params
 */
function getWebAppVersion(): string {
  if (typeof window === 'undefined') return MIN_WEBAPP_VERSION;

  try {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    return params.get('tgWebAppVersion') || MIN_WEBAPP_VERSION;
  } catch {
    return MIN_WEBAPP_VERSION;
  }
}

/**
 * Compare two version strings
 */
function versionCompare(v1: string, v2: string): number {
  const parts1 = v1.replace(/^\s+|\s+$/g, '').split('.');
  const parts2 = v2.replace(/^\s+|\s+$/g, '').split('.');
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parseInt(parts1[i], 10) || 0;
    const p2 = parseInt(parts2[i], 10) || 0;
    if (p1 === p2) continue;
    return p1 > p2 ? 1 : -1;
  }

  return 0;
}

/**
 * Check if WebApp version is at least the specified version
 */
function versionAtLeast(version: string): boolean {
  return versionCompare(getWebAppVersion(), version) >= 0;
}

/**
 * Check if running inside an iframe
 */
function isIframe(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.parent != null && window !== window.parent;
  } catch {
    return true;
  }
}

/**
 * Post event to Telegram WebApp
 * Supports multiple communication channels:
 * 1. window.TelegramWebviewProxy - Native mobile apps
 * 2. window.external.notify - Windows Phone
 * 3. window.parent.postMessage - Web version (iframe)
 */
function postEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
): boolean {
  if (typeof window === 'undefined') return false;

  const data = eventData ?? {};

  console.log('[Telegram.WebApp] > postEvent', eventType, data);

  // Method 1: Native app via TelegramWebviewProxy
  const tgProxy = (window as { TelegramWebviewProxy?: { postEvent: (type: string, data: string) => void } }).TelegramWebviewProxy;
  if (tgProxy) {
    try {
      tgProxy.postEvent(eventType, JSON.stringify(data));
      return true;
    } catch {
      // Continue to next method
    }
  }

  // Method 2: Windows Phone via external.notify
  const ext = window.external as { notify?: (msg: string) => void } | undefined;
  if (ext && 'notify' in ext) {
    try {
      ext.notify?.(
        JSON.stringify({ eventType, eventData: data }),
      );
      return true;
    } catch {
      // Continue to next method
    }
  }

  // Method 3: Web version via postMessage (iframe)
  if (isIframe()) {
    try {
      window.parent.postMessage(
        JSON.stringify({ eventType, eventData: data }),
        '*',
      );
      return true;
    } catch {
      // Failed to post message
    }
  }

  console.warn('[Telegram.WebApp] postEvent not available for event:', eventType);
  return false;
}

/**
 * Close the WebApp
 *
 * @param options - Optional close options
 * @param options.return_back - If true, returns to the previous chat (version 7.6+)
 * @returns true if close command was sent successfully
 */
export function closeWebApp(options?: { return_back?: boolean }): boolean {
  if (!isTelegramWebApp()) {
    console.log('[Telegram.WebApp] Not in Telegram WebApp context, skipping close');
    return false;
  }

  const params: Record<string, unknown> = {};

  if (options?.return_back && versionAtLeast('7.6')) {
    params.return_back = true;
  }

  return postEvent('web_app_close', params);
}

/**
 * Expand the WebApp to full height
 * This removes the bottom gap and expands to the full available height.
 *
 * @returns true if expand command was sent successfully
 */
export function expandWebApp(): boolean {
  if (!isTelegramWebApp()) {
    console.log('[Telegram.WebApp] Not in Telegram WebApp context, skipping expand');
    return false;
  }

  return postEvent('web_app_expand');
}

/**
 * Notify Telegram that the WebApp is ready to be displayed.
 * This tells Telegram to hide the loading indicator and show the app.
 *
 * @returns true if ready command was sent successfully
 */
export function readyWebApp(): boolean {
  if (!isTelegramWebApp()) {
    console.log('[Telegram.WebApp] Not in Telegram WebApp context, skipping ready');
    return false;
  }

  return postEvent('web_app_ready');
}

/**
 * Request fullscreen mode for Telegram Mini Apps.
 * Requires Telegram WebApp v8.0+.
 *
 * In fullscreen mode, the Telegram header is hidden and the app
 * takes up the entire screen.
 *
 * @returns true if request was sent successfully
 */
export function requestFullscreen(): boolean {
  if (!isTelegramWebApp()) {
    console.log('[Telegram.WebApp] Not in Telegram WebApp context, skipping requestFullscreen');
    return false;
  }

  if (!versionAtLeast('8.0')) {
    console.warn('[Telegram.WebApp] Method requestFullscreen is not supported in version ' + getWebAppVersion());
    return false;
  }

  return postEvent('web_app_request_fullscreen');
}

/**
 * Exit fullscreen mode for Telegram Mini Apps.
 * Requires Telegram WebApp v8.0+.
 *
 * @returns true if exit command was sent successfully
 */
export function exitFullscreen(): boolean {
  if (!isTelegramWebApp()) {
    console.log('[Telegram.WebApp] Not in Telegram WebApp context, skipping exitFullscreen');
    return false;
  }

  if (!versionAtLeast('8.0')) {
    console.warn('[Telegram.WebApp] Method exitFullscreen is not supported in version ' + getWebAppVersion());
    return false;
  }

  return postEvent('web_app_exit_fullscreen');
}
