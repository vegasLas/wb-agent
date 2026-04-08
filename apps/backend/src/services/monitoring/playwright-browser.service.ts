/**
 * Playwright Browser Service
 * Phase 6: Browser Automation
 *
 * Main service for browser automation - navigates to WB portal and selects dates.
 * Uses Playwright with fingerprint injection to avoid detection.
 */

import {
  chromium,
  Browser,
  Page,
  BrowserContext,
  Cookie,
  type BrowserContextOptions,
} from 'playwright';
import type { Proxy } from '@/utils/userEnvInfo';
import {
  browserFingerprintService,
  type Fingerprint,
} from './browser-fingerprint.service';
import {
  decodeCookies,
  getCookiesFromAccount,
  saveCookiesToAccount,
} from '@/utils/cookies';
import {
  getLocalStorageFromAccount,
  mergeLocalStorageToAccount,
} from '@/utils/localStorage';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PlaywrightBrowser');

// Browser error codes
export enum BrowserErrorCode {
  BROWSER_INIT_FAILED = 'BROWSER_INIT_FAILED',
  CONTEXT_CREATION_FAILED = 'CONTEXT_CREATION_FAILED',
  PAGE_CREATION_FAILED = 'PAGE_CREATION_FAILED',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  CALENDAR_LOAD_TIMEOUT = 'CALENDAR_LOAD_TIMEOUT',
  DATE_ELEMENT_NOT_FOUND = 'DATE_ELEMENT_NOT_FOUND',
  DATE_SELECTION_FAILED = 'DATE_SELECTION_FAILED',
  NEXT_BUTTON_NOT_FOUND = 'NEXT_BUTTON_NOT_FOUND',
  NEXT_BUTTON_CLICK_FAILED = 'NEXT_BUTTON_CLICK_FAILED',
  PACKAGING_VIEW_TIMEOUT = 'PACKAGING_VIEW_TIMEOUT',
  LOGIN_FORM_DETECTED = 'LOGIN_FORM_DETECTED',
  PAGE_ERROR_NOTIFICATION = 'PAGE_ERROR_NOTIFICATION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorNotification {
  title: string;
  description?: string;
}

interface BrowserError extends Error {
  code: BrowserErrorCode;
  originalError?: Error;
}

export interface BrowserServiceOptions {
  warehouseId: string;
  draftId: string;
  preorderId: string;
  dateString: string;
  cookies?: Cookie[];
}

export interface SelectDateOptions {
  warehouseId: string;
  draftId: string;
  preorderId: string;
  effectiveDate: Date;
  cookiesString: string;
  accountId: string;
  supplierId: string;
  proxy?: Proxy;
  userAgent?: string;
  fingerprint?: Fingerprint;
  transitWarehouseId?: number | null;
  supplyType?: string;
  monopalletCount?: number | null;
}

