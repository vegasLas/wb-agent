import { Browser, chromium, Page, BrowserContext, Cookie } from 'playwright';
import { prisma } from '@/config/database';
import { userService } from '@/services/user.service';
import { accountService } from '@/services/account.service';
import { encodeCookies } from '@/utils/cookies';
import { encodeLocalStorage } from '@/utils/localStorage';
import { UserEnvInfo } from '@/types/wb';

const LOGIN_URL = 'https://seller-auth.wildberries.ru';

export interface AuthResult {
  success: boolean;
  cookies?: Cookie[];
  error?: Error;
  message?: string;
  supplierName?: string;
  requiresSMSCode?: boolean;
  requiresTwoFactor?: boolean;
  sessionId?: string;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
  userId: number;
}

export interface SMSVerificationRequest {
  smsCode: string;
  sessionId: string;
}

export interface TwoFactorRequest {
  twoFactorCode: string;
  sessionId: string;
}

interface AuthSession {
  userId: number;
  page?: Page;
  context?: BrowserContext;
  browser?: Browser;
  step: 'phone' | 'sms' | 'two_factor' | 'completed';
  phoneNumber?: string;
  createdAt: Date;
  timeoutId?: NodeJS.Timeout;
  userAgent?: string;
  proxy?: UserEnvInfo['proxy'];
}

// In-memory session storage (in production, use Redis or database)
const authSessions = new Map<string, AuthSession>();

