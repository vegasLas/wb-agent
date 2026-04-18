import { tool, Tool } from 'ai';
import { z } from 'zod';
import { mpstatsService } from '@/services/external/analytics/mpstats.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

export function mpstatsTools(userId: number): Record<string, Tool> {
  return {
    getSkuSummary: tool({
      description: `Get aggregated MPStats analytics for a Wildberries product by NM ID (артикул).
Call this when the user asks about sales analytics, аналитика артикула, MPStats data, regional sales, balances, or full item card data.
This tool internally covers both summary and full-card needs.
Required: nmId (Wildberries NM ID).
Optional: d1, d2 (YYYY-MM-DD, default last 30 days), fbs (default 1).
Key response fields explained:
- period_stats.revenue / sales = Общая выручка / Продажи шт.
- period_stats.revenue_estimated / sales_estimated = Выкупы ₽ / шт (after returns).
- period_stats.revenue_avg / sales_avg = Средняя выручка / продажи в день.
- period_stats.revenue_avg_with_stock / sales_avg_with_stock = Средние значения при наличии товара.
- period_stats.revenue_potential = Потенциал, ₽.
- period_stats.lost_profit / lost_profit_percent = Упущенная выручка.
- itemFull.balance = Наличие (stock), itemFull.stock.fbs = Наличие FBS.
- itemFull.price.wallet_price / final_price / price = Цены (WB кошелек, СПП, базовая).
- itemFull.discount = Скидка %, itemFull.rating = Рейтинг, itemFull.comments = Отзывы.
- salesByRegion = Продажи по складам, balanceByRegion = Остатки по складам.`,
      inputSchema: z.object({
        nmId: z.number().int(),
        d1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        d2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fbs: z.number().int().default(1),
      }),
      execute: safeTool('getSkuSummary', async (data) => {
        return loggedTool('getSkuSummary', userId, async () => {
          const now = new Date();
          const formatDate = (date: Date) => date.toISOString().split('T')[0];
          const finalD1 = data.d1 || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
          const finalD2 = data.d2 || formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));
          return cachedExecute(`sku-summary-${data.nmId}-${finalD1}-${finalD2}`, 30000, async () => {
            return mpstatsService.getSkuSummary({
              userId,
              nmId: data.nmId,
              d1: finalD1,
              d2: finalD2,
              fbs: data.fbs,
            });
          });
        });
      }),
    }),
  };
}
