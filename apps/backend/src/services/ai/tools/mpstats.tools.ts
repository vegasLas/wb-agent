import { tool, Tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { mpstatsService } from '@/services/external/analytics/mpstats.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

function getDefaultDateRange() {
  const now = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const d1 = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  const d2 = formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));
  return { d1, d2 };
}

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

    listSavedSkus: tool({
      description: `List the user's saved MPStats SKU cards (added / viewed / favorited SKUs).
Call this when the user asks about their saved SKUs, added артикулы, MPStats favorites, or "what SKUs do I have".
Required: none.
Returns: nmID, name, brand, subjectName, image, favourite status.`,
      inputSchema: z.object({}),
      execute: safeTool('listSavedSkus', async () => {
        return loggedTool('listSavedSkus', userId, async () => {
          const cards = await prisma.wbSkuCard.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          });

          return {
            count: cards.length,
            cards: cards.map((c) => ({
              nmID: c.nmID,
              name: c.title || '',
              brand: c.brand || '',
              subjectName: c.subjectName || '',
              image: c.image || '',
              favourite: c.favourite,
            })),
          };
        });
      }),
    }),

    addSku: tool({
      description: `Add a new MPStats SKU by NM ID and save it to the user's local cache.
Call this when the user wants to add, save, or track a new SKU (e.g. "Добавь артикул 12345", "Сохрани SKU").
The tool fetches full item data from MPStats. If the fetch is successful, the SKU card is upserted into the local database.
Required: nmId (Wildberries NM ID).`,
      inputSchema: z.object({
        nmId: z.number().int(),
      }),
      execute: safeTool('addSku', async (data) => {
        return loggedTool('addSku', userId, async () => {
          const { d1, d2 } = getDefaultDateRange();

          const itemFull = await mpstatsService.getItemFullForUser({
            userId,
            nmId: data.nmId,
            d1,
            d2,
          });

          const image =
            itemFull.photo?.list?.[0]?.t || itemFull.photo?.list?.[0]?.f || '';

          const saved = await prisma.wbSkuCard.upsert({
            where: {
              nmID_userId: {
                nmID: data.nmId,
                userId,
              },
            },
            update: {
              brand: itemFull.brand || null,
              title: itemFull.name || null,
              subjectName: itemFull.subject?.name || null,
              image,
            },
            create: {
              nmID: data.nmId,
              userId,
              brand: itemFull.brand || null,
              title: itemFull.name || null,
              subjectName: itemFull.subject?.name || null,
              image,
              favourite: false,
            },
          });

          return {
            success: true,
            message: 'SKU added successfully',
            sku: {
              nmID: saved.nmID,
              name: saved.title || '',
              brand: saved.brand || '',
              subjectName: saved.subjectName || '',
              image: saved.image || '',
              favourite: saved.favourite,
            },
          };
        });
      }),
    }),

    compareSkus: tool({
      description: `Compare MPStats analytics summaries across multiple SKUs (Wildberries NM IDs).
Call this when the user wants to compare their own goods with competitors/strangers (e.g. "Сравни артикул 111 и 222", "Compare my SKU with competitor").
Accepts 2–5 NM IDs. Fetches aggregated analytics for each and returns key metrics side-by-side.
Required: nmIds (array of 2–5 Wildberries NM IDs).`,
      inputSchema: z.object({
        nmIds: z.array(z.number().int()).min(2).max(5),
      }),
      execute: safeTool('compareSkus', async (data) => {
        return loggedTool('compareSkus', userId, async () => {
          const { d1, d2 } = getDefaultDateRange();

          const results = await Promise.all(
            data.nmIds.map(async (nmId) => {
              try {
                const summary = await mpstatsService.getSkuSummary({
                  userId,
                  nmId,
                  d1,
                  d2,
                });

                const stats = summary.itemFull.period_stats;
                const item = summary.itemFull;

                return {
                  nmId,
                  success: true,
                  name: item.name || '',
                  brand: item.brand || '',
                  subjectName: item.subject?.name || '',
                  revenue: stats?.revenue ?? 0,
                  sales: stats?.sales ?? 0,
                  revenueAvg: stats?.revenue_avg ?? 0,
                  salesAvg: stats?.sales_avg ?? 0,
                  revenueEstimated: stats?.revenue_estimated ?? 0,
                  salesEstimated: stats?.sales_estimated ?? 0,
                  revenuePotential: stats?.revenue_potential ?? 0,
                  lostProfit: stats?.lost_profit ?? 0,
                  lostProfitPercent: stats?.lost_profit_percent ?? 0,
                  rating: item.rating ?? 0,
                  price: item.price?.final_price ?? 0,
                  balance: item.balance ?? 0,
                  stockFbs: item.stock?.fbs ?? 0,
                  stockFbo: item.stock?.fbo ?? 0,
                  comments: item.comments ?? 0,
                  discount: item.discount ?? 0,
                };
              } catch (err: any) {
                return {
                  nmId,
                  success: false,
                  error: err?.message || 'Failed to fetch SKU summary',
                };
              }
            }),
          );

          const successful = results.filter((r) => r.success) as Array<{
            nmId: number;
            success: true;
            name: string;
            brand: string;
            subjectName: string;
            revenue: number;
            sales: number;
            revenueAvg: number;
            salesAvg: number;
            revenueEstimated: number;
            salesEstimated: number;
            revenuePotential: number;
            lostProfit: number;
            lostProfitPercent: number;
            rating: number;
            price: number;
            balance: number;
            stockFbs: number;
            stockFbo: number;
            comments: number;
            discount: number;
          }>;

          const failed = results.filter((r) => !r.success);

          // Find leader by revenue
          let leader: typeof successful[0] | null = null;
          if (successful.length > 0) {
            leader = successful.reduce((best, current) =>
              current.revenue > best.revenue ? current : best,
            );
          }

          return {
            comparedCount: successful.length,
            failedCount: failed.length,
            leader: leader
              ? {
                  nmId: leader.nmId,
                  name: leader.name,
                  revenue: leader.revenue,
                }
              : null,
            comparison: successful,
            errors: failed.map((f) => ({ nmId: f.nmId, error: (f as any).error })),
          };
        });
      }),
    }),
  };
}
