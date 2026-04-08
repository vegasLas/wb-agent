/**
 * WB API Content Service
 * Handles WB Content API calls using API key authentication
 * Domain: suppliers-api.wildberries.ru
 */

import { supplierApiKeyService } from '@/services/internal/supplier-api-key.service';
import { safeDecrypt } from '@/utils/encryption';
import { createLogger } from '@/utils/logger';
import type {
  ProductCardsListParams,
  ProductCardsListResponse,
} from '@/types/wb';

const logger = createLogger('WBApiContent');

export class WBApiContentService {
  /**
   * Get product cards list from WB API
   * Endpoint: POST https://suppliers-api.wildberries.ru/content/v2/get/cards/list
   */
  async getProductCardsList({
    userId,
    params,
  }: {
    userId: number;
    params: ProductCardsListParams;
  }): Promise<ProductCardsListResponse> {
    const apiKeyRecord = await supplierApiKeyService.findByUserId(userId);

    if (!apiKeyRecord?.apiKey) {
      throw new Error('Supplier API key not found for user');
    }

    const apiKey = safeDecrypt(apiKeyRecord.apiKey);

    const url =
      'https://suppliers-api.wildberries.ru/content/v2/get/cards/list';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    };

    logger.debug(`Fetching product cards list for user ${userId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        const responseClone = response.clone();
        errorBody = await responseClone.json();
      } catch {
        try {
          const responseClone = response.clone();
          errorBody = await responseClone.text();
        } catch {
          errorBody = 'Could not read error response body';
        }
      }

      logger.error(`Product cards list request failed:`, {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorBody,
      });

      throw new Error(
        `Product cards list request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
      );
    }

    return (await response.json()) as ProductCardsListResponse;
  }
}

export const wbApiContentService = new WBApiContentService();
