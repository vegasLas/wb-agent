/**
 * Global window extensions for multi-auth support
 */

declare global {
  interface Window {
    /** True if running inside Telegram WebApp */
    __IS_TELEGRAM_WEBAPP__?: boolean;
    /** True if browser mode is forced via URL params */
    __FORCE_BROWSER_MODE__?: boolean;
    /** Current auth mode: 'telegram' or 'browser' */
    __AUTH_MODE__?: 'telegram' | 'browser';
    
    /** Telegram WebApp object */
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        expand?: () => void;
        ready?: () => void;
        close?: () => void;
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        version?: string;
        platform?: string;
      };
    };
  }
}

export {};
