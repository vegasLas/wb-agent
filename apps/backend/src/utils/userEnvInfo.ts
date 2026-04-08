import crypto from 'crypto';
import { UserEnvInfo } from '@/types/wb';
import { prisma } from '@/config/database';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

export interface Proxy {
  ip: string;
  port: string;
  username: string;
  password: string;
  timezone: number;
  usageCount: number;
}

// Parse proxy strings from environment variable
const parseProxyList = (): Proxy[] => {
  const proxyListEnv = process.env.PROXY_LIST || '';

  if (!proxyListEnv) {
    logger.warn('PROXY_LIST environment variable is not set');
    return [];
  }

  return proxyListEnv
    .split(',')
    .filter((p) => p.trim())
    .map((proxyString) => {
      const [ip, port, username, password, timezone] = proxyString
        .trim()
        .split(':');
      return {
        ip,
        port,
        username,
        password,
        timezone: parseInt(timezone || '180', 10),
        usageCount: 0,
      };
    });
};

const proxyList = parseProxyList();

// Get least used proxy by checking the database
const getLeastUsedProxy = async (): Promise<Proxy> => {
  // Update usage counts from database
  for (const proxy of proxyList) {
    const count = await prisma.user.count({
      where: {
        envInfo: {
          path: ['proxy', 'ip'],
          equals: proxy.ip,
        },
      },
    });
    proxy.usageCount = count;
  }

  // Sort by usage and return least used
  const sortedProxies = [...proxyList].sort(
    (a, b) => a.usageCount - b.usageCount,
  );
  return sortedProxies[0];
};

// Generate deterministic values based on IP
const getConsistentValues = (ip: string) => {
  let seed = parseInt(
    ip
      .split('.')
      .map((part) => part.padStart(3, '0'))
      .join(''),
    10,
  );

  const seededRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const getIndex = <T>(arr: T[]): number =>
    Math.floor(seededRandom() * arr.length);

  return { seededRandom, getIndex };
};

export const regenerateAllUserEnvInfo = async (): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: 4, // Exclude user ID 4
        },
      },
    });

    logger.info(`Found ${users.length} users to regenerate env info for`);

    for (const user of users) {
      const newEnvInfo = await generateUserEnvInfo();
      await prisma.user.update({
        where: { id: user.id },
        data: { envInfo: newEnvInfo as unknown as Prisma.JsonObject },
      });
    }

    logger.info(
      'Successfully regenerated env info for all users (except user ID 4)',
    );
  } catch (error) {
    logger.error('Error regenerating user env info:', error);
    throw error;
  }
};

export const generateUserEnvInfo = async (): Promise<UserEnvInfo> => {
  const resolutions: [number, number][] = [
    [1920, 1080],
    [1366, 768],
    [1536, 864],
    [1440, 900],
    [1280, 720],
    [2560, 1440],
    [1680, 1050],
  ];

  const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
  const languages = ['ru-RU', 'ru'];

  const userAgents = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Chrome on Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  ];

  const proxy = await getLeastUsedProxy();
  const { getIndex } = getConsistentValues(proxy.ip);

  const userAgent = userAgents[getIndex(userAgents)];
  const platform = platforms[getIndex(platforms)];

  const generatePluginList = (): string[] => {
    let plugin = 'PDF Viewer';
    if (userAgent.includes('Firefox')) {
      plugin = 'Firefox PDF Viewer';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      plugin = 'Safari PDF Viewer';
    } else if (userAgent.includes('Edg/')) {
      plugin = 'Microsoft Edge PDF Viewer';
    } else if (userAgent.includes('Chrome')) {
      plugin = 'Chrome PDF Viewer';
    }
    return [plugin];
  };

  const getHashForIP = (ipSeed: string): string => {
    return crypto
      .createHash('md5')
      .update(ipSeed)
      .digest('hex')
      .substring(0, 16);
  };

  const plugins = generatePluginList();
  const canvasHash = getHashForIP(proxy.ip + 'canvas');
  const webglHash = getHashForIP(proxy.ip + 'webgl');

  return {
    screenResolution: resolutions[getIndex(resolutions)],
    colorDepth: [24, 32][getIndex([0, 1])],
    platform,
    language: languages[getIndex(languages)],
    userAgent,
    deviceMemory: Math.pow(2, getIndex([2, 3, 4]) + 2),
    hardwareConcurrency: getIndex([2, 3, 4, 5, 6, 7, 8]) + 2,
    timezone: proxy.timezone,
    plugins,
    canvas: canvasHash,
    webgl: webglHash,
    proxy: {
      ip: proxy.ip,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    },
  };
};
