import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WBContentOfficial');

const BASE_URL = 'https://content-api.wildberries.ru';
const CATEGORY = 'CONTENT';

export interface OfficialContentCardMediaFile {
  url: string;
  miniUrl: string;
}

export interface OfficialContentCardSize {
  chrtID: number;
  techSize: string;
  skus: string[];
  wbSize: string;
}

export interface OfficialContentCard {
  nmID: number;
  imtID: number;
  vendorCode: string;
  updatedAt: string;
  brand: string;
  title: string;
  mediaFiles: OfficialContentCardMediaFile[];
  subjectName: string;
  subjectID: number;
  colors: string[];
  sizes: OfficialContentCardSize[];
  tags: unknown[];
  stocks: number;
  feedbackRating: number;
  feedbacksCount: number;
  dimensions?: {
    width: number;
    height: number;
    length: number;
    weightBrutto: number;
  };
}

export interface OfficialContentCardsCursor {
  total: number;
  updatedAt: string;
  nmID: number;
}

export interface OfficialContentCardsResponse {
  cards: OfficialContentCard[];
  cursor: OfficialContentCardsCursor;
}

export interface GetContentCardsParams {
  supplierId: string;
  cursor?: { updatedAt?: string; nmID?: number };
  limit?: number;
}

export class WBContentOfficialService {
  /**
   * Get content cards from the official WB Content API.
   * Calls POST /content/v2/get/cards/list and returns native official types.
   */
  async getContentCardsTableList({
    supplierId,
    cursor,
    limit = 20,
  }: GetContentCardsParams): Promise<OfficialContentCardsResponse> {
    if (!supplierId || supplierId.trim().length === 0) {
      throw new Error('supplierId is required');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }

    const response = await wbOfficialRequest<{
      cards: OfficialContentCard[];
      cursor: OfficialContentCardsCursor;
    }>({
      baseUrl: BASE_URL,
      path: '/content/v2/get/cards/list',
      supplierId,
      category: CATEGORY,
      method: 'POST',
      body: {
        settings: {
          cursor,
          limit,
          filter: { withPhoto: -1 },
        },
      },
    });

    const cards = response.cards || [];

    if (cards.length === 0) {
      logger.debug('No content cards returned from official API', { supplierId });
    }

    return {
      cards,
      cursor: response.cursor,
    };
  }

  /**
   * Find a single content card by nmID.
   * The official Content API returns full card data (imtID, sizes, mediaFiles, etc.)
   * in the list endpoint — no separate IMT endpoint exists.
   */
  async getContentCardByNmID({
    supplierId,
    nmID,
  }: {
    supplierId: string;
    nmID: number;
  }): Promise<OfficialContentCard | null> {
    const response = await this.getContentCardsTableList({
      supplierId,
      limit: 100,
    });
    return response.cards.find((card) => card.nmID === nmID) ?? null;
  }
}

export const wbContentOfficialService = new WBContentOfficialService();
