/**
 * Promotions Service
 * Orchestrates WB promotions calendar API operations.
 * Delegates Excel handling to promotions.excel.service.
 */

import { resolveAccountContext } from '@/services/account-context.service';
import {
  getPromotionExcel as excelGetPromotionExcel,
  applyPromotionRecovery as excelApplyPromotionRecovery,
  type GetPromotionExcelParams,
  type PromotionExcelResult,
} from './promotions.excel.service';
import { wbAccountRequest } from '@/utils/wb-request';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
} from '@/types/wb';

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
}): Promise<PromotionsTimelineResponse> => {
  const ctx = await resolveAccountContext(userId, { strict: true });

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const defaultEnd = new Date(now.getFullYear() + 1, 11, 31).toISOString();

  const finalStartDate = startDate || defaultStart;
  const finalEndDate = endDate || defaultEnd;
  const finalFilter = filter || 'PARTICIPATING';

  const url =
    `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/web/api/v3/promotions/timeline` +
    `?endDate=${encodeURIComponent(finalEndDate)}` +
    `&filter=${encodeURIComponent(finalFilter)}` +
    `&startDate=${encodeURIComponent(finalStartDate)}`;

  return wbAccountRequest<PromotionsTimelineResponse>({
    url,
    accountId: ctx.accountId,
    userAgent: ctx.userAgent,
    proxy: ctx.proxy,
    supplierId: ctx.supplierId,
    method: 'GET',
  });
};

// ─── Detail ─────────────────────────────────────────────────────────────────

export const getPromotionDetail = async ({
  userId,
  promoID,
}: {
  userId: number;
  promoID: number;
}): Promise<PromotionDetailResponse> => {
  const ctx = await resolveAccountContext(userId, { strict: true });

  const url =
    `https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/web/api/v3/promotions/detail` +
    `?promoID=${encodeURIComponent(promoID)}`;

  return wbAccountRequest<PromotionDetailResponse>({
    url,
    accountId: ctx.accountId,
    userAgent: ctx.userAgent,
    proxy: ctx.proxy,
    supplierId: ctx.supplierId,
    method: 'GET',
  });
};

// ─── Excel ──────────────────────────────────────────────────────────────────

export type { PromotionExcelResult, GetPromotionExcelParams };

export const getPromotionExcel = async (
  params: GetPromotionExcelParams,
): Promise<PromotionExcelResult> => {
  const ctx = await resolveAccountContext(params.userId, { strict: true });
  return excelGetPromotionExcel(params, ctx);
};

// ─── Recovery ───────────────────────────────────────────────────────────────

export const applyPromotionRecovery = async (params: {
  userId: number;
  periodID: number;
  selectedItems: string[];
  isRecovery: boolean;
}): Promise<{ success: boolean; error: string | null }> => {
  const ctx = await resolveAccountContext(params.userId, { strict: true });
  return excelApplyPromotionRecovery(params, ctx);
};
