/**
 * Browser Fingerprint Service
 * Phase 6: Browser Automation
 *
 * Generates realistic browser fingerprints to avoid detection.
 * Integrates with UserEnvInfo from database to avoid redundant fingerprint generation.
 */

import type { Page } from 'playwright';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import type { UserEnvInfo } from '../../types/wb';

/**
 * Fingerprint data structure containing all properties needed for browser spoofing
 */
export interface Fingerprint {
  userAgent: string;
  screenResolution: [number, number];
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64';
  language: string;
  timezone: number; // minutes offset from UTC
  deviceMemory: number;
  hardwareConcurrency: number;
  colorDepth: number;
  webGlVendor: string;
  webGlRenderer: string;
  plugins?: string[];
  canvas?: string; // MD5 hash
  webgl?: string; // MD5 hash
}

/**
 * Options for fingerprint generation
 */
export interface FingerprintOptions {
  mode?: 'random' | 'deterministic';
  proxy?: {
    ip: string;
    port: string;
    username: string;
    password: string;
    timezone?: number;
  };
  russian?: boolean;
}

/**
 * Configuration for fingerprint injection
 */
export interface FingerprintInjectionConfig {
  removeWebdriver?: boolean;
  spoofNavigator?: boolean;
  spoofScreen?: boolean;
  spoofWebGL?: boolean;
  spoofPlugins?: boolean;
  spoofCanvas?: boolean;
}

/**
 * Browser Fingerprint Service
 * Simplified instance-based service for generating and injecting realistic browser fingerprints
 * Integrates with UserEnvInfo from database to avoid redundant fingerprint generation
 */
