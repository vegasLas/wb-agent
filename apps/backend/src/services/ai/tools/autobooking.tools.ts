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
      description: `Prepare and validate an autobooking before creating it. Use this as the FINAL confirmation step.
Call this ONLY after the user has confirmed all parameters (e.g. replied "да", "создай", or picked an option).
Returns a human-readable summary of what will be created. Present the COMPLETE summary of ALL parameters (склад, тип поставки, даты, черновик) and ask ONE final confirmation: "Вот итоговые параметры автобронирования: ... Всё верно? Создаём?" Only after the user replies "да" or confirms, proceed to createAutobooking.
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

Workflow rules — follow them strictly:
1. PARSE THE ENTIRE REQUEST FIRST: Before asking any questions, analyze the user's message for ALL parameters (warehouse name/city, supply type, dates/period, draft description). If the user already provided any of these, DO NOT ask for them again.
2. ONE QUESTION PER MESSAGE: Ask only ONE question per message. NEVER combine multiple choice lists in a single response.
3. AUTO-CREATE ONLY WHEN READY: If and ONLY if you already have the actual draftId string, warehouseId, supplyType, and dates resolved, you may call prepareAutobooking followed immediately by createAutobooking.
4. Do NOT call createAutobooking unless you actually have the draftId. If you only know the draft description (e.g. "22 товара") but do not have the ID, call createAutobooking with userHint and present the result. Wait for the user's confirmation before creating.
5. No redundant verification: If you have already resolved a parameter, do NOT make additional tool calls to "verify" or "find" it again.
6. Final summary confirmation: When this tool returns a single pre-selected draft (bestMatch), do NOT ask an isolated "Это правильный черновик?" question. Instead, present the COMPLETE summary of ALL parameters (склад, тип поставки, даты, черновик) and ask ONE final confirmation: "Вот итоговые параметры автобронирования: ... Всё верно? Создаём?" Only after the user replies "да" or confirms, proceed to prepareAutobooking → createAutobooking.
7. Single draft confirmation: If the tool returns exactly ONE draft option as a bestMatch, do NOT refer to option numbers the user has never seen.
8. Dates: If the user mentions dates without a month or year (e.g. "с 25 по 30"), always use the current month and year.
9. Date type commitment: If the user has ALREADY selected a date type (e.g. picked "Произвольный период" / CUSTOM_PERIOD, or "На неделю" / WEEK), do NOT ask them again to confirm a different date type.
10. CUSTOM_DATES_SINGLE: Only use this type when the user EXPLICITLY says they want "only one date" or "the first available date" from a range. If the user simply gives a range (e.g. "с 25 по 30") without saying "only one date", and has not already chosen CUSTOM_DATES_SINGLE, use CUSTOM_PERIOD with startDate and endDate.
11. Warehouse selection: NEVER dump the full warehouse list if there are more than 6 warehouses. Ask the user: "Какой склад вам нужен?" and use searchWarehouses with their reply. Only show a numbered list if there are 2–6 matches. If there is exactly 1 match, use it directly.
12. Warehouse ID: Always use the warehouse's origid as warehouseId when calling this tool (not id), but NEVER mention origid to the user.
13. Drafts: When resolving drafts, this tool looks at the last 50 drafts. If the user refers to a specific draft (e.g. "with 22 items"), try to match it by item count. If unsure, present a numbered list and ask the user to choose.
14. No premature validation: Do NOT call validateWarehouseGoods before a draftId is known.
15. Supply type is REQUIRED only if missing: If the user has NOT already stated a supply type in their request, you MUST explicitly ask them to choose one. Do NOT default to Короба or any other type. If they said things like "тип короб", "короба", "монопаллет", or "суперсейф" in their message, map it immediately (короб → BOX, монопаллет → MONOPALLETE, суперсейф → SUPERSAFE) and do NOT ask again.
16. Dates are REQUIRED only if missing: If the user says "с 25 по 30", "с 25.04 по 30.04", "25-30 апреля", or any similar phrase, map it immediately to CUSTOM_PERIOD with the correct startDate and endDate. Do NOT ask "какой тип периода" — they already gave you the range. Only ask about dates if they are completely absent.
17. Supply type labels: When asking the user to choose a supply type, present the options exactly as: 1. Короба, 2. Монопаллеты, 3. Суперсейф.
18. Optional params: Before the final summary, ask the user: "Какой максимальный коэффициент приёмки допустим? (0 — только бесплатные слоты, по умолчанию 0)". If the user does not specify, use 0. For Монопаллеты, also ask for the monopallet count.
19. Success message format: After creating an autobooking, summarize the result in plain Russian. Do NOT show the autobooking UUID, the warehouse numeric ID, or the draft UUID. Show only: склад (name), тип поставки, период/даты, количество товаров в черновике (if known), сколько кредитов осталось.

Parameter behaviour:
- Use warehouseId = origid of the warehouse.
- For WEEK or MONTH: provide startDate.
- For CUSTOM_PERIOD: provide startDate and endDate.
- For CUSTOM_DATES: provide customDates array.
- For CUSTOM_DATES_SINGLE: if the user gives a range like "с 25 по 30", generate ALL dates in that range as customDates. The monitoring system will book the first available date and stop.
- Optional: transitWarehouseId, maxCoefficient (default 0, 0 means only free slots), monopalletCount.

If draftId is missing, the tool will look at the last 50 drafts. If there is exactly one draft, it is used automatically. If there are multiple drafts but one is a clear match for the user's hint, the tool returns that single draft as a pre-selected bestMatch. In that case, present the COMPLETE summary of all parameters and ask for final confirmation like "Всё верно? Создаём автобронирование?". If there is no clear match, a numbered list of options is returned for the user to choose from.`,
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
