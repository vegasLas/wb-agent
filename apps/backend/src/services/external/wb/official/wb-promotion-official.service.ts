import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';
import {
  validateSupplierId,
  validateRequiredString,
  validateOptionalPagination,
  validatePositiveInteger,
  validateNonEmptyArray,
  validateAllPositiveIntegers,
} from './wb-official-validation';

const logger = createLogger('WBPromotionOfficial');
const BASE_URL = 'https://dp-calendar-api.wildberries.ru';
const CATEGORY = 'PRICES_AND_DISCOUNTS';

// ─── Upstream Types ─────────────────────────────────────────────────────────

export interface OfficialPromotionItem {
  id: number;
  name: string;
  startDateTime: string;
  endDateTime: string;
  type: 'regular' | 'auto';
}

export interface OfficialRangingItem {
  condition: string;
  participationRate: number;
  boost: number;
}

export interface OfficialPromotionDetailItem {
  id: number;
  name: string;
  description: string;
  advantages: string[];
  startDateTime: string;
  endDateTime: string;
  inPromoActionLeftovers: number;
  inPromoActionTotal: number;
  notInPromoActionLeftovers: number;
  notInPromoActionTotal: number;
  participationPercentage: number;
  type: 'regular' | 'auto';
  exceptionProductsCount: number;
  ranging: OfficialRangingItem[];
}

export interface OfficialNomenclatureItem {
  id: number;
  inAction: boolean;
  price: number;
  currencyCode: string;
  planPrice: number;
  discount: number;
  planDiscount: number;
}

export interface OfficialUploadResponse {
  data: {
    alreadyExists: boolean;
    uploadID: number;
  };
}

// ─── Service Params ─────────────────────────────────────────────────────────

export interface GetPromotionsParams {
  supplierId: string;
  startDateTime: string; // YYYY-MM-DDTHH:MM:SSZ
  endDateTime: string;   // YYYY-MM-DDTHH:MM:SSZ
  allPromo?: boolean;
  limitPromotion?: number;
  offset?: number;
}

export interface GetPromotionDetailsParams {
  supplierId: string;
  promotionIDs: number[];
}

export interface GetPromotionNomenclaturesParams {
  supplierId: string;
  promotionID: number;
  inAction: boolean;
  limit?: number;
  offset?: number;
}

export interface UploadPromotionNomenclaturesParams {
  supplierId: string;
  promotionID: number;
  uploadNow: boolean;
  nomenclatures: number[];
}

// ─── Service ────────────────────────────────────────────────────────────────

export class WBPromotionOfficialService {
  async getPromotionsTimeline({
    supplierId,
    startDateTime,
    endDateTime,
    allPromo = false,
    limitPromotion,
    offset,
  }: GetPromotionsParams): Promise<{
    data: { promotions: OfficialPromotionItem[] };
  }> {
    validateSupplierId(supplierId);
    validateRequiredString(startDateTime, 'startDateTime');
    validateRequiredString(endDateTime, 'endDateTime');
    validateOptionalPagination(limitPromotion, offset);

    const query = new URLSearchParams();
    query.set('startDateTime', startDateTime);
    query.set('endDateTime', endDateTime);
    query.set('allPromo', String(allPromo));
    if (limitPromotion !== undefined) query.set('limitPromotion', String(limitPromotion));
    if (offset !== undefined) query.set('offset', String(offset));

    logger.debug('Fetching promotions timeline', {
      supplierId,
      startDateTime,
      endDateTime,
      allPromo,
    });

    return wbOfficialRequest<{ data: { promotions: OfficialPromotionItem[] } }>({
      baseUrl: BASE_URL,
      path: `/api/v1/calendar/promotions?${query.toString()}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  async getPromotionDetails({
    supplierId,
    promotionIDs,
  }: GetPromotionDetailsParams): Promise<{
    data: { promotions: OfficialPromotionDetailItem[] };
  }> {
    validateSupplierId(supplierId);
    validateNonEmptyArray(promotionIDs, 'promotionIDs', 100);
    validateAllPositiveIntegers(promotionIDs, 'promotionIDs');

    const query = new URLSearchParams();
    for (const id of promotionIDs) {
      query.append('promotionIDs', String(id));
    }

    logger.debug('Fetching promotion details', { supplierId, promotionIDs });

    return wbOfficialRequest<{
      data: { promotions: OfficialPromotionDetailItem[] };
    }>({
      baseUrl: BASE_URL,
      path: `/api/v1/calendar/promotions/details?${query.toString()}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  /**
   * Get products (nomenclatures) for a promotion.
   * inAction=true → participating goods
   * inAction=false → non-participating goods
   */
  async getPromotionNomenclatures({
    supplierId,
    promotionID,
    inAction,
    limit,
    offset,
  }: GetPromotionNomenclaturesParams): Promise<{
    data: { nomenclatures: OfficialNomenclatureItem[] };
  }> {
    validateSupplierId(supplierId);
    validatePositiveInteger(promotionID, 'promotionID');
    validateOptionalPagination(limit, offset);

    const query = new URLSearchParams();
    query.set('promotionID', String(promotionID));
    query.set('inAction', String(inAction));
    if (limit !== undefined) query.set('limit', String(limit));
    if (offset !== undefined) query.set('offset', String(offset));

    logger.debug('Fetching promotion nomenclatures', {
      supplierId,
      promotionID,
      inAction,
    });

    return wbOfficialRequest<{
      data: { nomenclatures: OfficialNomenclatureItem[] };
    }>({
      baseUrl: BASE_URL,
      path: `/api/v1/calendar/promotions/nomenclatures?${query.toString()}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });
  }

  /**
   * Upload (add) products to a promotion.
   * Creates an async upload task. Returns uploadID to track status.
   */
  async uploadPromotionNomenclatures({
    supplierId,
    promotionID,
    uploadNow,
    nomenclatures,
  }: UploadPromotionNomenclaturesParams): Promise<OfficialUploadResponse> {
    validateSupplierId(supplierId);
    validatePositiveInteger(promotionID, 'promotionID');
    validateNonEmptyArray(nomenclatures, 'nomenclatures');
    validateAllPositiveIntegers(nomenclatures, 'nmIds');

    logger.debug('Uploading promotion nomenclatures', {
      supplierId,
      promotionID,
      uploadNow,
      count: nomenclatures.length,
    });

    return wbOfficialRequest<OfficialUploadResponse>({
      baseUrl: BASE_URL,
      path: '/api/v1/calendar/promotions/upload',
      supplierId,
      category: CATEGORY,
      method: 'POST',
      body: {
        data: {
          promotionID,
          uploadNow,
          nomenclatures,
        },
      },
    });
  }
}

export const wbPromotionOfficialService = new WBPromotionOfficialService();
