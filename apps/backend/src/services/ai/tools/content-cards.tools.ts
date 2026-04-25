import { tool, Tool } from 'ai';
import { z } from 'zod';
import { wbContentService } from '@/services/external/wb/wb-content.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

export function contentCardsTools(userId: number): Record<string, Tool> {
  return {
    getContentCardsTableList: tool({
      description: `Get the user's WB content cards table list (карточки товаров / content cards) from seller-content.wildberries.ru.
Call this when the user asks about their products, cards, карточки, товары, or catalog.
Optional: n (number of cards to fetch, default 20).
Optional: cursor (for pagination — pass the cursor object from a previous response to get the next page).
The response includes totalCount (total number of products) and cursor.next (whether more pages exist).
CRITICAL: When presenting results to the user, never mention nmID values. Refer to products only by their title or vendorCode.
Response columns explained (each row is one product card):
- title = Название товара (product name).
- nmID = Артикул WB (internal WB article ID, do NOT show to user).
- currentPrice = Текущая цена, ₽ (current price from the first size variant).
- stocks = Остатки на складах, шт. (total stock quantity).
- subject = Предмет / категория товара (product category/subject name).
- feedbackRating = Рейтинг отзывов (feedback rating, 0-5 scale).
- vendorCode = Артикул продавца (supplier article / vendor code).
- thumbnail = Миниатюра изображения товара (product thumbnail URL).`,
      inputSchema: z.object({
        n: z.number().int().min(1).default(20),
        cursor: z.object({ n: z.number().int(), nmID: z.number().int() }).optional(),
      }),
      execute: safeTool('getContentCardsTableList', async (data) => {
        return loggedTool('getContentCardsTableList', userId, async () => {
          return cachedExecute(`content-cards-list-${data.n}`, 30000, async () => {
            return wbContentService.getContentCardsTableList({
              userId,
              n: data.n,
              cursor: data.cursor ?? null,
            });
          });
        });
      }),
    }),

    getContentCardImt: tool({
      description: `Get detailed IMT info for a specific WB content card (карточка товара / getImt) from seller-content.wildberries.ru.
Call this when the user asks about details of a specific product card, IMT, or wants to know dimensions, characteristics, brand, or description.
Required: nmID (WB article ID).
CRITICAL: When presenting results to the user, never mention nmID or imtID values. Use only title and vendorCode to refer to the product.
Key fields explained:
- nmID = Артикул WB (internal ID, do NOT show to user).
- vendorCode = Артикул продавца.
- title = Название товара.
- description = Описание товара.
- imtID = Идентификатор карточки товара (internal ID, do NOT show to user).
- subject = Предмет / категория товара.
- brandTitle = Бренд.
- sizes = Размеры товара (each size has chrtID, techSize, wbSize, skus, price, currency).
- mediaFile = Первое медиафайл (first media file: photo/video with value, mimeType, thumbnail, preview).
- dimensions = Габариты (width, height, length, weightBrutto).
- characteristics = Характеристики товара (array of type/value pairs).`,
      inputSchema: z.object({
        nmID: z.number().int(),
      }),
      execute: safeTool('getContentCardImt', async (data) => {
        return loggedTool('getContentCardImt', userId, async () => {
          return cachedExecute(`content-card-imt-${data.nmID}`, 30000, async () => {
            return wbContentService.getContentCardImt({
              userId,
              nmID: data.nmID,
            });
          });
        });
      }),
    }),

    getContentCardTariffs: tool({
      description: `Get WB warehouse tariffs (тарифы складов / стоимость логистики и хранения) by product dimensions and subject ID from seller-weekly-report.wildberries.ru.
Call this when the user asks about logistics costs, storage costs, acceptance costs, tariffs, delivery prices, warehouse fees, or стоимость доставки.
IMPORTANT: If the user mentions a specific warehouse name (e.g. "Коледино", "Электросталь"), ask them to confirm the exact warehouse name before calling this tool, because the results contain many warehouses and filtering by name helps provide a focused answer.
CRITICAL: When presenting results to the user, never mention nmID, subjectId, or any internal ID values. Use only the product title/vendorCode and warehouse names.
Required: height, length, weight, width (product dimensions in cm/kg), subjectId (WB subject/category ID).
Response columns explained (each row is one warehouse):
- warehouseName = Название склада (e.g. Коледино, Электросталь).
- delivery = Стоимость логистики по складам и типам поставки Короб (box delivery cost).
- deliveryMonopallet = Стоимость логистики монопаллет.
- deliveryReturn = Стоимость обратной логистики (возврата).
- storageMonoAndMix = Стоимость хранения в день короб (daily box storage cost).
- storageMonopallet = Стоимость хранения в день монопаллета (daily monopallet storage cost).
- acceptanceMonoAndMix = Стоимость приёмки короб (box acceptance cost).
- acceptanceMonopallet = Стоимость приёмки монопаллета (monopallet acceptance cost).
- acceptanceSuperSafe = Стоимость приёмки суперсейф (supersafe acceptance cost).
- deliverySubjectSettingByVolume = Настройка доставки по объёму.`,
      inputSchema: z.object({
        height: z.number(),
        length: z.number(),
        weight: z.number(),
        width: z.number(),
        subjectId: z.number().int(),
      }),
      execute: safeTool('getContentCardTariffs', async (data) => {
        return loggedTool('getContentCardTariffs', userId, async () => {
          return cachedExecute(
            `tariffs-${data.subjectId}-${data.height}-${data.length}-${data.weight}-${data.width}`,
            60000,
            async () => {
              return wbContentService.getContentCardTariffs({
                userId,
                height: data.height,
                length: data.length,
                weight: data.weight,
                width: data.width,
                subjectId: data.subjectId,
              });
            },
          );
        });
      }),
    }),

    getContentCardCategories: tool({
      description: `Get WB categories and commission rates (категории и комиссии) from seller-weekly-report.wildberries.ru.
Call this when the user asks about commissions, category fees, FBO/FBS commission rates, or subject percentages.
Required: searchText (subject name to search), category (array of parent category names, e.g. ["Игрушки"]).
Optional: take (default 100), skip (default 0), sort (default 'name'), order (default 'asc').
Tip: you can use the subject from getContentCardImt as searchText and the parent from getContentCardImt as category.
CRITICAL: When presenting results to the user, never mention nmID, category id, or any internal ID values. Use only category name and subject name.
Response columns explained (each row is one category/subject):
- name = Название категории (parent category name, e.g. "Игрушки").
- subject = Предмет / подкатегория (e.g. "Машинки").
- percent = Склад WB (FBW), % — commission for warehouse sales.
- percentFBS = Маркетплейс (FBS), % — commission for marketplace sales.
- kgvpSupplier = Витрина (DBS) / Курьер WB (DBW), % — commission for showcase/delivery.
- kgvpSupplierExpress = Витрина экспресс (EDBS), % — commission for express delivery.
- kgvpPickup = Самовывоз из магазина продавца (C&C), % — commission for click&collect.`,
      inputSchema: z.object({
        searchText: z.string(),
        category: z.array(z.string()),
        take: z.number().int().min(1).default(100),
        skip: z.number().int().min(0).default(0),
        sort: z.string().default('name'),
        order: z.enum(['asc', 'desc']).default('asc'),
      }),
      execute: safeTool('getContentCardCategories', async (data) => {
        return loggedTool('getContentCardCategories', userId, async () => {
          return cachedExecute(
            `categories-${data.searchText}-${data.category.join(',')}`,
            60000,
            async () => {
              return wbContentService.getContentCardCategories({
                userId,
                searchText: data.searchText,
                category: data.category,
                take: data.take,
                skip: data.skip,
                sort: data.sort,
                order: data.order,
              });
            },
          );
        });
      }),
    }),
  };
}
