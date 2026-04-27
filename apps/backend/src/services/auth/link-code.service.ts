import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import { ApiError } from '@/utils/errors';

const logger = createLogger('LinkCodeService');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, L, O, 0, 1
const CODE_LENGTH = 6;
const CODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export class LinkCodeService {
  /**
   * Generate a new link code for a user
   * Replaces any existing code for this user
   */
  async generate(userId: number): Promise<string> {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

    await prisma.linkCode.upsert({
      where: { userId },
      create: { userId, code, expiresAt },
      update: { code, expiresAt, usedAt: null },
    });

    logger.info(`Generated link code for user ${userId}`);
    return code;
  }

  /**
   * Validate a link code and return the associated userId
   * Marks the code as used if valid
   */
  async validate(code: string): Promise<number> {
    const linkCode = await prisma.linkCode.findUnique({
      where: { code },
    });

    if (!linkCode) {
      throw ApiError.badRequest('Неверный код привязки');
    }

    if (linkCode.usedAt) {
      throw ApiError.badRequest('Код уже использован');
    }

    if (new Date(linkCode.expiresAt) <= new Date()) {
      throw ApiError.badRequest('Срок действия кода истек');
    }

    // Mark as used
    await prisma.linkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: new Date() },
    });

    logger.info(`Link code validated for user ${linkCode.userId}`);
    return linkCode.userId;
  }

  /**
   * Delete expired unused codes
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.linkCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired link codes`);
    }
    return result.count;
  }
}

export const linkCodeService = new LinkCodeService();
