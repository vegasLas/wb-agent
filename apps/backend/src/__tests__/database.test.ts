import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/config/database';
import { accountRepository, userRepository } from '@/repositories';

// Check if database is available
let isDatabaseAvailable = false;

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    return true;
  } catch {
    return false;
  }
}

describe('Database', () => {
  beforeAll(async () => {
    isDatabaseAvailable = await checkDatabaseConnection();
    if (!isDatabaseAvailable) {
      console.warn('⚠️ Database not available - skipping database tests');
    }
  });

  afterAll(async () => {
    if (isDatabaseAvailable) {
      await prisma.$disconnect();
    }
  });

  // Only run tests if database is available
  const conditionalTest = isDatabaseAvailable ? it : it.skip;
  const conditionalDescribe = isDatabaseAvailable ? describe : describe.skip;

  conditionalDescribe('Prisma Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });
  });

  conditionalDescribe('User Repository', () => {
    const testTelegramId = BigInt(123456789);

    afterEach(async () => {
      // Cleanup test data
      await prisma.user.deleteMany({
        where: { telegramId: testTelegramId },
      });
    });

    it('should create a user', async () => {
      const user = await userRepository.create({
        telegramId: testTelegramId,
        name: 'Test User',
        username: 'testuser',
      });

      expect(user).toBeDefined();
      expect(user.telegramId).toBe(testTelegramId);
      expect(user.name).toBe('Test User');
    });

    it('should find user by telegramId', async () => {
      await userRepository.create({
        telegramId: testTelegramId,
        name: 'Test User',
      });

      const found = await userRepository.findByTelegramId(testTelegramId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test User');
    });
  });

  conditionalDescribe('Account Repository', () => {
    const testTelegramId = BigInt(987654321);
    let testUserId: number;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          telegramId: testTelegramId,
          name: 'Test User',
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      await prisma.account.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { telegramId: testTelegramId },
      });
    });

    it('should create an account', async () => {
      const account = await accountRepository.create({
        userId: testUserId,
        wbCookies: 'test-cookies',
        phoneWb: '+79999999999',
      });

      expect(account).toBeDefined();
      expect(account.userId).toBe(testUserId);
      expect(account.wbCookies).toBe('test-cookies');
    });

    it('should find accounts by userId', async () => {
      await accountRepository.create({
        userId: testUserId,
        wbCookies: 'test-cookies',
      });

      const accounts = await accountRepository.findByUserId(testUserId);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].userId).toBe(testUserId);
    });
  });
});
