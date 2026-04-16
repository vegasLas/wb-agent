import { tool, Tool } from 'ai';
import { z } from 'zod';
import { autobookingService } from '@/services/domain/autobooking/autobooking.service';
import { wbSupplierService } from '@/services/external/wb/wb-supplier.service';
import { safeTool, loggedTool } from './safe-tool.utils';
import { resolveAccountContext } from './account-context.utils';
import {
  createPendingAction,
  PendingOption,
} from '../ai-pending-action.service';
import { formatDraftOption, findBestDraftMatch } from './autobooking.utils';

const supplyTypeEnum = z.enum(['BOX', 'MONOPALLETE', 'SUPERSAFE']);
const dateTypeEnum = z.enum([
  'WEEK',
  'MONTH',
  'CUSTOM_PERIOD',
  'CUSTOM_DATES',
  'CUSTOM_DATES_SINGLE',
]);

const baseDateRefine = (data: any) => {
  if (
    data.dateType === 'CUSTOM_DATES' ||
    data.dateType === 'CUSTOM_DATES_SINGLE'
  ) {
    return Array.isArray(data.customDates) && data.customDates.length > 0;
  }
  if (data.dateType === 'CUSTOM_PERIOD') {
    return !!(data.startDate && data.endDate);
  }
  if (data.dateType === 'WEEK' || data.dateType === 'MONTH') {
    return !!data.startDate;
  }
  return true;
};

const baseDateMessage = {
  message:
    'For CUSTOM_DATES or CUSTOM_DATES_SINGLE, customDates is required. ' +
    'For CUSTOM_PERIOD, startDate and endDate are required. ' +
    'For WEEK or MONTH, startDate is required.',
};

