import crypto from 'crypto';
import { prisma } from '@/config/database';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { identityService } from '@/services/auth/identity.service';
import { linkCodeService } from '@/services/auth/link-code.service';
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
    telegramCode?: string;
  }): Promise<{ userId: number; identityId: number }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    logger.info(`[register] START — email=${normalizedEmail}, name=${data.name}, hasTelegramCode=${!!data.telegramCode}`);

    // Check if email identity already exists
    const existing = await identityService.findByEmail(normalizedEmail);
    if (existing) {
      logger.warn(`[register] FAILED — email already exists: ${normalizedEmail}`);
      throw ApiError.badRequest('Пользователь с таким email уже существует');
    }

    if (data.password.length < 8) {
      logger.warn(`[register] FAILED — password too short for ${normalizedEmail}`);
      throw ApiError.validation('Пароль должен быть не менее 8 символов');
    }

    const passwordHash = jwtAuthService.hashPassword(data.password);
    logger.info(`[register] Password hashed for ${normalizedEmail}`);

    // If telegram code provided, link to existing user
    if (data.telegramCode) {
      logger.info(`[register] Telegram code provided, linking email to existing user`);
      const userId = await linkCodeService.validate(data.telegramCode);

      // Check user doesn't already have an EMAIL identity
      const existingEmail = await prisma.userIdentity.findFirst({
        where: { userId, provider: AuthProvider.EMAIL },
      });
      if (existingEmail) {
        logger.warn(`[register] FAILED — Telegram user ${userId} already has EMAIL identity`);
        throw ApiError.badRequest('Этот Telegram-аккаунт уже привязан к email');
      }

      // Create Profile if not exists
      const existingProfile = await prisma.profile.findUnique({ where: { userId } });
      if (!existingProfile) {
        await prisma.profile.create({
          data: { userId, name: data.name.trim() },
        });
        logger.info(`[register] Profile created for user ${userId}`);
      }

      // Create EMAIL identity for existing user
      const identity = await identityService.createIdentity(userId, AuthProvider.EMAIL, {
        email: normalizedEmail,
        passwordHash,
      });

      // Send verification email even for Telegram-linked accounts
      logger.info(`[register] Triggering verification email for linked identityId=${identity.id}, email=${normalizedEmail}`);
      await this.sendVerificationEmail(identity.id, normalizedEmail);
      logger.info(`[register] Verification email triggered for linked account ${normalizedEmail}`);

      logger.info(`[register] SUCCESS — Linked email ${normalizedEmail} to existing Telegram user ${userId}, identityId=${identity.id}`);
      return { userId, identityId: identity.id };
    }

    // Normal registration: create new user
    logger.info(`[register] Creating new user with email identity for ${normalizedEmail}`);
    const result = await identityService.createUserWithIdentity(
      { name: data.name.trim() },
      {
        provider: AuthProvider.EMAIL,
        email: normalizedEmail,
        passwordHash,
      },
    );
    logger.info(`[register] User created — userId=${result.userId}, identityId=${result.identityId}`);

    // Send verification email
    logger.info(`[register] Triggering verification email for identityId=${result.identityId}, email=${normalizedEmail}`);
    await this.sendVerificationEmail(result.identityId, normalizedEmail);
    logger.info(`[register] Verification email flow completed for ${normalizedEmail}`);

    logger.info(`[register] END — New user registered via email: ${normalizedEmail}, userId=${result.userId}`);
    return result;
  }

  /**
   * Send or resend verification email
   */
  async sendVerificationEmail(identityId: number, email: string): Promise<void> {
    logger.info(`[sendVerificationEmail] START — identityId=${identityId}, email=${email}`);

    const plainToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    logger.info(`[sendVerificationEmail] Token generated — tokenHash prefix=${tokenHash.substring(0, 16)}...`);

    const identity = await prisma.userIdentity.findUnique({ where: { id: identityId }, select: { userId: true } });
    if (!identity) {
      logger.error(`[sendVerificationEmail] FAILED — identity ${identityId} not found`);
      throw ApiError.badRequest('Identity не найден');
    }

    await prisma.authToken.create({
      data: {
        userId: identity.userId,
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS.EMAIL_VERIFICATION),
      },
    });
    logger.info(`[sendVerificationEmail] AuthToken created in DB — userId=${identity.userId}, type=EMAIL_VERIFICATION, expiresIn=1h`);

    logger.info(`[sendVerificationEmail] Calling emailService.sendVerificationEmail(${email})...`);
    await emailService.sendVerificationEmail(email, plainToken);
    logger.info(`[sendVerificationEmail] END — email sent (or mocked) for ${email}`);
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
    logger.info(`[requestPasswordReset] START — email=${normalizedEmail}`);

    const found = await identityService.findByEmail(normalizedEmail);

    if (!found || !found.identity.passwordHash) {
      logger.info(`[requestPasswordReset] No action — email not found or no password: ${normalizedEmail}`);
      return;
    }

    logger.info(`[requestPasswordReset] Found identity ${found.identity.id} for user ${found.user.id}`);

    // Invalidate any existing password reset tokens for this user
    const invalidated = await prisma.authToken.updateMany({
      where: {
        userId: found.user.id,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    logger.info(`[requestPasswordReset] Invalidated ${invalidated.count} old password reset tokens`);

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
    logger.info(`[requestPasswordReset] New password reset token created`);

    logger.info(`[requestPasswordReset] Calling emailService.sendPasswordResetEmail(${normalizedEmail})...`);
    await emailService.sendPasswordResetEmail(normalizedEmail, plainToken);
    logger.info(`[requestPasswordReset] END — Password reset email sent (or mocked) for identity ${found.identity.id}`);
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

    // Find the EMAIL identity for this user
    const identity = await prisma.userIdentity.findFirst({
      where: {
        userId: tokenRecord.userId,
        provider: AuthProvider.EMAIL,
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
