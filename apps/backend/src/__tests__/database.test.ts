import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../config/database';
import { accountRepository, userRepository } from '../repositories';

describe('Database', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Prisma Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });
  });

  describe('User Repository', () => {
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

  describe('Account Repository', () => {
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
