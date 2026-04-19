import { tool, Tool } from 'ai';
import { z } from 'zod';
import {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionExcel,
  applyPromotionRecovery,
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
  - type: promotion type.
  - startDate / endDate: ISO date strings.
  - advantages: array of benefit descriptions.
  - participation.status: participation status text.
  - participation.counts:
    - eligible: total eligible goods.
    - participating: goods currently in the promotion.
    - available: goods available to join.
    - participatingOutOfStock: participating but out of stock.
    - availableOutOfStock: available but out of stock.
- participationCounts: overall counts (available, participating, skipped, all).`,
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
- periodID: the period ID required for getting goods or managing inclusion/exclusion.
- name, description, formattedDescription: promotion info.
- startDt / endDt: promotion dates.
- status / participationStatus: status codes.
- isHasRecovery: true if recovery (include/exclude goods) is possible.
- inPromoActionTotal / notInPromoActionTotal: counts of goods in/out of promo.
- ranging: object with levels, boost, currentCoefficient, isMaxLevel, nmToNextLevel, nmToMaxLevel.
- isParticipateInAutoPromo: whether auto-promo is enabled.
- isMultiLevels: whether multi-level discount is enabled.
- calculateProductsCount: number of products with calculations.
- actionInStock: stock count.`,
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
Required: periodID (number) — from getPromotionDetail.
Required: mode (enum) — 'participating' or 'excluded'.
  - participating = goods currently IN the promotion (can be excluded).
  - excluded = goods currently OUT of the promotion (can be included back).
Optional: hasStarted (boolean) — true if promotion already started, false if not.
Optional: startDate (ISO string) — the promotion start date from getPromotionDetail. If provided and hasStarted is omitted, hasStarted is automatically computed: if startDate <= today (same day counts as started), then hasStarted = true.

Important: This fetches an Excel report from Wildberries and parses it. It may return reportPending: true if the report is still generating. In that case, tell the user to wait about 30 seconds and try again.

Each item in the response contains:
- vendorCode: supplier article code (required for include/exclude operations).
- name: product name.
- brand: brand name.
- subject: product category/subject.
- inPromo: "Да" or "Нет" — whether the item is currently in the promotion.
- promoPrice: planned promotional price.
- currentPrice: current retail price.
- currentDiscount: current discount percentage on the site.
- uploadedDiscount: discount that will be applied for the promo.
- wbStock: stock at Wildberries warehouses.
- sellerStock: stock at seller's warehouse.
- daysOnSite: how many days the product has been on the site.
- turnover: inventory turnover metric.`,
      inputSchema: z.object({
        periodID: z.number().int().min(1),
        mode: z.enum(['participating', 'excluded']),
        hasStarted: z.boolean().optional(),
        startDate: z.string().optional(),
      }),
      execute: safeTool('getPromotionGoods', async (data) => {
        return loggedTool('getPromotionGoods', userId, async () => {
          // mode 'participating' -> isRecovery: false (show goods in promo)
          // mode 'excluded' -> isRecovery: true (show goods out of promo)
          const isRecovery = data.mode === 'excluded';

          let hasStarted = data.hasStarted;
          if (hasStarted === undefined && data.startDate) {
            const promoStart = new Date(data.startDate);
            const now = new Date();
            // Compare dates only (year, month, day) — same day counts as started
            hasStarted =
              promoStart.getFullYear() < now.getFullYear() ||
              (promoStart.getFullYear() === now.getFullYear() &&
                promoStart.getMonth() < now.getMonth()) ||
              (promoStart.getFullYear() === now.getFullYear() &&
                promoStart.getMonth() === now.getMonth() &&
                promoStart.getDate() <= now.getDate());
          }

          return getPromotionExcel({
            userId,
            periodID: data.periodID,
            isRecovery,
            hasStarted,
          });
        });
      }),
    }),

    managePromotionGoods: tool({
      description: `Include or exclude goods from a Wildberries promotion.
Call this when the user asks to "exclude goods from promotion", "add products back to promo", "remove ART-123 from promo", "включи товары в акцию", or "исключи товары из акции".
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
        periodID: z.number().int().min(1),
        action: z.enum(['include', 'exclude']),
        vendorCodes: z.array(z.string().min(1)).min(1),
      }),
      execute: safeTool('managePromotionGoods', async (data) => {
        return loggedTool('managePromotionGoods', userId, async () => {
          // action 'include' -> isRecovery: true (recover back)
          // action 'exclude' -> isRecovery: false (exclude)
          const isRecovery = data.action === 'include';

          const result = await applyPromotionRecovery({
            userId,
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
