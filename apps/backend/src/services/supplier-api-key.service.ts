import { prisma } from '../config/database';
import { encrypt, safeDecrypt } from '../utils/encryption';

export interface SupplierApiKeyInput {
  userId: number;
  apiKey: string;
}

export interface SupplierApiKeyUpdateInput {
  apiKey?: string;
  isActive?: boolean;
}

export class SupplierApiKeyService {
  /**
   * Find API key by user ID
   */
  async findByUserId(userId: number) {
    const result = await prisma.supplierApiKey.findUnique({
      where: { userId },
    });

    if (!result) return null;

    // Return the result without decrypting the API key for security
    // The actual API key should only be decrypted when needed for external API calls
    return result;
  }

  /**
   * Create a new API key for a user
   */
  async create(data: SupplierApiKeyInput) {
    const encryptedApiKey = encrypt(data.apiKey);

    return prisma.supplierApiKey.create({
      data: {
        userId: data.userId,
        apiKey: encryptedApiKey,
      },
    });
  }

  /**
   * Update an existing API key
   */
  async update(userId: number, data: SupplierApiKeyUpdateInput) {
    const updateData: {
      updatedAt: Date;
      apiKey?: string;
      isActive?: boolean;
    } = {
      updatedAt: new Date(),
    };

    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey);
    }

    if (typeof data.isActive === 'boolean') {
      updateData.isActive = data.isActive;
    }

    return prisma.supplierApiKey.update({
      where: { userId },
      data: updateData,
    });
  }

  /**
   * Delete an API key
   */
  async delete(userId: number) {
    return prisma.supplierApiKey.delete({
      where: { userId },
    });
  }

  /**
   * Get the decrypted API key for external API calls
   * This should only be used when making actual API requests
   */
  async getDecryptedApiKey(userId: number): Promise<string | null> {
    const result = await this.findByUserId(userId);
    if (!result) return null;

    const decryptedKey = safeDecrypt(result.apiKey);
    return decryptedKey;
  }

  /**
   * Upsert an API key (create or update)
   */
  async upsert(userId: number, data: { apiKey: string; isActive?: boolean }) {
    const encryptedApiKey = encrypt(data.apiKey);

    return prisma.supplierApiKey.upsert({
      where: { userId },
      update: {
        apiKey: encryptedApiKey,
        ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      create: {
        userId,
        apiKey: encryptedApiKey,
        ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Check if user has an active API key
   */
  async hasActiveApiKey(userId: number): Promise<boolean> {
    const apiKey = await this.findByUserId(userId);
    return apiKey?.isActive === true;
  }
}

export const supplierApiKeyService = new SupplierApiKeyService();
