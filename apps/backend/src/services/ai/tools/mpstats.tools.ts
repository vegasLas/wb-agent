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
Returns: nmID, name, customTitle, brand, subjectName, image, favourite status.`,
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
              customTitle: c.customTitle || '',
              brand: c.brand || '',
              subjectName: c.subjectName || '',
              image: c.image || '',
              favourite: c.favourite,
            })),
          };
        });
      }),
    }),

    listFavoriteSkus: tool({
      description: `List the user's favorited MPStats SKU cards.
Call this when the user asks about their favorite SKUs, избранные артикулы, or wants to select a favorite SKU to compare with their own goods.
This tool returns ONLY favorited SKUs with their custom titles (if the user has set any).
Required: none.
Returns: nmID, name, customTitle, brand, subjectName, image.`,
      inputSchema: z.object({}),
      execute: safeTool('listFavoriteSkus', async () => {
        return loggedTool('listFavoriteSkus', userId, async () => {
          const cards = await prisma.wbSkuCard.findMany({
            where: { userId, favourite: true },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          });

          return {
            count: cards.length,
            cards: cards.map((c) => ({
              nmID: c.nmID,
              name: c.title || '',
              customTitle: c.customTitle || '',
              brand: c.brand || '',
              subjectName: c.subjectName || '',
              image: c.image || '',
            })),
          };
        });
      }),
    }),

    getFavoriteSkusAnalytics: tool({
      description: `Get balances, sales, and revenue analytics for the user's favorited MPStats SKUs.
Call this when the user asks about sales, balances, остатки, продажи, выручка, or analytics of their favorite / избранные SKUs.
If the user asks about specific favorites, pass their nmIds. If they ask about "all favorites" or "my favorites", omit nmIds to fetch analytics for all favorited SKUs.
Required: none.
Optional: nmIds (array of specific favorite NM IDs), d1/d2 (YYYY-MM-DD, default last 30 days), fbs (default 1).
Returns for each SKU: nmId, name, customTitle, revenue, sales, balance, stockFbs, stockFbo, price, rating, comments, salesByRegion (top 5), balanceByRegion (top 5).`,
      inputSchema: z.object({
        nmIds: z.array(z.number().int()).optional(),
        d1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        d2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fbs: z.number().int().default(1),
      }),
      execute: safeTool('getFavoriteSkusAnalytics', async (data) => {
        return loggedTool('getFavoriteSkusAnalytics', userId, async () => {
          const now = new Date();
          const formatDate = (date: Date) => date.toISOString().split('T')[0];
          const finalD1 = data.d1 || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
          const finalD2 = data.d2 || formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));

          let targetNmIds: number[];

          if (data.nmIds && data.nmIds.length > 0) {
            targetNmIds = data.nmIds;
          } else {
            const favorites = await prisma.wbSkuCard.findMany({
              where: { userId, favourite: true },
              select: { nmID: true },
              orderBy: { updatedAt: 'desc' },
              take: 20,
            });
            targetNmIds = favorites.map((f) => f.nmID);
          }

          if (targetNmIds.length === 0) {
            return {
              success: true,
              message: 'No favorite SKUs found',
              skus: [],
            };
          }

          const results = await Promise.all(
            targetNmIds.map(async (nmId) => {
              try {
                const summary = await mpstatsService.getSkuSummary({
                  userId,
                  nmId,
                  d1: finalD1,
                  d2: finalD2,
                  fbs: data.fbs,
                });

                const stats = summary.itemFull.period_stats;
                const item = summary.itemFull;
                const card = await prisma.wbSkuCard.findUnique({
                  where: { nmID_userId: { nmID: nmId, userId } },
                });

                return {
                  nmId,
                  success: true,
                  name: item.name || '',
                  customTitle: card?.customTitle || '',
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
                  salesByRegion: (summary.salesByRegion || [])
                    .sort((a, b) => b.sales - a.sales)
                    .slice(0, 5),
                  balanceByRegion: (summary.balanceByRegion || [])
                    .sort((a, b) => b.balance - a.balance)
                    .slice(0, 5),
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

          const successful = results.filter((r) => r.success);
          const failed = results.filter((r) => !r.success);

          return {
            period: { d1: finalD1, d2: finalD2 },
            analyzedCount: successful.length,
            failedCount: failed.length,
            skus: successful,
            errors: failed.map((f) => ({ nmId: f.nmId, error: (f as any).error })),
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
Call this when the user wants to compare their own goods with competitors, strangers, or their favorited SKUs (e.g. "Сравни артикул 111 и 222", "Compare my SKU with competitor", "Сравни мой товар с избранными").
If the user wants to compare with favorites, first call listFavoriteSkus to get available favorites with their custom titles, then use those nmIds here.
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

    getSkuByUrl: tool({
      description: `Get full MPStats analytics for a Wildberries product by URL or article ID.
