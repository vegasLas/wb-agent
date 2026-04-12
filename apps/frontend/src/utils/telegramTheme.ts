/**
 * Telegram Web App Theme Detection Utilities
 *
 * Detects color theme from Telegram Web App without relying on window.Telegram.
 * Uses the same logic as the official telegram-web-app.js script:
 * - Parses theme params from URL hash (tgWebAppThemeParams)
 * - Falls back to sessionStorage for cached theme params
 * - Detects color scheme by analyzing bg_color luminance
 *
 * @see https://telegram.org/js/telegram-web-app.js
 */

export interface TelegramThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  bottom_bar_bg_color?: string;
  [key: string]: string | undefined;
}

export type ColorScheme = 'dark' | 'light';

const SESSION_STORAGE_KEY = '__telegram__themeParams';

/**
 * Parse URL hash parameters
 * Telegram passes theme params in the URL hash like: #tgWebAppThemeParams={...}
 *
 * @param locationHash - The URL hash string (e.g., "#tgWebAppData=...&tgWebAppThemeParams={...}")
 * @returns Object containing parsed key-value pairs from the hash
 */
export function parseUrlHashParams(locationHash: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hash = locationHash.replace(/^#/, '');

  if (!hash.length) {
    return params;
  }

  const queryIndex = hash.indexOf('?');
  const queryString = queryIndex >= 0 ? hash.substring(queryIndex + 1) : hash;

  if (!queryString.length) {
    return params;
  }

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      params[key] = value || '';
    }
  }

  return params;
}

/**
 * Validate and normalize a hex color string
 * Supports: #RGB, #RRGGBB (with or without #)
 */
function normalizeHexColor(hexColor: string): string | null {
  const hex = hexColor.replace(/[\s#]/g, '').toLowerCase();
  
  if (!/^[0-9a-f]+$/.test(hex)) {
    return null;
  }
  
  if (hex.length !== 3 && hex.length !== 6) {
    return null;
  }
  
  return hex;
}

/**
 * Check if a hex color is dark based on perceived brightness (luminance)
 * Uses the HSP (High Sensitive P) color model formula:
 * HSP = sqrt(0.299 * R² + 0.587 * G² + 0.114 * B²)
 *
 * Colors with HSP < 120 are considered dark (matches Telegram's algorithm)
 */
export function isColorDark(hexColor: string): boolean {
  const hex = normalizeHexColor(hexColor);
  
  if (!hex) {
    return false;
  }

  let r: number;
  let g: number;
  let b: number;

  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  return hsp < 120;
}

/**
 * Get theme params from sessionStorage (cached from previous load)
 */
function getStoredThemeParams(): TelegramThemeParams | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TelegramThemeParams;
    }
  } catch {
    // sessionStorage not available or invalid JSON
  }

  return null;
}

/**
 * Store theme params in sessionStorage for persistence across page reloads
 */
function storeThemeParams(themeParams: TelegramThemeParams): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(themeParams));
  } catch {
    // sessionStorage not available
  }
}

/**
 * Get theme params from multiple sources in priority order:
 * 1. URL hash params (tgWebAppThemeParams) - set by Telegram
 * 2. sessionStorage - cached from previous load
 */
export function getThemeParams(): TelegramThemeParams {
  const hashParams = parseUrlHashParams(window.location.hash);

  if (hashParams.tgWebAppThemeParams) {
    try {
      const themeParams = JSON.parse(hashParams.tgWebAppThemeParams) as TelegramThemeParams;
      storeThemeParams(themeParams);
      return themeParams;
    } catch {
      // Invalid JSON in theme params
    }
  }

  const stored = getStoredThemeParams();
  if (stored) {
    return stored;
  }

  return {};
}

/**
 * Detect color scheme from Telegram theme params
 * Analyzes the bg_color to determine if theme is dark or light
 */
function detectTelegramColorScheme(): ColorScheme | undefined {
  const themeParams = getThemeParams();

  if (themeParams.bg_color) {
    return isColorDark(themeParams.bg_color) ? 'dark' : 'light';
  }

  return undefined;
}

/**
 * Get the system color scheme preference
 */
function getSystemColorScheme(): ColorScheme {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Get the effective color scheme for Telegram Web App
 * Priority: Telegram theme params > system preference
 */
export function getTelegramColorScheme(): ColorScheme {
  return detectTelegramColorScheme() ?? getSystemColorScheme();
}

/**
 * Check if running in Telegram Web App environment
 * First checks the global flag __IS_TELEGRAM_WEBAPP__
 * Falls back to checking URL for tgWebAppData (handles sub-route reload edge case)
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  const flag = (window as { __IS_TELEGRAM_WEBAPP__?: boolean }).__IS_TELEGRAM_WEBAPP__;
  if (flag === true) return true;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('tgWebAppData')) return true;
  
  const hash = window.location.hash.slice(1);
  if (hash.includes('tgWebAppData=')) return true;
  
  return false;
}
