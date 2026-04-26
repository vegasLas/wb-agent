import crypto from 'crypto';
import { prisma } from '@/config/database';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { identityService } from '@/services/auth/identity.service';
import { emailService } from '@/services/email/email.service';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';
import { AuthProvider } from '@prisma/client';

const logger = createLogger('EmailAuth');

const TOKEN_EXPIRY_MS = {
  EMAIL_VERIFICATION: 60 * 60 * 1000, // 1 hour
  PASSWORD_RESET: 60 * 60 * 1000,     // 1 hour
};

export class EmailAuthService {
  /**
   * Register a new user with email and password
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ userId: number; identityId: number }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if email identity already exists
    const existing = await identityService.findByEmail(normalizedEmail);
    if (existing) {
      throw ApiError.badRequest('Пользователь с таким email уже существует');
    }

    if (data.password.length < 8) {
      throw ApiError.validation('Пароль должен быть не менее 8 символов');
    }

    const passwordHash = jwtAuthService.hashPassword(data.password);

    const result = await identityService.createUserWithIdentity(
      { name: data.name.trim() },
      {
        provider: AuthProvider.EMAIL,
        email: normalizedEmail,
        passwordHash,
      },
    );

    // Send verification email
    await this.sendVerificationEmail(result.identityId, normalizedEmail);

    logger.info(`New user registered via email: ${normalizedEmail}`);
    return result;
  }

  /**
   * Send or resend verification email
   */
  async sendVerificationEmail(identityId: number, email: string): Promise<void> {
    const plainToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.authToken.create({
      data: {
        userId: (await prisma.userIdentity.findUnique({ where: { id: identityId }, select: { userId: true } }))!.userId,
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS.EMAIL_VERIFICATION),
      },
    });

    await emailService.sendVerificationEmail(email, plainToken);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(plainToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const tokenRecord = await prisma.authToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw ApiError.badRequest('Недействительный или истекший токен');
    }

    if (tokenRecord.type !== 'EMAIL_VERIFICATION') {
      throw ApiError.badRequest('Неверный тип токена');
    }

    if (tokenRecord.usedAt) {
      throw ApiError.badRequest('Токен уже использован');
    }

    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      throw ApiError.badRequest('Срок действия токена истек');
    }

    // Find the EMAIL identity for this user and verify it
    const identity = await prisma.userIdentity.findFirst({
      where: { userId: tokenRecord.userId, provider: AuthProvider.EMAIL },
    });

    if (!identity) {
      throw ApiError.badRequest('Email identity не найден');
    }

    await prisma.$transaction([
      prisma.userIdentity.update({
        where: { id: identity.id },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.authToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info(`Email verified for identity ${identity.id}`);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const found = await identityService.findByEmail(normalizedEmail);

    if (!found || !found.identity.passwordHash) {
      logger.info(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return;
    }

    // Invalidate any existing password reset tokens for this user
    await prisma.authToken.updateMany({
      where: {
        userId: found.user.id,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const plainToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.authToken.create({
      data: {
        userId: found.user.id,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS.PASSWORD_RESET),
      },
    });

    await emailService.sendPasswordResetEmail(normalizedEmail, plainToken);
    logger.info(`Password reset email sent for identity ${found.identity.id}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw ApiError.validation('Пароль должен быть не менее 8 символов');
    }

    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const tokenRecord = await prisma.authToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw ApiError.badRequest('Недействительный или истекший токен');
    }

    if (tokenRecord.type !== 'PASSWORD_RESET') {
      throw ApiError.badRequest('Неверный тип токена');
    }

    if (tokenRecord.usedAt) {
      throw ApiError.badRequest('Токен уже использован');
    }

    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      throw ApiError.badRequest('Срок действия токена истек');
    }

    // Find the EMAIL or LEGACY identity for this user
    const identity = await prisma.userIdentity.findFirst({
      where: {
        userId: tokenRecord.userId,
        provider: { in: [AuthProvider.EMAIL, AuthProvider.LEGACY] },
      },
    });

    if (!identity) {
      throw ApiError.badRequest('Identity не найден');
    }

    const passwordHash = jwtAuthService.hashPassword(newPassword);

    await prisma.$transaction([
      prisma.userIdentity.update({
        where: { id: identity.id },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info(`Password reset successful for identity ${identity.id}`);
  }
}

export const emailAuthService = new EmailAuthService();
