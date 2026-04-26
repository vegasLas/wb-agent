import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/config/database';
import { accountRepository, userRepository } from '@/repositories';
import { identityService } from '@/services/auth/identity.service';
import { AuthProvider } from '@prisma/client';

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
    afterEach(async () => {
      // Cleanup test data
      const users = await prisma.user.findMany({
        where: {
          telegram: { username: { startsWith: 'testuser_' } },
        },
        select: { id: true },
      });
      for (const u of users) {
        await prisma.user.delete({ where: { id: u.id } });
      }
    });

    it('should create a user', async () => {
      const user = await userRepository.create({
        name: 'Test User',
        username: 'testuser_1',
      });

      expect(user).toBeDefined();
      expect(user.profile?.name).toBe('Test User');
      expect(user.telegram?.username).toBe('testuser_1');
    });

    it('should find user by id', async () => {
      const created = await userRepository.create({
        name: 'Test User',
        username: 'testuser_2',
      });

      const found = await userRepository.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.profile?.name).toBe('Test User');
    });
  });

  conditionalDescribe('Identity Service', () => {
    let testUserId: number;

    afterEach(async () => {
      if (testUserId) {
        await prisma.userIdentity.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
    });

    it('should create a user with TELEGRAM identity', async () => {
      const result = await identityService.createUserWithIdentity(
        { name: 'Test User', username: 'testuser_tg' },
        { provider: AuthProvider.TELEGRAM, providerId: '123456789' },
      );

      testUserId = result.userId;

      expect(result.userId).toBeDefined();
      expect(result.identityId).toBeDefined();

      const identity = await prisma.userIdentity.findUnique({
        where: { id: result.identityId },
      });

      expect(identity).toBeDefined();
      expect(identity?.provider).toBe(AuthProvider.TELEGRAM);
      expect(identity?.providerId).toBe('123456789');
    });
  });

  conditionalDescribe('Account Repository', () => {
    let testUserId: number;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          profile: { create: { name: 'Test User' } },
          telegram: { create: { username: 'testuser_account' } },
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      await prisma.account.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
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
