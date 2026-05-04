/**
 * Promotions Service
 * Orchestrates WB promotions calendar API operations via the official API.
 * Uses cookie-based fallback for exclusion (remove) since official API
 * does not support removing products from promotions.
 */

import { resolveOfficialSupplierId } from '@/services/external/wb/official';
import { wbPromotionOfficialService } from '@/services/external/wb/official';
import { wbContentOfficialService } from '@/services/external/wb/official';
import {
  mapOfficialPromotionsToTimelineDTO,
  mapOfficialPromotionDetailsToDTO,
  mapOfficialNomenclaturesToGoodsItems,
  type PromotionGoodsItem,
} from '@/services/external/wb/official';
import { applyPromotionRecovery as excelApplyPromotionRecovery } from './promotions.excel.service';
import { resolveAccountContext } from '@/services/account-context.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PromotionGoodsResult {
  items: PromotionGoodsItem[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number;
}

export interface GetPromotionGoodsParams {
  userId: number;
  promoID: number;
  periodID: number;
  mode: 'participating' | 'excluded';
}

// ─── Content Cards Fetch Helper ───────────────────────────────────────────────

async function fetchAllContentCards(
  supplierId: string,
): Promise<import('@/services/external/wb/official/wb-content-official.service').OfficialContentCard[]> {
  const allCards: OfficialContentCard[] = [];
  let cursor: { updatedAt?: string; nmID?: number } | undefined;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const response = await wbContentOfficialService.getContentCardsTableList({
      supplierId,
      cursor,
      limit: 100,
    });

    const cards = response.cards || [];
    if (cards.length === 0) break;

    allCards.push(...cards);

    if (!response.cursor || cards.length < 100) break;
    cursor = {
      updatedAt: response.cursor.updatedAt,
      nmID: response.cursor.nmID,
    };
  }

  return allCards;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export const getPromotionsTimeline = async ({
  userId,
  startDate,
  endDate,
  filter,
}: {
  userId: number;
  startDate?: string;
  endDate?: string;
  filter?: string;
}) => {
  const supplierId = await resolveOfficialSupplierId(
    userId,
    'PRICES_AND_DISCOUNTS',
  );
  if (!supplierId) {
    throw new Error(
      'No official API supplier found for Prices and Discounts category',
    );
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const defaultEnd = new Date(
    now.getFullYear() + 1,
    11,
    31,
    23,
    59,
    59,
  ).toISOString();

  const response = await wbPromotionOfficialService.getPromotionsTimeline({
    supplierId,
    startDateTime: startDate || defaultStart,
    endDateTime: endDate || defaultEnd,
    allPromo: filter === 'SKIPPING' ? true : false,
  });

  return mapOfficialPromotionsToTimelineDTO(response);
};

// ─── Detail ─────────────────────────────────────────────────────────────────

export const getPromotionDetail = async ({
  userId,
  promoID,
}: {
  userId: number;
  promoID: number;
}) => {
  const supplierId = await resolveOfficialSupplierId(
    userId,
    'PRICES_AND_DISCOUNTS',
  );
  if (!supplierId) {
    throw new Error(
      'No official API supplier found for Prices and Discounts category',
    );
  }

  const response = await wbPromotionOfficialService.getPromotionDetails({
    supplierId,
    promotionIDs: [promoID],
  });

  return mapOfficialPromotionDetailsToDTO(response, promoID);
};

// ─── Goods (official nomenclatures + Content API enrichment) ──────────────────

export const getPromotionGoods = async (
  params: GetPromotionGoodsParams,
): Promise<PromotionGoodsResult> => {
  const { userId, promoID, mode } = params;

  const supplierId = await resolveOfficialSupplierId(
    userId,
    'PRICES_AND_DISCOUNTS',
  );
  if (!supplierId) {
    return {
      items: null,
      error: 'No official API supplier found for Prices and Discounts category',
    };
  }

  try {
    const [nomenclaturesResponse, contentCards] = await Promise.all([
      wbPromotionOfficialService.getPromotionNomenclatures({
        supplierId,
        promotionID: promoID,
        inAction: mode === 'participating',
      }),
      fetchAllContentCards(supplierId),
    ]);

    const items = mapOfficialNomenclaturesToGoodsItems(
      nomenclaturesResponse.data?.nomenclatures || [],
      contentCards,
    );

    return {
      items,
      error: null,
      reportPending: false,
      estimatedWaitTime: null,
    };
  } catch (error) {
    return {
      items: null,
      error: (error as Error).message || 'Failed to fetch promotion goods',
    };
  }
};

// ─── Recovery (include via official upload, exclude via cookie fallback) ──────

export const managePromotionGoods = async (params: {
  userId: number;
  promoID: number;
  periodID: number;
  selectedItems: string[];
  isRecovery: boolean;
}): Promise<{ success: boolean; error: string | null }> => {
  const { userId, promoID, selectedItems, isRecovery } = params;

  const supplierId = await resolveOfficialSupplierId(
    userId,
    'PRICES_AND_DISCOUNTS',
  );
  if (!supplierId) {
    return {
      success: false,
      error: 'No official API supplier found for Prices and Discounts category',
    };
  }

  try {
    if (isRecovery) {
      // ─── INCLUDE (add goods to promotion) via official API ────────────────
      // selectedItems are vendorCodes → need to map to nmIds via Content API
      const contentCards = await fetchAllContentCards(supplierId);
      const vendorCodeToNmId = new Map<string, number>();
      for (const card of contentCards) {
        if (card.vendorCode) {
          vendorCodeToNmId.set(card.vendorCode, card.nmID);
        }
      }

      const nmIds: number[] = [];
      const missingCodes: string[] = [];
      for (const code of selectedItems) {
        const nmId = vendorCodeToNmId.get(code);
        if (nmId) {
          nmIds.push(nmId);
        } else {
          missingCodes.push(code);
        }
      }

      if (nmIds.length === 0) {
        return {
          success: false,
          error:
            missingCodes.length > 0
              ? `Selected items not found: ${missingCodes.join(', ')}`
              : 'No valid items selected',
        };
      }

      const result =
        await wbPromotionOfficialService.uploadPromotionNomenclatures({
          supplierId,
          promotionID: promoID,
          uploadNow: true,
          nomenclatures: nmIds,
        });

      if (result.data?.alreadyExists) {
        return {
          success: false,
          error: 'Upload with these parameters already exists',
        };
      }

      return {
        success: true,
        error: null,
      };
    } else {
      // ─── EXCLUDE (remove goods from promotion) via cookie fallback ────────
      const ctx = await resolveAccountContext(userId, { strict: true });
      return excelApplyPromotionRecovery(
        {
          userId,
          periodID: params.periodID,
          selectedItems,
          isRecovery,
        },
        {
          accountId: ctx.accountId,
          supplierId: ctx.supplierId,
          userAgent: ctx.userAgent,
          proxy: ctx.proxy,
        },
      );
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Failed to apply promotion changes',
    };
  }
};
