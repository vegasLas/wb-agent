import { prisma } from '@/config/database';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { AuthProvider, Prisma } from '@prisma/client';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('IdentityService');

export interface IdentityWithUser {
  identity: {
    id: number;
    userId: number;
    provider: AuthProvider;
    providerId: string | null;
    email: string | null;
    passwordHash: string | null;
    emailVerifiedAt: Date | null;
    metadata: Prisma.JsonValue | null;
  };
  user: {
    id: number;
    subscriptionExpiresAt: Date | null;
    selectedAccountId: string | null;
    profile: { name: string } | null;
    telegram: { chatId: string | null } | null;
  };
}

export class IdentityService {
  /**
   * Find an identity by provider + providerId (external ID)
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<IdentityWithUser | null> {
    const identity = await prisma.userIdentity.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: {
        user: {
          select: {
            id: true,
            subscriptionExpiresAt: true,
            selectedAccountId: true,
            profile: { select: { name: true } },
            telegram: { select: { chatId: true } },
          },
        },
      },
    });

    if (!identity) return null;
    return { identity, user: identity.user };
  }

  /**
   * Find an EMAIL identity by email address
   */
  async findByEmail(email: string): Promise<IdentityWithUser | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const identity = await prisma.userIdentity.findUnique({
      where: { provider_email: { provider: AuthProvider.EMAIL, email: normalizedEmail } },
      include: {
        user: {
          select: {
            id: true,
            subscriptionExpiresAt: true,
            selectedAccountId: true,
            profile: { select: { name: true } },
            telegram: { select: { chatId: true } },
          },
        },
      },
    });

    if (!identity) return null;
    return { identity, user: identity.user };
  }

  /**
   * Find a LEGACY identity by login (stored in email column)
   */
  async findByLegacyLogin(login: string): Promise<IdentityWithUser | null> {
    const identity = await prisma.userIdentity.findUnique({
      where: { provider_email: { provider: AuthProvider.LEGACY, email: login } },
      include: {
        user: {
          select: {
            id: true,
            subscriptionExpiresAt: true,
            selectedAccountId: true,
            profile: { select: { name: true } },
            telegram: { select: { chatId: true } },
          },
        },
      },
    });

    if (!identity) return null;
    return { identity, user: identity.user };
  }

  /**
   * Get all identities for a user
   */
  async getUserIdentities(userId: number) {
    return prisma.userIdentity.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerId: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create a new identity for an existing user
   */
  async createIdentity(
    userId: number,
    provider: AuthProvider,
    data: {
      providerId?: string;
      email?: string;
      passwordHash?: string;
      emailVerifiedAt?: Date;
      metadata?: Prisma.JsonValue;
    },
  ) {
    return prisma.userIdentity.create({
      data: {
        userId,
        provider,
        providerId: data.providerId,
        email: data.email?.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        emailVerifiedAt: data.emailVerifiedAt,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Create a User + Profile + optional Telegram + Identity in a single transaction
   */
  async createUserWithIdentity(
    profile: {
      name: string;
      email?: string;
      phone?: string;
      chatId?: string;
      username?: string;
      languageCode?: string;
      envInfo?: any;
    },
    identity: {
      provider: AuthProvider;
      providerId?: string;
      email?: string;
      passwordHash?: string;
      emailVerifiedAt?: Date;
      metadata?: Prisma.JsonValue;
    },
  ): Promise<{ userId: number; identityId: number }> {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          envInfo: profile.envInfo as any,
          envInfoUpdatedAt: profile.envInfo ? new Date() : undefined,
          profile: {
            create: {
              name: profile.name,
              email: profile.email?.toLowerCase().trim(),
              phone: profile.phone,
            },
          },
          telegram: profile.chatId
            ? {
                create: {
                  chatId: profile.chatId,
                  username: profile.username,
                  languageCode: profile.languageCode,
                },
              }
            : undefined,
        },
      });

      const userIdentity = await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: identity.provider,
          providerId: identity.providerId,
          email: identity.email?.toLowerCase().trim(),
          passwordHash: identity.passwordHash,
          emailVerifiedAt: identity.emailVerifiedAt,
          metadata: identity.metadata,
        },
      });

      return { userId: user.id, identityId: userIdentity.id };
    });

    logger.info(`Created user ${result.userId} with ${identity.provider} identity`);
    return result;
  }

  /**
   * Verify email for an identity
   */
  async verifyEmail(identityId: number): Promise<void> {
    await prisma.userIdentity.update({
      where: { id: identityId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /**
   * Set password for an identity
   */
  async setPassword(identityId: number, password: string): Promise<void> {
    const passwordHash = jwtAuthService.hashPassword(password);
    await prisma.userIdentity.update({
      where: { id: identityId },
      data: { passwordHash },
    });
  }

  /**
   * Find or create a user by provider + providerId.
   * If the provider identity doesn't exist, creates a new user + identity.
   * If email is provided and an EMAIL identity exists with that email, links the new provider to that user.
   */
  async findOrCreateUser(
    provider: AuthProvider,
    providerId: string,
    profile: {
      name: string;
      email?: string;
      phone?: string;
      chatId?: string;
      username?: string;
      languageCode?: string;
      envInfo?: any;
    },
  ): Promise<{ userId: number; identityId: number; isNew: boolean }> {
    // 1. Try to find by provider + providerId
    const existing = await this.findByProvider(provider, providerId);
    if (existing) {
      return { userId: existing.user.id, identityId: existing.identity.id, isNew: false };
    }

    // 2. If email provided, try to link to existing user
    if (profile.email) {
      const emailIdentity = await this.findByEmail(profile.email);
      if (emailIdentity) {
        const newIdentity = await this.createIdentity(emailIdentity.user.id, provider, {
          providerId,
          email: profile.email,
        });
        logger.info(`Linked ${provider} identity to existing user ${emailIdentity.user.id}`);
        return { userId: emailIdentity.user.id, identityId: newIdentity.id, isNew: false };
      }
    }

    // 3. Create new user + identity
    const result = await this.createUserWithIdentity(
      {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        chatId: profile.chatId,
        username: profile.username,
        languageCode: profile.languageCode,
        envInfo: profile.envInfo as any,
      },
      {
        provider,
        providerId,
        email: profile.email,
      },
    );

    return { userId: result.userId, identityId: result.identityId, isNew: true };
  }
}

export const identityService = new IdentityService();
