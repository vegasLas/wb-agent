import { tool, Tool } from 'ai';
import { z } from 'zod';
import { autobookingService } from '@/services/domain/autobooking/autobooking.service';
import { wbSupplierService } from '@/services/external/wb/wb-supplier.service';
import { safeTool, loggedTool } from './safe-tool.utils';
import { resolveAccountContext } from './account-context.utils';

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

export function autobookingTools(userId: number): Record<string, Tool> {
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

    createAutobooking: tool({
      description: `Create a new autobooking (автобронь / автобукинг / бронь) for the user's selected account.
Call this when the user asks to create an автобронь, автобукинг, or бронь.
The tool resolves the account and черновик internally. If multiple черновики exist, it returns the черновик list so the user can pick one.
Required: warehouseId, supplyType, dateType.
Date requirements depend on dateType:
- For WEEK or MONTH ("на неделю" / "на месяц"): startDate is required.
- For CUSTOM_PERIOD ("свой период" / "диапазон"): startDate and endDate are required.
- For CUSTOM_DATES ("выбрать даты" / "несколько дат"): customDates array is required.
- For CUSTOM_DATES_SINGLE ("одна дата" / "только одна"): customDates array with 1 item.
supplyType mapping: "Короба" = BOX, "Монопаллеты" = MONOPALLETE (requires monopalletCount), "Суперсейф" = SUPERSAFE.
Optional: transitWarehouseId, maxCoefficient (default 0, 0 means only free slots), monopalletCount, draftId (auto-detected if only one черновик exists).`,
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
              params: { limit: 10, offset: 0 },
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
            const drafts = draftsRes.result?.drafts || [];
            if (drafts.length === 0) {
              return {
                success: false,
                error:
                  'No drafts found for the selected account. Create a draft in WB first.',
              };
            }
            if (drafts.length === 1) {
              draftId = drafts[0].ID;
            } else {
              return {
                success: false,
                error: 'Multiple drafts found. Please provide a draftId.',
                drafts: drafts.map((d: any) => ({
                  id: d.ID,
                  goodQuantity: d.goodQuantity,
                  barcodeQuantity: d.barcodeQuantity,
                  createdAt: d.createdAt,
                })),
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
      description: `Update an existing autobooking (автобронь / автобукинг) that is ACTIVE, ERROR, or ARCHIVED.
Do NOT call this for COMPLETED автоброни.
Call this when the user asks to change, update, or modify their автобронь.
If the user only mentions "change warehouse" (сменить склад), "change dates" (сменить даты), or "change coefficient" (сменить коэффициент), pass ONLY those fields.
Required: id.
Optional: warehouseId, transitWarehouseId, supplyType, dateType, startDate, endDate, customDates, maxCoefficient, monopalletCount.
supplyType mapping: "Короба" = BOX, "Монопаллеты" = MONOPALLETE (requires monopalletCount), "Суперсейф" = SUPERSAFE.`,
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
