import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { identityService } from '@/services/auth/identity.service';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('JWTAuth');

/**
 * Compute a stable fingerprint of a secret for logging purposes.
 * This allows operators to verify that the secret hasn't changed across redeploys.
 */
function computeSecretFingerprint(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 16);
}

export interface JWTPayload {
  userId: number;
  identityId: number;
  authType: 'browser';
  iat: number;
  exp: number;
}

export interface BrowserAuthResult {
  user: {
    id: number;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expiry
}

export class JWTAuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_ACCESS_EXPIRES_IN: string;
  private readonly JWT_REFRESH_EXPIRES_IN: string;
  private readonly BCRYPT_ROUNDS: number;

  constructor() {
    this.JWT_SECRET = env.JWT_SECRET || '';
    this.JWT_ACCESS_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.JWT_REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.BCRYPT_ROUNDS = 10;

    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      logger.warn(
        'JWT_SECRET is not set or is too short (< 32 chars). Browser auth will not work properly.',
      );
    } else {
      logger.info(
        `JWTAuth initialized. Secret fingerprint: ${computeSecretFingerprint(this.JWT_SECRET)}`,
      );
    }
  }

  /**
   * Check if JWT auth is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.JWT_SECRET && this.JWT_SECRET.length >= 32);
  }

  /**
   * Hash password (for use in identity creation)
   */
  hashPassword(password: string): string {
    return bcrypt.hashSync(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Email login with email + password
   */
  async emailLogin(
    email: string,
    password: string,
  ): Promise<BrowserAuthResult> {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    const found = await identityService.findByEmail(email);

    if (!found || !found.identity.passwordHash) {
      throw ApiError.unauthorized('Неверные учетные данные');
    }

    // Strict verification: must verify email before login
    if (!found.identity.emailVerifiedAt) {
      throw ApiError.forbidden(
        'Email не подтвержден. Пожалуйста, проверьте почту и перейдите по ссылке.',
        'EMAIL_NOT_VERIFIED',
      );
    }

    const isValid = await this.comparePassword(
      password,
      found.identity.passwordHash,
    );
    if (!isValid) {
      throw ApiError.unauthorized('Неверные учетные данные');
    }

    const accessToken = this.generateAccessToken({
      userId: found.user.id,
      identityId: found.identity.id,
      authType: 'browser',
    });

    const refreshToken = await this.generateRefreshToken(found.user.id);
    const expiresIn = this.parseExpiresIn(this.JWT_ACCESS_EXPIRES_IN);

    logger.info(`Email login successful: ${email}`);

    return {
      user: {
        id: found.user.id,
        name: found.user.profile?.name || '',
      },
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate short-lived access token (JWT)
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    return jwt.sign(payload, this.JWT_SECRET as any, {
      expiresIn: this.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): JWTPayload {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    try {
      return jwt.verify(token, this.JWT_SECRET as any) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid token');
    }
  }

  /**
   * Generate a cryptographically secure refresh token, store its hash in DB
   */
  async generateRefreshToken(userId: number): Promise<string> {
    const plainToken = crypto.randomBytes(64).toString('base64url');
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    const expiresInMs = this.parseExpiresInMs(this.JWT_REFRESH_EXPIRES_IN);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return plainToken;
  }

  /**
   * Verify a refresh token by checking its hash in the database
   */
  async verifyRefreshToken(
    plainToken: string,
  ): Promise<{ userId: number; tokenId: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (tokenRecord.revokedAt) {
      throw ApiError.unauthorized(
        'Refresh token has been revoked',
        'TOKEN_REVOKED',
      );
    }

    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      throw ApiError.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
    }

    return { userId: tokenRecord.userId, tokenId: tokenRecord.id };
  }

  /**
   * Rotate refresh token: revoke old one and generate a new one
   */
  async rotateRefreshToken(
    oldPlainToken: string,
    userId: number,
  ): Promise<string> {
    const { tokenId } = await this.verifyRefreshToken(oldPlainToken);

    const newPlainToken = crypto.randomBytes(64).toString('base64url');
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newPlainToken)
      .digest('hex');

    const expiresInMs = this.parseExpiresInMs(this.JWT_REFRESH_EXPIRES_IN);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId,
          expiresAt: new Date(Date.now() + expiresInMs),
          replacedBy: tokenId,
        },
      }),
    ]);

    return newPlainToken;
  }

  /**
   * Revoke a single refresh token
   */
  async revokeRefreshToken(plainToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get access token expiry in seconds
   */
  getAccessTokenExpirySeconds(): number {
    return this.parseExpiresIn(this.JWT_ACCESS_EXPIRES_IN);
  }

  /**
   * Parse JWT expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }

  /**
   * Parse JWT expiresIn string to milliseconds
   */
  private parseExpiresInMs(expiresIn: string): number {
    return this.parseExpiresIn(expiresIn) * 1000;
  }
}

export const jwtAuthService = new JWTAuthService();