Call this when the user provides a WB product link (e.g. "https://www.wildberries.ru/catalog/212597137/detail.aspx") or an article ID.
The tool extracts the NM ID from the URL, fetches full analytics (sales, balances, revenue, pricing), and saves the SKU to the user's local cache.
Required: urlOrId (WB product URL or article ID number).
Optional: d1, d2 (YYYY-MM-DD, default last 30 days), fbs (default 1).`,
      inputSchema: z.object({
        urlOrId: z.string(),
        d1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        d2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fbs: z.number().int().default(1),
      }),
      execute: safeTool('getSkuByUrl', async (data) => {
        return loggedTool('getSkuByUrl', userId, async () => {
          const trimmed = data.urlOrId.trim();
          let nmId: number | null = null;

          const direct = parseInt(trimmed, 10);
          if (!Number.isNaN(direct) && String(direct) === trimmed) {
            nmId = direct;
          } else {
            const match = trimmed.match(/\/catalog\/(\d+)\//);
            if (match) {
              const fromUrl = parseInt(match[1], 10);
              if (!Number.isNaN(fromUrl)) {
                nmId = fromUrl;
              }
            }
          }

          if (!nmId) {
            return {
              success: false,
              error: 'Could not extract article ID from the provided URL or ID. Please provide a valid Wildberries product link or article number.',
            };
          }

          const now = new Date();
          const formatDate = (date: Date) => date.toISOString().split('T')[0];
          const finalD1 = data.d1 || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
          const finalD2 = data.d2 || formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));

          const summary = await mpstatsService.getSkuSummary({
            userId,
            nmId,
            d1: finalD1,
            d2: finalD2,
            fbs: data.fbs,
          });

          const itemFull = summary.itemFull;
          const image = itemFull.photo?.list?.[0]?.t || itemFull.photo?.list?.[0]?.f || '';

          await prisma.wbSkuCard.upsert({
            where: { nmID_userId: { nmID: nmId, userId } },
            update: {
              brand: itemFull.brand || null,
              title: itemFull.name || null,
              subjectName: itemFull.subject?.name || null,
              image,
            },
            create: {
              nmID: nmId,
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
            nmId,
            name: itemFull.name || '',
            brand: itemFull.brand || '',
            subjectName: itemFull.subject?.name || '',
            image,
            link: itemFull.link || '',
            revenue: itemFull.period_stats?.revenue ?? 0,
            sales: itemFull.period_stats?.sales ?? 0,
            revenueAvg: itemFull.period_stats?.revenue_avg ?? 0,
            salesAvg: itemFull.period_stats?.sales_avg ?? 0,
            balance: itemFull.balance ?? 0,
            stockFbs: itemFull.stock?.fbs ?? 0,
            stockFbo: itemFull.stock?.fbo ?? 0,
            price: itemFull.price?.final_price ?? 0,
            rating: itemFull.rating ?? 0,
            comments: itemFull.comments ?? 0,
            discount: itemFull.discount ?? 0,
            salesByRegion: (summary.salesByRegion || []).slice(0, 5),
            balanceByRegion: (summary.balanceByRegion || []).slice(0, 5),
          };
        });
      }),
    }),
  };
}