export class AuthService {
  private async getPlaywrightOptions() {
    return {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
      ],
      headless: true,
      ignoreDefaultArgs: ['--enable-automation'],
    };
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const session = authSessions.get(sessionId);
    if (session) {
      try {
        if (session.timeoutId) {
          clearTimeout(session.timeoutId);
        }
        if (session.context) await session.context.close();
        if (session.browser) await session.browser.close();
      } catch (error) {
        console.error('Error cleaning up session:', error);
      }
      authSessions.delete(sessionId);
    }
  }

  private async enterSMSCode(page: Page, smsCode: string): Promise<void> {
    const digits = smsCode.split('');
    for (let i = 0; i < digits.length; i++) {
      // This function runs in browser context via Playwright
      await page.evaluate(
        ({ digit, index }: { digit: string; index: number }) => {
          const inputs = Array.from(
            document.querySelectorAll('input[data-testid="sms-code-input"]'),
          );
          const input = inputs[index] as HTMLInputElement | undefined;
          if (input) {
            input.value = digit;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        { digit: digits[i], index: i },
      );
      await page.waitForTimeout(100);
    }

    try {
      const errorSelector = 'div[class*="FormCodeInput__error-"]';
      const errorElement = await page.waitForSelector(errorSelector, {
        timeout: 2000,
      });
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new Error(errorText || 'Неверный код подтверждения');
      }
    } catch (error) {
      if ((error as Error).name !== 'TimeoutError') {
        throw error;
      }
    }
  }

  private async waitForLoginRedirect(page: Page): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await page.waitForSelector(
          '[class*="desktop-profile-select_DesktopProfileSelect__"]',
          { timeout: 45000 },
        );
        const selectorExists = await page.$(
          '[class*="desktop-profile-select_DesktopProfileSelect__"]',
        );
        if (selectorExists) {
          console.log('Login redirect completed - selector found');
          return;
        }

        const currentUrl = page.url();
        console.log('Current URL after navigation:', currentUrl);

        if (currentUrl.includes('seller.wildberries.ru')) {
          console.log('Login redirect completed - on seller page');
          return;
        }
      } catch (error: unknown) {
        attempt++;
        console.log(
          `Login redirect attempt ${attempt} failed:`,
          (error as Error).message,
        );

        if (attempt >= maxAttempts) {
          throw new Error(
            `Login redirect failed after ${maxAttempts} attempts: ${(error as Error).message}`,
          );
        }

        await page.waitForTimeout(3000);
      }
    }
  }

  private async checkForTwoFactor(page: Page): Promise<boolean> {
    try {
      const twoFactorInput = await page.waitForSelector(
        '.Portal-modal input[class*="SimpleInput-"]',
        { timeout: 1000 },
      );
      return !!twoFactorInput;
    } catch {
      return false;
    }
  }

  private getCountryCodeFromPhone(phoneNumber: string): {
    countryCode: string;
    formattedNumber: string;
  } {
    const cleanNumber = phoneNumber.replace('+', '');

    const countryMappings = [
      { prefix: '374', code: 'am', length: 11 }, // Armenia
      { prefix: '375', code: 'by', length: 12 }, // Belarus
      { prefix: '852', code: 'hk', length: 11 }, // Hong Kong
      { prefix: '7', code: 'ru', length: 11 }, // Russia/Kazakhstan
      { prefix: '996', code: 'kg', length: 12 }, // Kyrgyzstan
      { prefix: '86', code: 'cn', length: 13 }, // China
      { prefix: '853', code: 'mo', length: 11 }, // Macao
      { prefix: '90', code: 'tr', length: 12 }, // Turkey
      { prefix: '998', code: 'uz', length: 12 }, // Uzbekistan
    ];

    for (const mapping of countryMappings) {
      if (
        cleanNumber.startsWith(mapping.prefix) &&
        cleanNumber.length === mapping.length
      ) {
        if (mapping.prefix === '7' && cleanNumber.startsWith('77')) {
          return {
            countryCode: 'kz',
            formattedNumber: cleanNumber.substring(1),
          };
        }
        return {
          countryCode: mapping.code,
          formattedNumber: cleanNumber.substring(mapping.prefix.length),
        };
      }
    }

    return { countryCode: 'ru', formattedNumber: cleanNumber.substring(1) };
  }

  private async selectCountry(page: Page, countryCode: string): Promise<void> {
    try {
      await page.click('button[data-testid="country-code-select"]');
      await page.waitForSelector(
        `button[data-testid="country-select-${countryCode}"]`,
        { timeout: 3000 },
      );
      const countrySelector = `button[data-testid="country-select-${countryCode}"]`;
      await page.click(countrySelector);
      await page.waitForTimeout(500);
    } catch (error) {
      console.error(`Error selecting country ${countryCode}:`, error);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of authSessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      if (sessionAge > 10 * 60 * 1000) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.cleanupSession(sessionId);
    }
  }

  async initializeAuth(userId: number): Promise<AuthResult> {
    try {
      this.cleanupExpiredSessions();

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: new Error('Пользователь или номер телефона не найдены'),
        };
      }

      await userService.logoutWb(user.telegramId);

      const sessionId = this.generateSessionId();
      const options = await this.getPlaywrightOptions();
      const browser = await chromium.launch(options);

      const envInfo = user.envInfo as unknown as UserEnvInfo | undefined;
      const proxy = envInfo?.proxy;

      const context = await browser.newContext({
        viewport: {
          width: envInfo?.screenResolution?.[0] || 1920,
          height: envInfo?.screenResolution?.[1] || 1080,
        },
        deviceScaleFactor: 1,
        userAgent:
          envInfo?.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        proxy: proxy
          ? {
              server: `http://${proxy.ip}:${proxy.port}`,
              username: proxy.username,
              password: proxy.password,
            }
          : undefined,
      });

      const page = await context.newPage();
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

      const timeoutId = setTimeout(
        () => {
          console.log(
            `Session ${sessionId} timed out after 5 minutes, cleaning up...`,
          );
          this.cleanupSession(sessionId);
        },
        5 * 60 * 1000,
      );

      authSessions.set(sessionId, {
        userId,
        page,
        context,
        browser,
        step: 'phone',
        createdAt: new Date(),
        timeoutId,
        userAgent: envInfo?.userAgent,
        proxy,
      });

      return {
        success: true,
        sessionId,
        message: 'Готов к вводу номера телефона',
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async verifyPhone(request: PhoneVerificationRequest): Promise<AuthResult> {
    let sessionId: string | undefined;
    try {
      const initResult = await this.initializeAuth(request.userId);
      if (!initResult.success || !initResult.sessionId) {
        return {
          success: false,
          error:
            initResult.error || new Error('Не удалось инициализировать сессию'),
        };
      }
      sessionId = initResult.sessionId;
      const session = authSessions.get(sessionId);
      if (!session || !session.page) {
        return {
          success: false,
          error: new Error('Не удалось создать сессию браузера'),
        };
      }

      const { countryCode, formattedNumber } = this.getCountryCodeFromPhone(
        request.phoneNumber,
      );

      if (countryCode !== 'ru') {
        await this.selectCountry(session.page, countryCode);
      }

      await session.page.fill(
        'input[data-testid="phone-input"]',
        formattedNumber,
      );
      await session.page.click('button[data-testid="submit-phone-button"]');

      try {
        const errorSelector = 'div[class*="FormPhoneInputBorderless__error-"]';
        const errorElement = await session.page.waitForSelector(errorSelector, {
          timeout: 2000,
        });
        if (errorElement) {
          const errorText = await errorElement.textContent();
          throw new Error(errorText || 'Неверный номер телефона');
        }
      } catch (error) {
        if ((error as Error).name !== 'TimeoutError') {
          throw error;
        }
      }

      await session.page.waitForSelector(
        'input[data-testid="sms-code-input"]',
        {
          timeout: 120000,
        },
      );

      session.step = 'sms';
      session.phoneNumber = request.phoneNumber;

      return {
        success: true,
        requiresSMSCode: true,
        sessionId,
        message: 'SMS код отправлен на ваш телефон',
      };
    } catch (error) {
      console.error('Error verifying phone:', (error as Error).message);

      const errorMsg = (error as Error).message || '';
      let userFriendlyError = '';
      let shouldCleanupSession = false;

      if (errorMsg.includes('Неверный номер телефона')) {
        userFriendlyError =
          'Неверный номер телефона. Проверьте правильность введенного номера';
      } else if (
        errorMsg.includes('code request is possible via') ||
        errorMsg.includes('запрос кода возможен через') ||
        (errorMsg.includes('hours') && errorMsg.includes('minutes'))
      ) {
        const timeMatch =
          errorMsg.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i) ||
          errorMsg.match(/(\d+)\s*час[а-я]*\s*(\d+)\s*минут[а-я]*/i);

        if (timeMatch) {
          const hours = timeMatch[1];
          const minutes = timeMatch[2];
          userFriendlyError = `Слишком много попыток. Повторный запрос кода возможен через ${hours} часов ${minutes} минут`;
        } else {
          userFriendlyError =
            'Слишком много попыток отправки SMS. Попробуйте позже';
        }
        shouldCleanupSession = true;
      } else if (
        errorMsg.includes('Время ожидания') ||
        errorMsg.includes('Timeout')
      ) {
        userFriendlyError = 'Время ожидания истекло. Попробуйте снова';
        shouldCleanupSession = true;
      } else {
        userFriendlyError = 'Ошибка при отправке SMS кода. Попробуйте снова';
        shouldCleanupSession = true;
      }

      if (shouldCleanupSession && sessionId) {
        await this.cleanupSession(sessionId);
      }

      return {
        success: false,
        error: new Error(userFriendlyError),
      };
    }
  }

  async verifySMS(request: SMSVerificationRequest): Promise<AuthResult> {
    try {
      const session = authSessions.get(request.sessionId);
      if (!session || session.step !== 'sms' || !session.page) {
        await this.cleanupSession(request.sessionId);
        return {
          success: false,
          error: new Error('Недействительная сессия или неверный этап'),
        };
      }

      await this.enterSMSCode(session.page, request.smsCode);

      const hasTwoFactor = await this.checkForTwoFactor(session.page);
      if (hasTwoFactor) {
        session.step = 'two_factor';
        return {
          success: true,
          requiresTwoFactor: true,
          sessionId: request.sessionId,
          message: 'Требуется код двухфакторной аутентификации из email',
        };
      }

      return await this.completeLogin(request.sessionId);
    } catch (error) {
      console.error('Error verifying SMS:', (error as Error).message);
      const errorMsg = (error as Error).message || '';
      let userFriendlyError = '';
      let shouldCleanupSession = false;

      if (errorMsg.includes('Неверный код подтверждения')) {
        userFriendlyError = 'Неверный код подтверждения. Попробуйте еще раз';
      } else if (
        errorMsg.includes('кода истекло') ||
        errorMsg.includes('Время ожидания')
      ) {
        userFriendlyError =
          'Время ожидания кода истекло, пожалуйста, попробуйте снова';
        shouldCleanupSession = true;
      } else {
        userFriendlyError = 'Ошибка при проверке SMS кода. Попробуйте снова';
        shouldCleanupSession = true;
      }

      if (shouldCleanupSession) {
        await this.cleanupSession(request.sessionId);
      }

      return {
        success: false,
        error: new Error(userFriendlyError),
      };
    }
  }

  async verifyTwoFactor(request: TwoFactorRequest): Promise<AuthResult> {
    try {
      const session = authSessions.get(request.sessionId);
      if (!session || session.step !== 'two_factor' || !session.page) {
        await this.cleanupSession(request.sessionId);
        return {
          success: false,
          error: new Error('Недействительная сессия или неверный этап'),
        };
      }

      await session.page.fill(
        '.Portal-modal input[class*="SimpleInput-"]',
        request.twoFactorCode,
      );

      return await this.completeLogin(request.sessionId);
    } catch (error) {
      console.error('Error verifying two-factor:', (error as Error).message);
      const errorMsg = (error as Error).message || '';
      let userFriendlyError = '';
      let shouldCleanupSession = false;

      if (errorMsg.includes('двухфакторной аутентификации')) {
        userFriendlyError =
          'Ошибка двухфакторной аутентификации. Проверьте код из email';
      } else if (errorMsg.includes('Неверный код')) {
        userFriendlyError =
          'Неверный код двухфакторной аутентификации. Попробуйте еще раз';
      } else if (
        errorMsg.includes('кода истекло') ||
        errorMsg.includes('Время ожидания')
      ) {
        userFriendlyError =
          'Время ожидания кода истекло, пожалуйста, попробуйте снова';
        shouldCleanupSession = true;
      } else {
        userFriendlyError =
          'Ошибка при проверке кода двухфакторной аутентификации. Попробуйте снова';
        shouldCleanupSession = true;
      }

      if (shouldCleanupSession) {
        await this.cleanupSession(request.sessionId);
      }

      return {
        success: false,
        error: new Error(userFriendlyError),
      };
    }
  }

  private async completeLogin(sessionId: string): Promise<AuthResult> {
    try {
      const session = authSessions.get(sessionId);
      if (!session || !session.page || !session.context) {
        return {
          success: false,
          error: new Error('Недействительная сессия'),
        };
      }

      await this.waitForLoginRedirect(session.page);

      let supplierName = '';
      try {
        const supplierNameElement = await session.page.waitForSelector(
          '[class*="desktop-profile-select_DesktopProfileSelect__"]',
          { timeout: 5000 },
        );
        if (supplierNameElement) {
          supplierName = (
            (await supplierNameElement.textContent()) || ''
          ).trim();
        }
      } catch (error) {
        console.warn('Supplier name element not found within timeout');
      }

      let cookies = await session.context.cookies();
      if (!cookies || cookies.length === 0) {
        console.error('No cookies were retrieved from the context');
        throw new Error('Не удалось получить cookies авторизации');
      }

      const cookieNames = cookies.map((c: Cookie) => c.name);
      console.log(
        '[AuthService] All cookies retrieved:',
        cookieNames.join(', '),
      );
      console.log('[AuthService] Total cookies count:', cookies.length);

      const hasWBTokenV3 = cookies.some(
        (cookie: Cookie) => cookie.name === 'WBTokenV3',
      );

      if (!hasWBTokenV3) {
        try {
          await session.page.waitForTimeout(2000);
          cookies = await session.context.cookies();

          const hasWBTokenV3AfterNav = cookies.some(
            (cookie: Cookie) => cookie.name === 'WBTokenV3',
          );
          if (!hasWBTokenV3AfterNav) {
            const accessTokens = await session.page.evaluate(() => {
              const tokens: { [key: string]: string } = {};
              interface LocalStorageMock {
                length: number;
                key(index: number): string | null;
                getItem(key: string): string | null;
              }
              const ls = localStorage as unknown as LocalStorageMock;
              for (let i = 0; i < ls.length; i++) {
                const key = ls.key(i);
                if (key && key.includes('access-token')) {
                  tokens[key] = ls.getItem(key) || '';
                }
              }
              return tokens;
            });

            for (const [, value] of Object.entries(accessTokens)) {
              if (value) {
                const accessTokenCookie: Cookie = {
                  name: 'WBTokenV3',
                  value: value,
                  domain: '.wildberries.ru',
                  path: '/',
                  expires: -1,
                  httpOnly: false,
                  secure: false,
                  sameSite: 'Lax',
                };
                cookies.push(accessTokenCookie);
              }
            }
          }
        } catch (navigationError) {
          console.error(
            'Navigation to supplies-management failed:',
            navigationError,
          );
        }
      }

      const supplierId = cookies.find(
        (cookie: Cookie) => cookie.name === 'x-supplier-id',
      );
      if (supplierId) {
        const { checkIfShouldAddBonus } = await import('../utils/userBonus');
        const shouldAddBonus = await checkIfShouldAddBonus(
          session.userId,
          supplierId.value,
        );
        if (shouldAddBonus) {
          await prisma.user.update({
            where: { id: session.userId },
            data: {
              autobookingCount: { increment: 5 },
            },
          });
        }
      }

      console.log('[AuthService] Collecting localStorage data...');
      // Collect localStorage data from browser context via Playwright
      const localStorage = await session.page.evaluate(() => {
        const storage: Record<string, string> = {};
        interface WindowWithLocalStorage {
          localStorage: {
            length: number;
            key(index: number): string | null;
            getItem(key: string): string | null;
          };
        }
        const win = window as unknown as WindowWithLocalStorage;
        const ls = win.localStorage;
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k) {
            storage[k] = ls.getItem(k) || '';
          }
        }
        return storage;
      });

      const localStorageKeys = Object.keys(localStorage);
      console.log(
        '[AuthService] All localStorage keys:',
        localStorageKeys.join(', '),
      );
      console.log(
        `[AuthService] Total localStorage items collected: ${localStorageKeys.length}`,
      );

      const cookiesString = encodeCookies(cookies);
      const localStorageString = encodeLocalStorage(localStorage);

      await accountService.saveAccount({
        userId: session.userId,
        wbCookies: cookiesString,
        wbLocalStorage: localStorageString,
        phoneWb: session.phoneNumber,
        userAgent:
          session.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        proxy: session.proxy,
      });

      await this.cleanupSession(sessionId);

      return {
        success: true,
        cookies,
        supplierName,
        message: 'Авторизация успешно завершена',
      };
    } catch (error) {
      console.error('Error during completeLogin:', (error as Error).message);
      await this.cleanupSession(sessionId);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async cancelAuth(sessionId: string): Promise<void> {
    await this.cleanupSession(sessionId);
  }
}

export const authService = new AuthService();
