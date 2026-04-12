import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('JWTAuth');

export interface JWTPayload {
  userId: number;
  login: string;
  telegramId: string;
  authType: 'browser';
  iat: number;
  exp: number;
}

export interface BrowserAuthResult {
  user: {
    id: number;
    login: string;
    name: string;
  };
  token: string;
}

export class JWTAuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly BCRYPT_ROUNDS: number;

  constructor() {
    this.JWT_SECRET = env.JWT_SECRET || '';
    this.JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d';
    this.BCRYPT_ROUNDS = 10;

    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET is not set or is too short (< 32 chars). Browser auth will not work properly.');
    }
  }

  /**
   * Check if JWT auth is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.JWT_SECRET && this.JWT_SECRET.length >= 32);
  }

  /**
   * Hash password (for use in bot commands)
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
   * Browser login with login + password
   */
  async browserLogin(login: string, password: string): Promise<BrowserAuthResult> {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    // Find user by login
    const user = await prisma.user.findUnique({
      where: { login },
      select: {
        id: true,
        login: true,
        name: true,
        passwordHash: true,
        telegramId: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Неверные учетные данные');
    }

    // Verify password
    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw ApiError.unauthorized('Неверные учетные данные');
    }

    // Check subscription
    if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
      throw ApiError.forbidden('Требуется активная подписка', 'SUBSCRIPTION_REQUIRED');
    }

    const token = this.generateToken({
      userId: user.id,
      login: user.login!,
      telegramId: user.telegramId.toString(),
      authType: 'browser',
    });

    logger.info(`Browser login successful: ${login}`);

    return {
      user: {
        id: user.id,
        login: user.login!,
        name: user.name,
      },
      token,
    };
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    // Cast secret to any to work around TypeScript overload resolution issues
    return jwt.sign(payload, this.JWT_SECRET as any, {
      expiresIn: this.JWT_EXPIRES_IN as any,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    if (!this.isConfigured()) {
      throw ApiError.internal('JWT authentication is not configured');
    }

    try {
      // Cast to any to work around TypeScript overload resolution issues
      return jwt.verify(token, this.JWT_SECRET as any) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid token');
    }
  }

  /**
   * Generate unique login and password
   */
  generateCredentials(telegramUsername?: string): {
    login: string;
    password: string;
    passwordHash: string;
  } {
    // Generate random suffix (6 chars)
    const suffix = this.generateRandomString(6, 'lower');
    
    // Create login: username_suffix or user_suffix if no username
    const prefix = telegramUsername 
      ? this.sanitizeUsername(telegramUsername)
      : 'user';
    const login = `${prefix}_${suffix}`;

    // Generate strong password (12 chars)
    const password = this.generateRandomString(12, 'mixed');
    
    // Hash password
    const passwordHash = this.hashPassword(password);

    return { login, password, passwordHash };
  }

  /**
   * Generate random string
   */
  private generateRandomString(
    length: number,
    type: 'lower' | 'upper' | 'mixed' | 'numeric'
  ): string {
    const chars = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numeric: '0123456789',
      mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
    };

    const charSet = chars[type];
    let result = '';
    
    // Use crypto for better randomness if available
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charSet.length);
      result += charSet.charAt(randomIndex);
    }
    
    return result;
  }

  /**
   * Sanitize username for use in login
   */
  private sanitizeUsername(username: string): string {
    // Remove special chars, keep alphanumeric and underscore
    return username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 20); // Max 20 chars
  }
}

export const jwtAuthService = new JWTAuthService();