export class PlaywrightBrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private accountId: string | null = null; // Track account ID for localStorage refresh
  private fingerprint: Fingerprint | null = null; // Store fingerprint for injection
  private useFingerprintInjection = true; // Enable fingerprint injection by default
  private transitWarehouseId: number | null = null; // Store transit warehouse ID for URL building
  private userAgent: string | undefined;

  private createError(
    code: BrowserErrorCode,
    message: string,
    originalError?: Error,
  ): Error {
    // Add unavailable date text to all errors except login-related ones
    const isLoginError = code === BrowserErrorCode.LOGIN_FORM_DETECTED;
    const finalMessage = isLoginError
      ? message
      : `${message} Эта дата уже недоступна`;

    const error = new Error(finalMessage) as BrowserError;
    error.code = code;
    error.originalError = originalError;
    return error;
  }

  /**
   * Checks for error notifications on the page and extracts their titles and descriptions
   * Detects error modal elements with selectors matching:
   * - .Notification-modal--error
   * - .Notification-modal__title--error
   * - .Notification-modal__description--error
   */
  private async checkForErrorNotifications(): Promise<ErrorNotification[]> {
    if (!this.page) {
      return [];
    }

    try {
      // Use race to wait for either error notifications or timeout
      const notifications = await Promise.race([
        this.page.locator('.Notification-modal--error').all(),
        new Promise<[]>((resolve) => setTimeout(() => resolve([]), 500)),
      ]);

      if (!Array.isArray(notifications) || notifications.length === 0) {
        return [];
      }

      const errorNotifications: ErrorNotification[] = [];

      for (const notification of notifications) {
        const titleElement = notification
          .locator('.Notification-modal__title--error')
          .first();
        const descriptionElement = notification
          .locator('.Notification-modal__description--error')
          .first();

        const title = await titleElement.textContent().catch(() => '');
        const description = await descriptionElement
          .textContent()
          .catch(() => null);

        if (title) {
          const notif: ErrorNotification = {
            title: title.trim(),
            ...(description && { description: description.trim() }),
          };
          errorNotifications.push(notif);
        }
      }

      return errorNotifications;
    } catch (error) {
      // Error checking for notifications - continue operation
      return [];
    }
  }

  private static getPlaywrightOptions(proxy?: Proxy) {
    // Match the simple launch options pattern from openWithCookies.js
    const options: {
      proxy?: { server: string; username?: string; password?: string };
    } = {};

    // Add proxy configuration if provided (matching JS pattern)
    if (proxy) {
      options.proxy = {
        server: `http://${proxy.ip}:${proxy.port}`,
      };
      if (proxy.username && proxy.password) {
        options.proxy.username = proxy.username;
        options.proxy.password = proxy.password;
      }
    }

    return options;
  }

  async initialize(
    proxy?: Proxy,
    userAgent?: string,
    fingerprint?: Fingerprint,
  ): Promise<void> {
    try {
      const options = PlaywrightBrowserService.getPlaywrightOptions(proxy);
      this.browser = await chromium.launch(options);
      this.userAgent = userAgent;
      this.fingerprint = fingerprint || null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw this.createError(
        BrowserErrorCode.BROWSER_INIT_FAILED,
        `Failed to initialize browser: ${err.message}`,
        err,
      );
    }
  }

  async createContext(cookies?: Cookie[]): Promise<void> {
    try {
      if (!this.browser) {
        throw this.createError(
          BrowserErrorCode.BROWSER_INIT_FAILED,
          'Browser not initialized. Call initialize() first.',
        );
      }

      const contextOptions: BrowserContextOptions = {};

      // Apply fingerprint properties to context if available (matching browserFingerprintService.js pattern)
      if (this.fingerprint && this.useFingerprintInjection) {
        contextOptions.userAgent = this.fingerprint.userAgent;
        contextOptions.locale = this.fingerprint.language;
        contextOptions.timezoneId = 'Europe/Moscow';
        // Use fingerprint screenResolution if available, otherwise default to 1920x1080
        const screenResolution = this.fingerprint.screenResolution || [
          1920, 1080,
        ];
        contextOptions.viewport = {
          width: screenResolution[0],
          height: screenResolution[1],
        };
        contextOptions.deviceScaleFactor = 1;
        contextOptions.isMobile = false;
        contextOptions.hasTouch = false;
        contextOptions.colorScheme = 'dark';
      } else if (this.userAgent) {
        contextOptions.userAgent = this.userAgent;
      }

      this.context = await this.browser.newContext(contextOptions);

      if (cookies && cookies.length > 0) {
        await this.context.addCookies(cookies);
      }
    } catch (error) {
      if ((error as BrowserError).code) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw this.createError(
        BrowserErrorCode.CONTEXT_CREATION_FAILED,
        `Failed to create context: ${err.message}`,
        err,
      );
    }
  }

  async createPage(): Promise<Page> {
    try {
      if (!this.context) {
        throw this.createError(
          BrowserErrorCode.CONTEXT_CREATION_FAILED,
          'Context not created. Call createContext() first.',
        );
      }

      this.page = await this.context.newPage();

      // Inject fingerprint if available
      if (this.fingerprint && this.useFingerprintInjection && this.page) {
        try {
          await browserFingerprintService.inject(this.page, this.fingerprint);
        } catch (error) {
          // Continue without fingerprint injection - not critical for operation
        }
      }

      // Note: localStorage restoration and periodic refresh are handled in selectDateAndNavigate()
      // to match the openWithCookies.js flow: init session → load all-supplies → restore storage → refresh
      return this.page;
    } catch (error) {
      if ((error as BrowserError).code) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw this.createError(
        BrowserErrorCode.PAGE_CREATION_FAILED,
        `Failed to create page: ${err.message}`,
        err,
      );
    }
  }

  /**
   * Sets the monopallet count in the amountPallet input field
   */
  async setMonopalletCount(count: number): Promise<void> {
    try {
      if (!this.page) {
        throw new Error('Page not created.');
      }

      const amountInput = this.page
        .locator('input#amountPallet[data-testid="input"]')
        .first();
      await amountInput.waitFor({ state: 'visible', timeout: 5000 });

      // Clear existing value and type the new value
      await amountInput.fill(String(count));

      // Trigger input/change events to ensure React picks up the value
      await amountInput.evaluate((el, value) => {
        const input = el as HTMLInputElement;
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, count);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        `Failed to set monopallet count: ${err.message}`,
      );
      throw this.createError(
        BrowserErrorCode.DATE_SELECTION_FAILED,
        `Failed to set monopallet count: ${err.message}`,
        err,
      );
    }
  }

  async navigateToSupplyManagement(
    options: BrowserServiceOptions,
  ): Promise<void> {
    try {
      if (!this.page) {
        throw this.createError(
          BrowserErrorCode.PAGE_CREATION_FAILED,
          'Page not created. Call createPage() first.',
        );
      }

      const url = this.buildSupplyManagementUrl(options);
      try {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.message.includes('timeout')) {
          throw this.createError(
            BrowserErrorCode.NAVIGATION_TIMEOUT,
            `Navigation timeout while loading URL: ${url}`,
            err,
          );
        }
        throw this.createError(
          BrowserErrorCode.NAVIGATION_FAILED,
          `Failed to navigate to supply management page: ${err.message}`,
          err,
        );
      }

      try {
        // Wait for calendar cell content to load or error notification
        await Promise.race([
          this.page.waitForSelector(
            '[class*="Calendar-cell__cell-content__"]',
            { timeout: 15000 },
          ),
          (async () => {
            if (!this.page) return;
            await this.page.waitForSelector('.Notification-modal--error', {
              timeout: 15000,
            });
            const errorNotifications = await this.checkForErrorNotifications();
            if (errorNotifications.length > 0) {
              const notificationsSummary = errorNotifications
                .map(
                  (n) =>
                    `"${n.title}"${n.description ? ` - ${n.description}` : ''}`,
                )
                .join('; ');
              throw this.createError(
                BrowserErrorCode.PAGE_ERROR_NOTIFICATION,
                `Page error notifications detected: ${notificationsSummary}`,
              );
            }
          })(),
        ]);
      } catch (error) {
        if (
          (error as BrowserError).code ===
          BrowserErrorCode.PAGE_ERROR_NOTIFICATION
        ) {
          throw error;
        }
        const err = error instanceof Error ? error : new Error(String(error));
        throw this.createError(
          BrowserErrorCode.CALENDAR_LOAD_TIMEOUT,
          `Timeout waiting for calendar to load: ${err.message}`,
          err,
        );
      }
    } catch (error) {
      if ((error as BrowserError).code) {
        throw error;
      }
      throw this.createError(
        BrowserErrorCode.UNKNOWN_ERROR,
        `Unknown error in navigateToSupplyManagement: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async selectDateByDateString(dateString: string): Promise<void> {
    try {
      if (!this.page) {
        logger.error(`Page not created`);
        throw this.createError(
          BrowserErrorCode.PAGE_CREATION_FAILED,
          'Page not created.',
        );
      }

      try {
        await this.page.waitForSelector(`text=${dateString}`, { timeout: 500 });
        const dateElements = await this.page
          .locator(`text=${dateString}`)
          .all();

        if (dateElements.length === 0) {
          logger.error(
            `No date elements found for "${dateString}"`,
          );
          throw this.createError(
            BrowserErrorCode.DATE_ELEMENT_NOT_FOUND,
            `Date element with text "${dateString}" not found`,
          );
        }

        let dateSelected = false;

        // Iterate through all date elements to find and select the correct one
        for (let i = 0; i < dateElements.length; i++) {
          const dateElement = dateElements[i];

          const parentCell = dateElement.locator(
            'xpath=ancestor::td[@data-testid]',
          );
          const classAttribute = await parentCell.getAttribute('class');

          // Skip disabled cells
          if (
            classAttribute &&
            classAttribute.includes('Calendar-cell--is-disabled__')
          ) {
            continue;
          }

          // Hover on the parent td element to reveal choose date button
          await parentCell.hover();

          // Get the choose date button and click it
          try {
            const chooseDateButton = this.page
              .locator('[data-testid^="calendar-cell-choose-date-"]')
              .first();
            await chooseDateButton.waitFor({ state: 'visible', timeout: 5000 });

            // Use evaluate to click without moving mouse (keeps hover active)
            await chooseDateButton.evaluate((el) => {
              (el as HTMLElement).click();
            });
          } catch (error) {
            continue;
          }

          // Check if "Отмена" button appears - this confirms the date was selected successfully
          try {
            const cancelButton = this.page
              .locator('[data-testid^="calendar-cell-cancel-date-"]')
              .first();
            await cancelButton.waitFor({ state: 'visible', timeout: 1000 });

            dateSelected = true;
            break;
          } catch {
            // no-op
          }
        }

        if (!dateSelected) {
          logger.error(
            `Could not select any date element for "${dateString}"`,
          );
          throw this.createError(
            BrowserErrorCode.DATE_ELEMENT_NOT_FOUND,
            `Could not select any date element for "${dateString}"`,
          );
        }
      } catch (error) {
        if (
          (error as BrowserError).code ===
          BrowserErrorCode.DATE_ELEMENT_NOT_FOUND
        ) {
          throw error;
        }
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Date selection failed: ${err.message}`);
        throw this.createError(
          BrowserErrorCode.DATE_SELECTION_FAILED,
          `Failed to select date: ${err.message}`,
          err,
        );
      }

      try {
        // Click the next button to proceed
        const nextButton = this.page.locator(
          '[data-testid="steps-next-button-primary"]',
        );
        await nextButton.waitFor({ state: 'visible', timeout: 5000 });

        // Wait for disabled attribute to be removed (React needs time to re-render after input)
        let attempts = 0;
        let isEnabled = false;
        let lastError: string | null = null;

        while (attempts < 100) {
          try {
            // Check if button is enabled
            const hasDisabled = await nextButton.evaluate((el) =>
              el.hasAttribute('disabled'),
            );

            if (!hasDisabled) {
              isEnabled = true;
              break;
            }
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
          }
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }

        if (!isEnabled) {
          logger.error(
            `Button still disabled after 10s. Last error: ${lastError || 'none'}`,
          );
          throw new Error('Next button is still disabled after 10s');
        }

        await nextButton.click();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Next button error: ${err.message}`);
        if (err.message.includes('not found')) {
          throw this.createError(
            BrowserErrorCode.NEXT_BUTTON_NOT_FOUND,
            `Next button not found: ${err.message}`,
            err,
          );
        }
        throw this.createError(
          BrowserErrorCode.NEXT_BUTTON_CLICK_FAILED,
          `Failed to click next button: ${err.message}`,
          err,
        );
      }

      try {
        // Wait for packaging view or error notification
        await Promise.race([
          this.page!.waitForSelector(
            '[class*="Packaging-view__header-container__"]',
            { timeout: 30000 },
          ),
          (async () => {
            await this.page!.waitForSelector('.Notification-modal--error', {
              timeout: 30000,
            });
            const errorNotifications = await this.checkForErrorNotifications();
            if (errorNotifications.length > 0) {
              const summary = errorNotifications
                .map(
                  (n) =>
                    `"${n.title}"${n.description ? ` - ${n.description}` : ''}`,
                )
                .join('; ');
              logger.error(
                `Error notification detected: ${summary}`,
              );
              throw this.createError(
                BrowserErrorCode.PAGE_ERROR_NOTIFICATION,
                `Page error: ${summary}`,
              );
            }
          })(),
        ]);
      } catch (error) {
        if (
          (error as BrowserError).code ===
          BrowserErrorCode.PAGE_ERROR_NOTIFICATION
        )
          throw error;
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Packaging view timeout: ${err.message}`);
        throw this.createError(
          BrowserErrorCode.PACKAGING_VIEW_TIMEOUT,
          `Timeout: ${err.message}`,
          err,
        );
      }
    } catch (error) {
      if ((error as BrowserError).code) throw error;
      logger.error(
        `Unknown error in selectDateByDateString: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw this.createError(
        BrowserErrorCode.UNKNOWN_ERROR,
        `Unknown error in selectDateByDateString: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not created.');
    }
    return this.page.url();
  }

  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not created.');
    }
    return this.page.content();
  }

  private extractRelevantCookies(cookies: Cookie[]): Cookie[] {
    const relevant = cookies.filter((cookie) => cookie.name === 'wbx-refresh');
    return relevant;
  }

  private extractRelevantStorage(
    storage: Record<string, string>,
  ): Record<string, string> {
    const relevant: Record<string, string> = {};
    const relevantKeyPatterns = ['access-token', 'successful_login'];

    Object.keys(storage).forEach((key) => {
      // Check if key matches any of the relevant patterns
      if (relevantKeyPatterns.some((pattern) => key.includes(pattern))) {
        relevant[key] = storage[key];
      }
    });

    return relevant;
  }

  private startPeriodicRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        // Refresh cookies
        if (this.context) {
          const currentCookies = await this.context.cookies();
          const relevantCookies = this.extractRelevantCookies(currentCookies);

          if (relevantCookies.length > 0 && this.accountId) {
            // Get existing cookies and merge with relevant ones
            const existingCookies = await getCookiesFromAccount(this.accountId);

            // Replace/update relevant cookie keys in existing cookies
            const mergedCookies = existingCookies.filter(
              (c) => !relevantCookies.some((rc) => rc.name === c.name),
            );
            mergedCookies.push(...relevantCookies);

            await saveCookiesToAccount(mergedCookies, this.accountId);
          }
        }

        // Refresh localStorage
        if (this.page && this.accountId) {
          const currentLocalStorage = await this.page.evaluate(() => {
            const storage: Record<string, string> = {};
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (key) {
                storage[key] = window.localStorage.getItem(key) || '';
              }
            }
            return storage;
          });

          const relevantStorage =
            this.extractRelevantStorage(currentLocalStorage);
          if (Object.keys(relevantStorage).length > 0) {
            const existingStorage = await getLocalStorageFromAccount(
              this.accountId,
            );

            // Replace/update relevant storage keys in existing storage
            const mergedStorage = { ...existingStorage };
            Object.assign(mergedStorage, relevantStorage);

            await mergeLocalStorageToAccount(mergedStorage, this.accountId);
          }
        }
      } catch (error) {
        // Error refreshing session - continue operation
      }
    }, 3000);
  }

  private stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async close(): Promise<void> {
    this.stopPeriodicRefresh();

    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private buildSupplyManagementUrl(options: {
    warehouseId: string;
    draftId: string;
    preorderId: string;
  }): string {
    const baseUrl =
      'https://seller.wildberries.ru/supplies-management/new-supply/choose-date';
    const params = new URLSearchParams();

    params.append('warehouseId', options.warehouseId);
    params.append('draftID', options.draftId);
    params.append('preorderID', options.preorderId);

    // Add transitWarehouseId if provided
    if (this.transitWarehouseId) {
      params.append('transitWarehouseId', String(this.transitWarehouseId));
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Decodes cookies from encrypted string format and converts to Playwright Cookie format
   * Updates supplier ID cookies with the provided supplierId
   */
  async decodeCookiesFromString(
    cookiesString: string,
    supplierId: string,
  ): Promise<Cookie[]> {
    const cookies = decodeCookies(cookiesString);

    // Filter and update supplier ID cookies
    return cookies.map((cookie) => {
      if (
        cookie.name === 'x-supplier-id-external' ||
        cookie.name === 'x-supplier-id'
      ) {
        return { ...cookie, value: supplierId };
      }
      return cookie;
    });
  }

  /**
   * Formats date to Russian calendar format (e.g., "4 декабря")
   */
  formatDateToRussian(date: Date): string {
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${day} ${month}`;
  }

  /**
   * Formats date to English calendar format (e.g., "4 December")
   */
  formatDateToEnglish(date: Date): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${day} ${month}`;
  }

  /**
   * Check if login form is detected (indicates expired credentials)
   */
  private async isLoginFormDetected(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const loginFormElement = await this.page
        .waitForSelector('[class*="LoginFormView__subtitle-"]', {
          timeout: 2000,
        })
        .catch(() => null);
      return !!loginFormElement;
    } catch {
      return false;
    }
  }

  /**
   * Restore localStorage from database
   */
  private async restoreLocalStorage(): Promise<void> {
    if (!this.page || !this.accountId) return;

    try {
      const localStorageData = await getLocalStorageFromAccount(this.accountId);

      if (Object.keys(localStorageData).length > 0) {
        await this.page.evaluate((storage) => {
          for (const [key, value] of Object.entries(storage)) {
            window.localStorage.setItem(key, value);
          }
        }, localStorageData);
      }
    } catch (error) {
      // Non-critical - continue
    }
  }

  /**
   * Complete flow: Initialize browser, navigate to supply management, and select date
   * This is the main entry point for date selection automation
   */
  async selectDateAndNavigate(options: SelectDateOptions): Promise<void> {
    logger.debug(`[selectDateAndNavigate] Starting with accountId: ${options.accountId}, supplierId: ${options.supplierId}`);
    logger.debug(`[selectDateAndNavigate] Warehouse: ${options.warehouseId}, draftId: ${options.draftId}`);
    logger.debug(`[selectDateAndNavigate] PreorderId: ${options.preorderId}, effectiveDate: ${options.effectiveDate.toISOString()}`);
    logger.debug(`[selectDateAndNavigate] Supply type: ${options.supplyType}, monopalletCount: ${options.monopalletCount || 'N/A'}`);
    logger.debug(`[selectDateAndNavigate] Has proxy: ${!!options.proxy}, UserAgent: ${options.userAgent ? 'provided' : 'not provided'}`);

    try {
      this.accountId = options.accountId;
      this.transitWarehouseId = options.transitWarehouseId || null;
      logger.debug(`[selectDateAndNavigate] Set accountId and transitWarehouseId: ${this.transitWarehouseId || 'null'}`);

      logger.debug(`[selectDateAndNavigate] Decoding cookies for supplier ${options.supplierId}`);
      const cookiesFromString = await this.decodeCookiesFromString(
        options.cookiesString,
        options.supplierId,
      );
      logger.debug(`[selectDateAndNavigate] Decoded ${cookiesFromString.length} cookies`);

      const russianDateString = this.formatDateToRussian(options.effectiveDate);
      const englishDateString = this.formatDateToEnglish(options.effectiveDate);
      logger.debug(`[selectDateAndNavigate] Date strings - Russian: "${russianDateString}", English: "${englishDateString}"`);

      logger.debug(`[selectDateAndNavigate] Initializing browser with fingerprint`);
      await this.initialize(
        options.proxy,
        options.userAgent,
        options.fingerprint,
      );
      logger.debug(`[selectDateAndNavigate] Browser initialized, creating context`);
      await this.createContext(cookiesFromString);
      logger.debug(`[selectDateAndNavigate] Context created, creating page`);
      await this.createPage();
      logger.debug(`[selectDateAndNavigate] Page created: ${!!this.page}`);

      if (this.page) {
        logger.debug(`[selectDateAndNavigate] Navigating to seller.wildberries.ru`);
        await this.page.goto('https://seller.wildberries.ru', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        logger.debug(`[selectDateAndNavigate] Page loaded, starting periodic refresh`);
        this.startPeriodicRefresh();

        // Restore localStorage
        logger.debug(`[selectDateAndNavigate] Restoring localStorage`);
        await this.restoreLocalStorage();
        logger.debug(`[selectDateAndNavigate] localStorage restored`);

        logger.debug(`[selectDateAndNavigate] Navigating to supply management`);
        await this.navigateToSupplyManagement({
          warehouseId: options.warehouseId,
          draftId: options.draftId,
          preorderId: options.preorderId,
          dateString: russianDateString,
        });
        logger.debug(`[selectDateAndNavigate] Supply management navigation completed`);

        // Set monopallet count before navigating (if MONOPALLETE)
        if (
          options.supplyType === 'MONOPALLETE' &&
          options.monopalletCount &&
          options.monopalletCount > 0
        ) {
          logger.debug(`[selectDateAndNavigate] Setting monopallet count: ${options.monopalletCount}`);
          await this.setMonopalletCount(options.monopalletCount);
          logger.debug(`[selectDateAndNavigate] Monopallet count set successfully`);
        }

        logger.debug(`[selectDateAndNavigate] Selecting date with Russian format: "${russianDateString}"`);
        try {
          await this.selectDateByDateString(russianDateString);
          logger.debug(`[selectDateAndNavigate] Date selected successfully with Russian format`);
        } catch (err) {
          logger.debug(`[selectDateAndNavigate] Russian format failed, trying English format: "${englishDateString}"`);
          await this.selectDateByDateString(englishDateString);
          logger.debug(`[selectDateAndNavigate] Date selected successfully with English format`);
        }
      } else {
        logger.debug(`[selectDateAndNavigate] Page creation failed, skipping navigation`);
      }
      logger.debug(`[selectDateAndNavigate] Completed successfully`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[selectDateAndNavigate] Error: ${errMsg}`);
      logger.debug(`[selectDateAndNavigate] Full error:`, error);

      // Check if LoginFormView is present (indicating deprecated credentials)
      if (await this.isLoginFormDetected()) {
        throw this.createError(
          BrowserErrorCode.LOGIN_FORM_DETECTED,
          'Cookies and localStorage are deprecated - login form detected',
        );
      }

      throw error;
    } finally {
      await this.close();
    }
  }
}

export const playwrightBrowserService = new PlaywrightBrowserService();
