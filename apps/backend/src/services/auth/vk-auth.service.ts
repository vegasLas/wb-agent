import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { identityService } from '@/services/auth/identity.service';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';
import { AuthProvider } from '@prisma/client';

const logger = createLogger('VKAuth');

interface VKAccessTokenResponse {
  access_token: string;
  expires_in: number;
  user_id: number;
  email?: string;
  error?: string;
  error_description?: string;
}

interface VKUserInfo {
  id: number;
  first_name: string;
  last_name: string;
}

export class VKAuthService {
  private readonly appId: string | undefined;
  private readonly secretKey: string | undefined;
  private readonly redirectUri: string;

  constructor() {
    this.appId = env.VK_APP_ID;
    this.secretKey = env.VK_SECRET_KEY;
    this.redirectUri = env.VK_REDIRECT_URI;
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.secretKey);
  }

  /**
   * Build VK OAuth authorization URL
   */
  getAuthorizeUrl(state: string): string {
    if (!this.isConfigured()) {
      throw ApiError.internal('VK OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri,
      display: 'page',
      scope: 'email',
      response_type: 'code',
      state,
    });

    return `https://oauth.vk.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for access token and user info
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    vkUserId: string;
    email?: string;
    name: string;
  }> {
    if (!this.isConfigured()) {
      throw ApiError.internal('VK OAuth is not configured');
    }

    const tokenUrl = new URL('https://oauth.vk.com/access_token');
    tokenUrl.searchParams.set('client_id', this.appId!);
    tokenUrl.searchParams.set('client_secret', this.secretKey!);
    tokenUrl.searchParams.set('redirect_uri', this.redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData: VKAccessTokenResponse = await tokenRes.json();

    if (tokenData.error) {
      logger.error('VK token exchange error:', tokenData);
      throw ApiError.badRequest(`VK OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const userInfoUrl = new URL('https://api.vk.com/method/users.get');
    userInfoUrl.searchParams.set('access_token', tokenData.access_token);
    userInfoUrl.searchParams.set('v', '5.199');

    const userRes = await fetch(userInfoUrl.toString());
    const userData = await userRes.json();

    if (userData.error) {
      logger.error('VK users.get error:', userData.error);
      throw ApiError.badRequest('Не удалось получить данные пользователя VK');
    }

    const vkUser: VKUserInfo = userData.response?.[0];
    if (!vkUser) {
      throw ApiError.badRequest('Не удалось получить данные пользователя VK');
    }

    return {
      accessToken: tokenData.access_token,
      vkUserId: String(tokenData.user_id),
      email: tokenData.email,
      name: `${vkUser.first_name} ${vkUser.last_name}`.trim(),
    };
  }

  /**
   * Find or create user from VK data and return JWT tokens
   */
  async handleVKCallback(vkData: {
    vkUserId: string;
    email?: string;
    name: string;
  }): Promise<{
    user: { id: number; name: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const result = await identityService.findOrCreateUser(
      AuthProvider.VK,
      vkData.vkUserId,
      {
        name: vkData.name,
        email: vkData.email?.toLowerCase().trim(),
      },
    );

    const user = await identityService.getUserIdentities(result.userId).then(() =>
      // Need user profile for token generation
      Promise.resolve({ id: result.userId, name: vkData.name })
    );

    // Fetch actual user name from DB
    const userRecord = await identityService.findByProvider(AuthProvider.VK, vkData.vkUserId);
    const userName = userRecord?.user.profile?.name || vkData.name;

    const accessToken = jwtAuthService.generateAccessToken({
      userId: result.userId,
      identityId: result.identityId,
      authType: 'browser',
    });

    const refreshToken = await jwtAuthService.generateRefreshToken(result.userId);
    const expiresIn = jwtAuthService.getAccessTokenExpirySeconds();

    return {
      user: { id: result.userId, name: userName },
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate a signed JWT state token for CSRF protection
   */
  generateState(): string {
    const payload = {
      nonce: crypto.randomBytes(16).toString('hex'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };
    return jwt.sign(payload, this.secretKey!);
  }

  /**
   * Verify a state token returned by VK
   */
  verifyState(state: string): boolean {
    if (!this.secretKey) return false;
    try {
      jwt.verify(state, this.secretKey);
      return true;
    } catch {
      return false;
    }
  }
}

export const vkAuthService = new VKAuthService();
