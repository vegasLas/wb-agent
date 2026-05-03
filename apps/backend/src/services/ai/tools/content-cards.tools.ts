import { tool, Tool } from 'ai';
import { z } from 'zod';
import {
  wbContentOfficialService,
  wbTariffsOfficialService,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import {
  toContentCardListResponseDTO,
  toContentCardDetailDTO,
} from '@/services/external/wb/official/wb-content-official.mapper';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

export function contentCardsTools(userId: number): Record<string, Tool> {
  return {
    getContentCardsTableList: tool({
      description: `Get the user's WB content cards table list (карточки товаров / content cards) from the official Wildberries Content API.
Call this when the user asks about their products, cards, карточки, товары, or catalog.
Optional: n (number of cards to fetch, default 20).
Optional: cursor (for pagination — pass the cursor object from a previous response to get the next page).
The response includes totalCount (total number of products) and cursor.next (whether more pages exist).
CRITICAL: When presenting results to the user, never mention nmID values. Refer to products only by their title or vendorCode.
Response columns explained (each row is one product card):
- title = Название товара (product name).
- nmID = Артикул WB (internal WB article ID, do NOT show to user).
- stocks = Остатки на складах, шт. (total stock quantity).
- subject = Предмет / категория товара (product category/subject name).
- feedbackRating = Рейтинг отзывов (feedback rating, 0-5 scale).
- vendorCode = Артикул продавца (supplier article / vendor code).
- thumbnail = Миниатюра изображения товара (product thumbnail URL).`,
      inputSchema: z.object({
        n: z.number().int().min(1).default(20),
        cursor: z
          .object({ updatedAt: z.string(), nmID: z.number().int() })
          .optional(),
      }),
      execute: safeTool('getContentCardsTableList', async (data) => {
        return loggedTool('getContentCardsTableList', userId, async () => {
          return cachedExecute(
            `content-cards-list-${data.n}`,
            30000,
            async () => {
              const supplierId = await resolveOfficialSupplierId(
                userId,
                'CONTENT',
              );
              if (!supplierId) {
                throw new Error(
                  'No suitable official API key found for Content. Please add a Content API key in your profile.',
                );
              }
              const response =
                await wbContentOfficialService.getContentCardsTableList({
                  supplierId,
                  limit: data.n,
                  cursor: data.cursor,
                });
              return toContentCardListResponseDTO(response, data.n);
            },
          );
        });
      }),
    }),

    getContentCardImt: tool({
      description: `Get detailed info for a specific WB content card (карточка товара) from the official Wildberries Content API.
Call this when the user asks about details of a specific product card, IMT, or wants to know dimensions, characteristics, brand, or description.
Required: nmID (WB article ID).
CRITICAL: When presenting results to the user, never mention nmID or imtID values. Use only title and vendorCode to refer to the product.
Key fields explained:
- nmID = Артикул WB (internal ID, do NOT show to user).
- vendorCode = Артикул продавца.
- title = Название товара.
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
          return cachedExecute(
            `content-card-imt-${data.nmID}`,
            30000,
            async () => {
              const supplierId = await resolveOfficialSupplierId(
                userId,
                'CONTENT',
              );
              if (!supplierId) {
                throw new Error(
                  'No suitable official API key found for Content. Please add a Content API key in your profile.',
                );
              }
              const card = await wbContentOfficialService.getContentCardByNmID({
                supplierId,
                nmID: data.nmID,
              });
              return card ? toContentCardDetailDTO(card) : null;
            },
          );
        });
      }),
    }),

    getContentCardTariffs: tool({
      description: `Get WB warehouse tariffs (тарифы складов / стоимость логистики и хранения) by product dimensions.
Call this when the user asks about logistics costs, storage costs, acceptance costs, tariffs, delivery prices, warehouse fees, or стоимость доставки.
IMPORTANT: If the user mentions a specific warehouse name (e.g. "Коледино", "Электросталь"), ask them to confirm the exact warehouse name before calling this tool, because the results contain many warehouses and filtering by name helps provide a focused answer.
CRITICAL: When presenting results to the user, never mention nmID, subjectId, or any internal ID values. Use only the product title/vendorCode and warehouse names.
Required: height, length, weight, width (product dimensions in cm/kg).`,
      inputSchema: z.object({
        height: z.number(),
        length: z.number(),
        weight: z.number(),
        width: z.number(),
      }),
      execute: safeTool('getContentCardTariffs', async (data) => {
        return loggedTool('getContentCardTariffs', userId, async () => {
          return cachedExecute(
            `tariffs-${data.height}-${data.length}-${data.weight}-${data.width}`,
            60000,
            async () => {
              const supplierId = await resolveOfficialSupplierId(
                userId,
                'CONTENT',
              );
              if (!supplierId) {
                throw new Error(
                  'No suitable official API key found for Content. Please add a Content API key in your profile.',
                );
              }
              return wbTariffsOfficialService.getAggregatedTariffs({
                supplierId,
                height: data.height,
                length: data.length,
                weight: data.weight,
                width: data.width,
              });
            },
          );
        });
      }),
    }),

    getContentCardCommissions: tool({
      description: `Get WB commission rates (комиссии) for a specific content card by nmID.
Call this when the user asks about commissions, category fees, FBO/FBS commission rates, or subject percentages for a specific product.
Required: nmID (WB article ID).`,
      inputSchema: z.object({
        nmID: z.number().int(),
      }),
      execute: safeTool('getContentCardCommissions', async (data) => {
        return loggedTool('getContentCardCommissions', userId, async () => {
          return cachedExecute(
            `commissions-${data.nmID}`,
            60000,
            async () => {
              const supplierId = await resolveOfficialSupplierId(
                userId,
                'CONTENT',
              );
              if (!supplierId) {
                throw new Error(
                  'No suitable official API key found for Content. Please add a Content API key in your profile.',
                );
              }

              const card = await wbContentOfficialService.getContentCardByNmID({
                supplierId,
                nmID: data.nmID,
              });

              if (!card || !card.subjectID) {
                throw new Error('Content card or subject ID not found');
              }

              const commission = await wbTariffsOfficialService.getCommissionBySubject({
                supplierId,
                subjectID: card.subjectID,
              });

              if (!commission) {
                throw new Error('Commission data not found for this subject');
              }

              return {
                categories: [
                  {
                    id: commission.subjectID,
                    name: commission.subjectName,
                    subject: commission.subjectName,
                    percent: commission.kgvpMarketplace,
                    percentFBS: commission.kgvpMarketplace,
                    kgvpSupplier: commission.kgvpSupplier,
                    kgvpSupplierExpress: commission.kgvpSupplierExpress,
                    kgvpPickup: commission.kgvpPickup,
                  },
                ],
                length: 1,
                countryCode: '',
              };
            },
          );
        });
      }),
    }),
  };
}
