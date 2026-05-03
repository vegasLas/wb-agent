import { tool, Tool } from 'ai';
import { z } from 'zod';
import { wbExtendedService } from '@/services/external/wb/wb-extended.service';
import {
  wbStatisticsOfficialService,
  mapRegionSalesToLegacyFormat,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';
import { normalizeWbDate } from './date-normalizer';

export function advertsTools(userId: number): Record<string, Tool> {
  return {
    getRegionSales: tool({
      description: `Get region sales data (продажи по регионам) for the user's selected account.
Call this when the user asks about sales by region, federal districts, географическая структура продаж, or geographical breakdown.
Required: dateFrom, dateTo (DD.MM.YY or YYYY-MM-DD).
Optional: limit (default 10), offset (default 0).
Response structure:
- Rows contain: country (Страна), fedOkr (Фед. округ), qty (Выкупили, шт.), reward (К перечислению, руб.), share (Доля, %).
- Nested under each row: oblasts (Область) → cities (Город) with the same qty/reward/share fields.
- Summaries: total qty = Выкупили шт., total reward = К перечислению, top region = Топ регион.`,
      inputSchema: z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        limit: z.number().int().min(1).default(10),
        offset: z.number().int().min(0).default(0),
      }),
      execute: safeTool('getRegionSales', async (data) => {
        return loggedTool('getRegionSales', userId, async () => {
          const officialSupplierId = await resolveOfficialSupplierId(
            userId,
            'ANALYTICS',
          );
          if (!officialSupplierId) {
            return 'Analytics API key not found. Please add an Analytics-category API key in your account settings.';
          }
          return cachedExecute(`region-sales-${data.dateFrom}-${data.dateTo}`, 30000, async () => {
            const raw = await wbStatisticsOfficialService.getRegionSales({
              supplierId: officialSupplierId,
              dateFrom: normalizeWbDate(data.dateFrom),
              dateTo: normalizeWbDate(data.dateTo),
              limit: data.limit,
              offset: data.offset,
            });
            return mapRegionSalesToLegacyFormat(raw);
          });
        });
      }),
    }),

    getAdverts: tool({
      description: `List the user's WB advert campaigns (рекламные кампании / adverts / cmp).
Call this when the user asks about their adverts, campaigns, реклама, or cmp data.
Optional: pageNumber (default 1), pageSize (default 10), status (array of status IDs, default [4,9,11]), order (default 'createDate'), direction (default 'desc'), autofill (default 'all'), bidType (default [1,2]), type (default [8,9]), filterState.
Status ID mapping (critical): 4=Готова, 5=Завершена, 6=Отклонена, 7=Ошибка, 8=Ожидает, 9=Активна, 10-11=Приостановлена.
Key fields in response:
- id = ID кампании, campaign_name = Название, create_date = дата создания.
- status_id = Статус (use mapping above).
- products_count = Товаров, budget = Бюджет.
- autofill.is_enable = Автозаполнение (true = Вкл, false = Выкл).
- counts.totalCount = Всего рекламных кампаний, counts.pauseCount = На паузе.`,
      inputSchema: z.object({
        pageNumber: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).default(10),
        status: z.array(z.number().int()).optional(),
        order: z.string().optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        autofill: z.string().optional(),
        bidType: z.array(z.number().int()).optional(),
        type: z.array(z.number().int()).optional(),
        filterState: z.number().int().optional(),
      }),
      execute: safeTool('getAdverts', async (data) => {
        return loggedTool('getAdverts', userId, async () => {
          return cachedExecute(`adverts-${data.pageNumber}-${data.status?.join(',')}`, 30000, async () => {
            return wbExtendedService.getAdverts({ userId, ...data });
          });
        });
      }),
    }),

    getAdvertPresetInfo: tool({
      description: `Get keyword statistics ("статистика по ключевым словам" / preset-info) for a specific advert campaign.
Call this when the user asks about keywords, search terms, key phrases, or preset-info for an advert.
Required: advertId, nmId.
Optional: pageSize (default 5), pageNumber (default 1), filterQuery, from, to (default last 7 days), sortDirection (default 'descend'), filterState, calcPages (default true), calcTotal (default true).
Key fields explained:
- name = Название ключевого слова (search phrase).
- spend = Затраты, ₽.
- ctr = CTR (click-through rate).
- avg_pos = Средняя позиция (average ad position).
- views = Показы (impressions), clicks = Клики, baskets = Корзина (add-to-carts).
- orders = Заказанные товары, шт.
- cpm = CPM (cost per 1000 impressions).
- total object contains aggregated Показы, Клики, Заказы, and Расход.`,
      inputSchema: z.object({
        advertId: z.number().int(),
        nmId: z.number().int(),
        pageSize: z.number().int().min(1).default(5),
        pageNumber: z.number().int().min(1).default(1),
        filterQuery: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        sortDirection: z.string().default('descend'),
        filterState: z.number().int().optional(),
        calcPages: z.boolean().default(true),
        calcTotal: z.boolean().default(true),
      }),
      execute: safeTool('getAdvertPresetInfo', async (data) => {
        return loggedTool('getAdvertPresetInfo', userId, async () => {
          return cachedExecute(`advert-preset-${data.advertId}`, 30000, async () => {
            return wbExtendedService.getAdvertPresetInfo({ userId, ...data });
          });
        });
      }),
    }),

    getAdvertFullStat: tool({
      description: `Get full campaign statistics ("полная статистика" / fullstat) for a specific WB advert.
Call this when the user asks about full advert stats, detailed campaign metrics, daily breakdown, or nm-level statistics for an advert.
Required: advertId.
Optional: from, to (default last 7 days in ISO format), appType (default 0), placementType (default 0).
Key fields explained:
- content.advertId = ID кампании.
- content.views = Показы, clicks = Клики, orders = Заказы, shks = Штуки.
- content.spend = Расход, currency = Валюта.
- content.ctr = CTR, cpc = CPC, cr = CR, cpm = CPM, cpo = CPO.
- content.sum_price = Сумма заказов, sum = Сумма (other metric).
- content.cost_share = Доля расходов, position = Позиция.
- content.days[] = Daily breakdown with date, views, clicks, orders, spend, ctr, cpc, etc.
- content.nmStats[] = Per-NM statistics (nm_id, name, views, clicks, orders, spend, etc.) including imt_nm_stats for IMT-level breakdown.
- content.previous = Previous period data with days[] and diff object for comparison.`,
      inputSchema: z.object({
        advertId: z.number().int(),
        from: z.string().optional(),
        to: z.string().optional(),
        appType: z.number().int().default(0),
        placementType: z.number().int().default(0),
      }),
      execute: safeTool('getAdvertFullStat', async (data) => {
        return loggedTool('getAdvertFullStat', userId, async () => {
          return cachedExecute(`advert-fullstat-${data.advertId}-${data.from}-${data.to}`, 30000, async () => {
            return wbExtendedService.getAdvertFullStat({ userId, ...data });
          });
        });
      }),
    }),
  };
}