export class BrowserFingerprintService {
  private readonly userAgents = {
    windows: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    mac: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ],
    linux: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    ],
  };

  private readonly screenResolutions: [number, number][] = [
    [1920, 1080],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [1280, 720],
    [2560, 1440],
    [2560, 1600],
    [1680, 1050],
  ];

  private readonly webGlRenderers = {
    Win32: [
      'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD Radeon RX 6700 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) HD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ],
    MacIntel: [
      'Apple GPU',
      'Intel(R) Iris(TM) Graphics 640',
      'Intel(R) Iris(TM) Pro Graphics 650',
    ],
    'Linux x86_64': [
      'Mesa Intel(R) UHD Graphics (ICL GT1)',
      'NVIDIA GeForce RTX 3060/PCIe/SSE2',
      'AMD Radeon RX 6700 XT',
      'Intel(R) Arc(TM) A380',
    ],
  };

  private readonly languages = [
    'en-US',
    'en-GB',
    'de-DE',
    'fr-FR',
    'ru-RU',
    'es-ES',
    'it-IT',
  ];

  /**
   * PRIMARY METHOD: Fetch envInfo from database by userId and generate fingerprint
   * This is the recommended way to use this service
   */
  async generateFromUserId(userId: number): Promise<Fingerprint> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { envInfo: true },
    });

    if (!user?.envInfo) {
      throw new Error(`User ${userId} not found or has no envInfo`);
    }

    const envInfo = user.envInfo as unknown as UserEnvInfo;
    return this.generateFromEnvInfo(envInfo);
  }

  /**
   * Get a simple random fingerprint object (simplified API for testing)
   * Returns an object with userAgent, screenResolution, and timezone as string
   */
  getRandomFingerprint(): {
    userAgent: string;
    screenResolution: string;
    timezone: string;
  } {
    const userAgent = this.getRandomUserAgent();
    const screenResolution = this.getRandomScreenResolutionAsString();
    const timezone = this.getRandomTimezoneAsString();

    return {
      userAgent,
      screenResolution,
      timezone,
    };
  }

  /**
   * Get a random user agent string
   */
  getRandomUserAgent(): string {
    const platform = this.getRandomPlatform();
    return this.getUserAgentForPlatform(platform);
  }

  /**
   * Get a random screen resolution as string (e.g., "1920x1080")
   */
  getRandomScreenResolution(): string {
    return this.getRandomScreenResolutionAsString();
  }

  /**
   * Get a random timezone as string
   */
  getRandomTimezone(): string {
    return this.getRandomTimezoneAsString();
  }

  /**
   * Helper: Get random screen resolution as string
   */
  private getRandomScreenResolutionAsString(): string {
    const resolution =
      this.screenResolutions[
        Math.floor(Math.random() * this.screenResolutions.length)
      ];
    return `${resolution[0]}x${resolution[1]}`;
  }

  /**
   * Helper: Get random timezone as string
   */
  private getRandomTimezoneAsString(): string {
    // Return common timezone names
    const timezones = [
      'Europe/Moscow',
      'Europe/London',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  /**
   * Convert UserEnvInfo to Fingerprint
   * Use this when envInfo is already fetched from database
   */
  generateFromEnvInfo(envInfo: UserEnvInfo): Fingerprint {
    // Ensure screenResolution has a fallback value
    const screenResolution = envInfo.screenResolution || [1920, 1080];

    return {
      userAgent: envInfo.userAgent,
      screenResolution: screenResolution as [number, number],
      platform: envInfo.platform as 'Win32' | 'MacIntel' | 'Linux x86_64',
      language: envInfo.language,
      timezone: envInfo.timezone,
      deviceMemory: envInfo.deviceMemory,
      hardwareConcurrency: envInfo.hardwareConcurrency,
      colorDepth: envInfo.colorDepth,
      webGlVendor: this.getWebGlVendor(
        envInfo.platform as 'Win32' | 'MacIntel' | 'Linux x86_64'
      ),
      webGlRenderer:
        (envInfo.platform as string) === 'MacIntel'
          ? 'Apple GPU'
          : 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      plugins: envInfo.plugins,
      canvas: envInfo.canvas,
      webgl: envInfo.webgl,
    };
  }

  /**
   * Generate a random browser fingerprint
   */
  generate(
    platform?: string,
    language?: string,
    timezone?: number
  ): Fingerprint {
    const selectedPlatform =
      (platform as 'Win32' | 'MacIntel' | 'Linux x86_64') ||
      this.getRandomPlatform();
    const userAgent = this.getUserAgentForPlatform(selectedPlatform);
    const screenResolution = this.getRandomScreenResolutionTuple();
    const selectedLanguage = language || this.getRandomLanguage();

    return {
      userAgent,
      screenResolution,
      platform: selectedPlatform,
      language: selectedLanguage,
      timezone: timezone ?? this.getRandomTimezoneOffset(),
      deviceMemory: this.getRandomDeviceMemory(),
      hardwareConcurrency: this.getRandomHardwareConcurrency(),
      colorDepth: 24,
      webGlVendor: this.getWebGlVendor(selectedPlatform),
      webGlRenderer: this.getRandomWebGlRenderer(selectedPlatform),
      plugins: this.generatePluginList(userAgent),
    };
  }

  /**
   * Generate a Russian-specific fingerprint
   */
  generateRussian(): Fingerprint {
    return this.generate(undefined, 'ru-RU', 180);
  }

  /**
   * Generate a deterministic fingerprint based on proxy IP
   * Uses seeded random algorithm for consistency
   */
  generateFromProxy(proxyIp: string, proxyTimezone?: number): Fingerprint {
    const { getIndex } = this.createDeterministicGenerator(proxyIp);

    const platforms: Array<'Win32' | 'MacIntel' | 'Linux x86_64'> = [
      'Win32',
      'MacIntel',
      'Linux x86_64',
    ];
    const platform = platforms[getIndex(platforms)];

    const userAgents = this.getUserAgentsForPlatform(platform);
    const userAgent = userAgents[getIndex(userAgents)];

    const screenResolution =
      this.screenResolutions[getIndex(this.screenResolutions)];
    const language = ['ru-RU', 'en-US', 'en-GB'][
      getIndex(['ru-RU', 'en-US', 'en-GB'])
    ];

    const deviceMemoryOptions = [4, 8, 16, 32];
    const deviceMemory = deviceMemoryOptions[getIndex(deviceMemoryOptions)];

    const hardwareConcurrencyOptions = [2, 4, 6, 8, 12, 16];
    const hardwareConcurrency =
      hardwareConcurrencyOptions[getIndex(hardwareConcurrencyOptions)];

    // Canvas and WebGL hashes based on IP
    const canvasHash = crypto
      .createHash('md5')
      .update(proxyIp + 'canvas')
      .digest('hex')
      .substring(0, 16);
    const webglHash = crypto
      .createHash('md5')
      .update(proxyIp + 'webgl')
      .digest('hex')
      .substring(0, 16);

    // Deterministically select WebGL renderer based on platform
    const webGlRenderers =
      this.webGlRenderers[platform] || this.webGlRenderers['Win32'];
    const webGlRenderer = webGlRenderers[getIndex(webGlRenderers)];

    return {
      userAgent,
      screenResolution,
      platform,
      language,
      timezone: proxyTimezone ?? 180, // Default to Moscow (UTC+3)
      deviceMemory,
      hardwareConcurrency,
      colorDepth: [24, 32][getIndex([0, 1])],
      webGlVendor: this.getWebGlVendor(platform),
      webGlRenderer,
      plugins: this.generatePluginList(userAgent),
      canvas: canvasHash,
      webgl: webglHash,
    };
  }

  /**
   * Inject fingerprint into page - simple and direct like JavaScript version
   * Spoofs: navigator properties, screen properties, webdriver, and WebGL
   */
  async inject(page: Page, fingerprint: Fingerprint): Promise<void> {
    try {
      await page.addInitScript(
        (fp) => {
          // Spoof navigator properties
          Object.defineProperty(navigator, 'userAgent', {
            get: () => fp.userAgent,
          });

          Object.defineProperty(navigator, 'platform', {
            get: () => fp.platform,
          });

          Object.defineProperty(navigator, 'language', {
            get: () => fp.language,
          });

          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => fp.hardwareConcurrency,
          });

          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => fp.deviceMemory,
          });

          // Spoof screen properties
          Object.defineProperty(screen, 'width', {
            get: () => fp.screenResolution[0],
          });

          Object.defineProperty(screen, 'height', {
            get: () => fp.screenResolution[1],
          });

          Object.defineProperty(screen, 'colorDepth', {
            get: () => fp.colorDepth,
          });

          // Remove webdriver property
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });

          // Spoof WebGL
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) {
              return fp.webGlVendor;
            }
            if (parameter === 37446) {
              return fp.webGlRenderer;
            }
            return getParameter.call(this, parameter);
          };
        },
        fingerprint
      );
    } catch (error) {
      console.warn(
        '⚠️ Could not inject fingerprint:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Create a deterministic random generator seeded by IP
   */
  private createDeterministicGenerator(ip: string) {
    let seed = parseInt(
      ip
        .split('.')
        .map((part) => part.padStart(3, '0'))
        .join(''),
      10
    );

    const getSeededRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const getIndex = <T>(arr: T[]): number =>
      Math.floor(getSeededRandom() * arr.length);

    return { getSeededRandom, getIndex };
  }

  /**
   * Helper: Get random platform
   */
  private getRandomPlatform(): 'Win32' | 'MacIntel' | 'Linux x86_64' {
    const platforms: Array<'Win32' | 'MacIntel' | 'Linux x86_64'> = [
      'Win32',
      'MacIntel',
      'Linux x86_64',
    ];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }

  /**
   * Helper: Get user agent for platform
   */
  private getUserAgentForPlatform(
    platform: 'Win32' | 'MacIntel' | 'Linux x86_64'
  ): string {
    const agents = this.getUserAgentsForPlatform(platform);
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Helper: Get user agent array for platform
   */
  private getUserAgentsForPlatform(
    platform: 'Win32' | 'MacIntel' | 'Linux x86_64'
  ): string[] {
    if (platform === 'MacIntel') return this.userAgents.mac;
    if (platform === 'Linux x86_64') return this.userAgents.linux;
    return this.userAgents.windows;
  }

  /**
   * Helper: Get random screen resolution as tuple
   */
  private getRandomScreenResolutionTuple(): [number, number] {
    return this.screenResolutions[
      Math.floor(Math.random() * this.screenResolutions.length)
    ];
  }

  /**
   * Helper: Get random language
   */
  private getRandomLanguage(): string {
    return this.languages[Math.floor(Math.random() * this.languages.length)];
  }

  /**
   * Helper: Get random device memory
   */
  private getRandomDeviceMemory(): number {
    const options = [4, 8, 16, 32];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Helper: Get random hardware concurrency
   */
  private getRandomHardwareConcurrency(): number {
    const options = [2, 4, 6, 8, 12, 16];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Helper: Get random timezone offset in minutes
   */
  private getRandomTimezoneOffset(): number {
    // Random timezone offset in minutes (-12 to +14 hours)
    return (Math.floor(Math.random() * 27) - 12) * 60;
  }

  /**
   * Helper: Get WebGL vendor for platform
   */
  private getWebGlVendor(
    platform: 'Win32' | 'MacIntel' | 'Linux x86_64'
  ): string {
    if (platform === 'MacIntel') return 'Apple Inc.';
    if (platform === 'Linux x86_64') return 'Mozilla';
    return 'Google Inc.';
  }

  /**
   * Helper: Get random WebGL renderer for platform
   */
  private getRandomWebGlRenderer(
    platform: 'Win32' | 'MacIntel' | 'Linux x86_64'
  ): string {
    const renderers =
      this.webGlRenderers[platform] || this.webGlRenderers['Win32'];
    return renderers[Math.floor(Math.random() * renderers.length)];
  }

  /**
   * Helper: Generate plugin list based on browser type
   */
  private generatePluginList(userAgent: string): string[] {
    let plugin = 'PDF Viewer';
    if (userAgent.includes('Firefox')) {
      plugin = 'Firefox PDF Viewer';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      plugin = 'Safari PDF Viewer';
    } else if (userAgent.includes('Edg/')) {
      plugin = 'Microsoft Edge PDF Viewer';
    } else if (userAgent.includes('OPR/')) {
      plugin = 'Opera PDF Viewer';
    } else if (userAgent.includes('Chrome')) {
      plugin = 'Chrome PDF Viewer';
    }
    return [plugin];
  }

  // ============= BACKWARD COMPATIBILITY: Static methods =============

  private static instance = new BrowserFingerprintService();

  /**
   * Static wrapper for generateFromUserId - fetches envInfo from database by userId
   */
  static async generateFromUserId(userId: number): Promise<Fingerprint> {
    return this.instance.generateFromUserId(userId);
  }

  /**
   * Static wrapper for random fingerprint generation
   */
  static generateFingerprint(options: FingerprintOptions = {}): Fingerprint {
    return this.instance.generate(
      undefined,
      options.russian ? 'ru-RU' : undefined,
      options.russian ? 180 : undefined
    );
  }

  /**
   * Static wrapper for Russian fingerprint
   */
  static generateRussianFingerprint(): Fingerprint {
    return this.instance.generateRussian();
  }

  /**
   * Static wrapper for deterministic fingerprint generation
   */
  static generateDeterministicFingerprint(
    proxyIp: string,
    proxyTimezone?: number
  ): Fingerprint {
    return this.instance.generateFromProxy(proxyIp, proxyTimezone);
  }

  /**
   * Static wrapper for page injection
   * Note: config parameter is ignored - always uses simple injection like JS version
   */
  static async injectFingerprint(
    page: Page,
    fingerprint: Fingerprint,
    _config?: FingerprintInjectionConfig
  ): Promise<void> {
    await this.instance.inject(page, fingerprint);
  }
}

// Export singleton instance (like JavaScript version)
export const browserFingerprintService = new BrowserFingerprintService();
export default browserFingerprintService;