export function autobookingTools(
  userId: number,
  conversationId?: string,
): Record<string, Tool> {
  return {
    listAutobookings: tool({
      description: `List the user's autobookings (автоброни) with optional status filter.
Call this when the user asks to see their автоброни or автобукинги.
Required: none.
Optional: status ('ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'ERROR'), limit (max 20, default 10).`,
      inputSchema: z.object({
        status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ERROR']).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: safeTool('listAutobookings', async ({ status, limit }) => {
        return loggedTool('listAutobookings', userId, async () => {
          const result: any = await autobookingService.getUserAutobookings(
            userId,
            1,
            limit,
          );
          if (status && result.items) {
            return {
              ...result,
              items: result.items.filter((item: any) => item.status === status),
            };
          }
          return result;
        });
      }),
    }),

    prepareAutobooking: tool({
      description: `Prepare and validate an autobooking before creating it. Use this as the final confirmation step.
Returns a human-readable summary of what will be created. Call this after the user has confirmed all parameters.
Required: warehouseId, supplyType, dateType, draftId.
Supply types: Короба = BOX, Монопаллеты = MONOPALLETE, Суперсейф = SUPERSAFE.
Optional: transitWarehouseId, maxCoefficient (default 0), monopalletCount.`,
      inputSchema: z.object({
        warehouseId: z.number().int(),
        transitWarehouseId: z.number().int().optional().nullable(),
        supplyType: supplyTypeEnum,
        dateType: dateTypeEnum,
        startDate: z.string().datetime().optional().nullable(),
        endDate: z.string().datetime().optional().nullable(),
        customDates: z.array(z.string().datetime()).optional(),
        maxCoefficient: z.number().default(0),
        monopalletCount: z.number().int().min(1).optional().nullable(),
        draftId: z.string(),
      }),
      execute: safeTool('prepareAutobooking', async (data) => {
        return loggedTool('prepareAutobooking', userId, async () => {
          const ctx = await resolveAccountContext(userId);

          // Validate draft goods against warehouse
          const validation: any =
            await wbSupplierService.validateWarehouseGoodsV2ByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: {
                draftID: data.draftId,
                warehouseId: data.warehouseId,
                transitWarehouseId: data.transitWarehouseId ?? null,
              },
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });

          const datesText =
            data.dateType === 'CUSTOM_DATES_SINGLE' && data.customDates?.length
              ? `с ${new Date(data.customDates[0]).toLocaleDateString('ru-RU')} по ${new Date(data.customDates[data.customDates.length - 1]).toLocaleDateString('ru-RU')} (первая свободная дата)`
              : data.dateType === 'CUSTOM_DATES' && data.customDates?.length
                ? data.customDates
                    .map((d) => new Date(d).toLocaleDateString('ru-RU'))
                    .join(', ')
                : data.dateType === 'CUSTOM_PERIOD'
                  ? `с ${data.startDate ? new Date(data.startDate).toLocaleDateString('ru-RU') : '?'} по ${data.endDate ? new Date(data.endDate).toLocaleDateString('ru-RU') : '?'}`
                  : data.startDate
                    ? new Date(data.startDate).toLocaleDateString('ru-RU')
                    : 'не указаны';

          return {
            ready: true,
            summary: {
              supplyType:
                data.supplyType === 'BOX'
                  ? 'Короба'
                  : data.supplyType === 'MONOPALLETE'
                    ? 'Монопаллеты'
                    : 'Суперсейф',
              dates: datesText,
              maxCoefficient: data.maxCoefficient,
              monopalletCount: data.monopalletCount,
            },
            validation: {
              valid: validation.result?.valid ?? true,
              errors:
                validation.result?.errors?.map((e: any) => e.message) || [],
            },
          };
        });
      }),
    }),

    createAutobooking: tool({
      description: `Create a new autobooking for the user's selected account.
Call this ONLY after the user has explicitly confirmed all parameters (e.g. replied "да", "создай", or picked an option).
Use warehouseId = origid of the warehouse.
Date behaviour:
- For WEEK or MONTH: provide startDate.
- For CUSTOM_PERIOD: provide startDate and endDate.
- For CUSTOM_DATES: provide customDates array.
- For CUSTOM_DATES_SINGLE: if the user gives a range like "с 25 по 30", generate ALL dates in that range as customDates. The monitoring system will book the first available date and stop.
Supply types: Короба = BOX, Монопаллеты = MONOPALLETE, Суперсейф = SUPERSAFE.
Optional: transitWarehouseId, maxCoefficient (default 0, 0 means only free slots), monopalletCount.
If draftId is missing, the tool will look at the last 50 drafts. If there is exactly one draft, it is used automatically. If there are multiple drafts but one is a clear match for the user's hint, the tool returns that single draft as a pre-selected bestMatch. In that case, present the COMPLETE summary of all parameters (warehouse, supply type, dates, draft) and ask for final confirmation like "Всё верно? Создаём автобронирование?". If there is no clear match, a numbered list of options is returned for the user to choose from.`,
      inputSchema: z
        .object({
          warehouseId: z.number().int(),
          transitWarehouseId: z.number().int().optional().nullable(),
          supplyType: supplyTypeEnum,
          dateType: dateTypeEnum,
          startDate: z.string().datetime().optional().nullable(),
          endDate: z.string().datetime().optional().nullable(),
          customDates: z.array(z.string().datetime()).optional(),
          maxCoefficient: z.number().default(0),
          monopalletCount: z.number().int().min(1).optional().nullable(),
          draftId: z.string().optional(),
          userHint: z.string().optional(),
        })
        .refine(baseDateRefine, baseDateMessage)
        .refine(
          (data) => {
            if (data.supplyType === 'MONOPALLETE') {
              return (
                typeof data.monopalletCount === 'number' &&
                data.monopalletCount >= 1
              );
            }
            return true;
          },
          {
            message:
              'monopalletCount is required (minimum 1) when supplyType is MONOPALLETE',
          },
        ),
      execute: safeTool('createAutobooking', async (data) => {
        return loggedTool('createAutobooking', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          let draftId = data.draftId;

          if (!draftId) {
            const draftsRes: any = await wbSupplierService.listDraftsByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: { limit: 50, offset: 0 },
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
            const drafts = draftsRes.result?.drafts || [];
            if (drafts.length === 0) {
              return {
                success: false,
                error:
                  'Черновики не найдены. Сначала создайте черновик поставки в личном кабинете Wildberries.',
              };
            }
            if (drafts.length === 1) {
              draftId = drafts[0].ID;
            } else {
              // Try to find a best match based on user hint if any
              const best = findBestDraftMatch(drafts, data.userHint as string);

              // If high-confidence match found, present ONLY that draft as a single option
              if (best.match && best.confidence === 'high') {
                const singleOption = formatDraftOption(0, best.match);

                if (conversationId) {
                  await createPendingAction(
                    conversationId,
                    'autobooking_draft_choice',
                    [singleOption],
                    {
                      warehouseId: data.warehouseId,
                      transitWarehouseId: data.transitWarehouseId,
                      supplyType: data.supplyType,
                      dateType: data.dateType,
                      startDate: data.startDate,
                      endDate: data.endDate,
                      customDates: data.customDates,
                      maxCoefficient: data.maxCoefficient,
                      monopalletCount: data.monopalletCount,
                    },
                  );
                }

                return {
                  success: false,
                  needsChoice: true,
                  choiceType: 'draft',
                  bestMatch: { number: 1, ...singleOption },
                  options: [singleOption],
                  message: `Найден черновик — ${singleOption.label}. Это правильный черновик? Ответьте "да" или номер 1.`,
                };
              }

              // No clear match — present all drafts
              const options: PendingOption[] = drafts.map((d: any, i: number) =>
                formatDraftOption(i, d),
              );

              if (conversationId) {
                await createPendingAction(
                  conversationId,
                  'autobooking_draft_choice',
                  options,
                  {
                    warehouseId: data.warehouseId,
                    transitWarehouseId: data.transitWarehouseId,
                    supplyType: data.supplyType,
                    dateType: data.dateType,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    customDates: data.customDates,
                    maxCoefficient: data.maxCoefficient,
                    monopalletCount: data.monopalletCount,
                  },
                );
              }

              return {
                success: false,
                needsChoice: true,
                choiceType: 'draft',
                bestMatch: null,
                options,
                message:
                  'Найдено несколько черновиков. Выберите нужный, отправив номер (например, 1).',
              };
            }
          }

          const payload: any = {
            accountId: ctx.accountId,
            draftId,
            warehouseId: data.warehouseId,
            transitWarehouseId: data.transitWarehouseId ?? null,
            supplyType: data.supplyType,
            dateType: data.dateType,
            maxCoefficient: data.maxCoefficient,
            monopalletCount: data.monopalletCount ?? null,
          };
          if (data.startDate) payload.startDate = new Date(data.startDate);
          if (data.endDate) payload.endDate = new Date(data.endDate);
          if (data.customDates)
            payload.customDates = data.customDates.map((d) => new Date(d));

          return autobookingService.createAutobooking(userId, payload);
        });
      }),
    }),

    updateAutobooking: tool({
      description: `Update an existing autobooking that is ACTIVE, ERROR, or ARCHIVED.
Do NOT call this for COMPLETED автоброни.
Call this when the user asks to change, update, or modify their автобронь.
If the user only mentions "change warehouse", "change dates", or "change coefficient", pass ONLY those fields.
Required: id.
Optional: warehouseId, transitWarehouseId, supplyType, dateType, startDate, endDate, customDates, maxCoefficient, monopalletCount.
Supply types: Короба = BOX, Монопаллеты = MONOPALLETE, Суперсейф = SUPERSAFE.`,
      inputSchema: z
        .object({
          id: z.string().uuid(),
          warehouseId: z.number().int().optional(),
          transitWarehouseId: z.number().int().optional().nullable(),
          supplyType: supplyTypeEnum.optional(),
          dateType: dateTypeEnum.optional(),
          startDate: z.string().datetime().optional().nullable(),
          endDate: z.string().datetime().optional().nullable(),
          customDates: z.array(z.string().datetime()).optional(),
          maxCoefficient: z.number().optional(),
          monopalletCount: z.number().int().min(1).optional().nullable(),
        })
        .refine((data) => {
          if (!data.dateType) return true;
          return baseDateRefine(data);
        }, baseDateMessage)
        .refine(
          (data) => {
            if (data.supplyType === 'MONOPALLETE') {
              return (
                typeof data.monopalletCount === 'number' &&
                data.monopalletCount >= 1
              );
            }
            return true;
          },
          {
            message:
              'monopalletCount is required (minimum 1) when supplyType is MONOPALLETE',
          },
        ),
      execute: safeTool('updateAutobooking', async (data) => {
        return loggedTool('updateAutobooking', userId, async () => {
          const payload: any = { ...data };
          if (data.startDate) payload.startDate = new Date(data.startDate);
          if (data.endDate) payload.endDate = new Date(data.endDate);
          if (data.customDates)
            payload.customDates = data.customDates.map((d) => new Date(d));
          return autobookingService.updateAutobooking(userId, payload);
        });
      }),
    }),

    deleteAutobooking: tool({
      description: `Delete an autobooking (автобронь / автобукинг) permanently. Credits are returned unless the автобронь is COMPLETED.
Only call this after the user has explicitly confirmed deletion.
Call this when the user asks to delete, remove, or cancel their автобронь.
Required: autobookingId, confirm (must be true).`,
      inputSchema: z.object({
        autobookingId: z.string().uuid(),
        confirm: z.literal(true),
      }),
      execute: safeTool(
        'deleteAutobooking',
        async ({ autobookingId, confirm }) => {
          if (!confirm) throw new Error('Deletion not confirmed');
          return loggedTool('deleteAutobooking', userId, async () => {
            return autobookingService.deleteAutobooking(userId, autobookingId);
          });
        },
      ),
    }),
  };
}
