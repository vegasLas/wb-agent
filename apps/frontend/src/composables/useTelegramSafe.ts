/**
 * Simple utilities for Telegram/Browser mode detection
 */

export function isTelegramMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__IS_TELEGRAM_WEBAPP__ === true;
}

export function isBrowserMode(): boolean {
  if (typeof window === 'undefined') return true;
  return window.__AUTH_MODE__ === 'browser';
}
