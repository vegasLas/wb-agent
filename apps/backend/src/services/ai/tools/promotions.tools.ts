import { tool, Tool } from 'ai';
import { z } from 'zod';
import {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionGoods,
  managePromotionGoods,
} from '@/services/domain/promotion/promotions.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

export function promotionsTools(userId: number): Record<string, Tool> {
  return {
    listPromotions: tool({
      description: `List the user's Wildberries promotions (акции / промо) timeline.
Call this when the user asks about their promotions, акции, promo calendar, or "какие у меня акции".
Required: none.
Optional: startDate (ISO string, defaults to start of current year), endDate (ISO string, defaults to end of next year), filter (PARTICIPATING | SKIPPING | AVAILABLE, default PARTICIPATING).

Response structure:
- promotions: array of promotion objects.
  - promoID: promotion ID (needed for detail/goods).
  - name: promotion name.
  - type: promotion type ('regular' or 'auto').
  - startDate / endDate: ISO date strings.`,
      inputSchema: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        filter: z.enum(['PARTICIPATING', 'SKIPPING', 'AVAILABLE']).optional(),
      }),
      execute: safeTool('listPromotions', async (data) => {
        return loggedTool('listPromotions', userId, async () => {
          return cachedExecute(
            `promotions-timeline-${data.startDate}-${data.endDate}-${data.filter}`,
            30000,
            async () => {
              return getPromotionsTimeline({
                userId,
                startDate: data.startDate,
                endDate: data.endDate,
                filter: data.filter,
              });
            },
          );
        });
      }),
    }),

    getPromotionDetail: tool({
      description: `Get detailed information about a specific Wildberries promotion.
Call this when the user asks "tell me about promotion X", "details of promo 123", "что за акция", or wants to manage a specific promotion.
Required: promoID (number) — the promotion ID from listPromotions.

Key response fields:
- promoID: promotion ID.
- periodID: same as promoID, used for goods/management operations.
- name, description, advantages: promotion info.
- startDt / endDt: promotion dates.
- type: 'regular' or 'auto'.
- inPromoActionTotal / notInPromoActionTotal: counts of goods in/out of promo.
- participationPercentage: percentage of goods already participating.
- ranging: object with levels, boost, currentCoefficient, isMaxLevel, nmToNextLevel, nmToMaxLevel.
- isParticipateInAutoPromo: whether auto-promo is enabled.`,
      inputSchema: z.object({
        promoID: z.number().int().min(1),
      }),
      execute: safeTool('getPromotionDetail', async (data) => {
        return loggedTool('getPromotionDetail', userId, async () => {
          return cachedExecute(
            `promotion-detail-${data.promoID}`,
            30000,
            async () => {
              return getPromotionDetail({
                userId,
                promoID: data.promoID,
              });
            },
          );
        });
      }),
    }),

    getPromotionGoods: tool({
      description: `Get the list of goods (products) for a specific promotion.
Call this when the user asks "what goods are in promotion X", "show excluded items", "which products participate", "товары в акции", or wants to see what can be included/excluded.
Required: promoID (number) — the promotion ID from listPromotions.
Required: periodID (number) — from getPromotionDetail.
Required: mode (enum) — 'participating' or 'excluded'.
  - participating = goods currently IN the promotion (can be excluded).
  - excluded = goods currently OUT of the promotion (can be included back).
Optional: hasStarted (boolean) — kept for backward compatibility, ignored by the new API.
Optional: startDate (ISO string) — kept for backward compatibility, ignored by the new API.

Each item in the response contains:
- nmId: Wildberries article ID (nmID).
- vendorCode: supplier article code (required for include/exclude operations).
- name: product name.
- brand: brand name.
- subject: product category/subject.
- inPromo: "Да" or "Нет" — whether the item is currently in the promotion.
- promoPrice: planned promotional price.
- currentPrice: current retail price.
- currentDiscount: current discount percentage on the site.
- uploadedDiscount: discount that will be applied for the promo.
- wbStock: stock at Wildberries warehouses.`,
      inputSchema: z.object({
        promoID: z.number().int().min(1),
        periodID: z.number().int().min(1),
        mode: z.enum(['participating', 'excluded']),
        hasStarted: z.boolean().optional(),
        startDate: z.string().optional(),
      }),
      execute: safeTool('getPromotionGoods', async (data) => {
        return loggedTool('getPromotionGoods', userId, async () => {
          return getPromotionGoods({
            userId,
            promoID: data.promoID,
            periodID: data.periodID,
            mode: data.mode,
          });
        });
      }),
    }),

    managePromotionGoods: tool({
      description: `Include or exclude goods from a Wildberries promotion.
Call this when the user asks to "exclude goods from promotion", "add products back to promo", "remove ART-123 from promo", "включи товары в акцию", or "исключи товары из акции".
Required: promoID (number) — the promotion ID from listPromotions.
Required: periodID (number) — from getPromotionDetail.
Required: action (enum) — 'include' or 'exclude'.
  - include = ADD goods BACK into the promotion (recover them).
  - exclude = REMOVE goods FROM the promotion.
Required: vendorCodes (string[]) — array of exact supplier article codes to act on. These must come from a previous getPromotionGoods call.

Critical rules:
1. This ONLY works for promotions that have NOT started yet. If the promotion has already started, refuse and explain that editing is locked.
2. The user must have already seen the goods list via getPromotionGoods to know the exact vendorCodes.
3. Always confirm the exact vendorCodes and the action with the user before calling this tool.
4. Rate limit: max 10 calls per minute.

Response: { success: true } on success, or { success: false, error: "..." } on failure.`,
      inputSchema: z.object({
        promoID: z.number().int().min(1),
        periodID: z.number().int().min(1),
        action: z.enum(['include', 'exclude']),
        vendorCodes: z.array(z.string().min(1)).min(1),
      }),
      execute: safeTool('managePromotionGoods', async (data) => {
        return loggedTool('managePromotionGoods', userId, async () => {
          const isRecovery = data.action === 'include';

          const result = await managePromotionGoods({
            userId,
            promoID: data.promoID,
            periodID: data.periodID,
            selectedItems: data.vendorCodes,
            isRecovery,
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error || 'Failed to apply promotion changes',
            };
          }

          return {
            success: true,
            action: data.action,
            affectedCount: data.vendorCodes.length,
          };
        });
      }),
    }),
  };
}
