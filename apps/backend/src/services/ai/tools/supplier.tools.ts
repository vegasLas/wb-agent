import { tool, Tool } from 'ai';
import { z } from 'zod';
import { wbSupplierService } from '@/services/external/wb/wb-supplier.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';
import { resolveAccountContext } from './account-context.utils';

export function supplierTools(userId: number): Record<string, Tool> {
  return {
    listSupplierGoods: tool({
      description: `List goods or черновики for the user's selected account.
Call this when the user asks about their products, черновики inventory, or goods ready for supply.
Required: type ('active' for goods in a черновик, 'drafts' for черновик list).
Optional: draftID (required when type='active'), limit (default 10), offset (default 0), search.`,
      inputSchema: z
        .object({
          type: z.enum(['active', 'drafts']),
          draftID: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(10),
          offset: z.number().int().min(0).default(0),
          search: z.string().optional(),
        })
        .refine((data) => {
          if (data.type === 'active') return !!data.draftID;
          return true;
        }, { message: 'draftID is required when type is active.' }),
      execute: safeTool('listSupplierGoods', async (data) => {
        return loggedTool('listSupplierGoods', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          if (data.type === 'drafts') {
            return cachedExecute(`drafts-${ctx.accountId}`, 30000, async () => {
              return wbSupplierService.listDraftsByAccount({
                accountId: ctx.accountId,
                supplierId: ctx.supplierId,
                params: { limit: data.limit, offset: data.offset },
                userAgent: ctx.userAgent,
                proxy: ctx.proxy,
              });
            });
          }
          return cachedExecute(`goods-${ctx.accountId}-${data.draftID}`, 30000, async () => {
            return wbSupplierService.listGoodsByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: {
                draftID: data.draftID!,
                limit: data.limit,
                offset: data.offset,
                search: data.search,
              } as any,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    validateWarehouseGoods: tool({
      description: `Validate whether goods in a черновик can be sent to a specific warehouse (and optional transit warehouse).
Call this before creating a supply if the user is unsure about compatibility.
Required: draftID, warehouseId.
Optional: transitWarehouseId.`,
      inputSchema: z.object({
        draftID: z.string(),
        warehouseId: z.number().int(),
        transitWarehouseId: z.number().int().optional().nullable(),
      }),
      execute: safeTool('validateWarehouseGoods', async (data) => {
        return loggedTool('validateWarehouseGoods', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          return wbSupplierService.validateWarehouseGoodsV2ByAccount({
            accountId: ctx.accountId,
            supplierId: ctx.supplierId,
            params: {
              draftID: data.draftID,
              warehouseId: data.warehouseId,
              transitWarehouseId: data.transitWarehouseId ?? null,
            } as any,
            userAgent: ctx.userAgent,
            proxy: ctx.proxy,
          });
        });
      }),
    }),

    listSupplies: tool({
      description: `List supplies for the user's selected account.
Call this when the user asks about their поставки, deliveries, or supply history.
Required: none.
Optional: statusId, pageNumber (default 1), pageSize (default 10), sortBy, sortDirection ('asc' | 'desc').`,
      inputSchema: z.object({
        statusId: z.number().int().optional(),
        pageNumber: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).default(10),
        sortBy: z.string().optional(),
        sortDirection: z.enum(['asc', 'desc']).optional(),
      }),
      execute: safeTool('listSupplies', async (data) => {
        return loggedTool('listSupplies', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          return cachedExecute(`supplies-${ctx.accountId}-${data.statusId}`, 30000, async () => {
            return wbSupplierService.listSuppliesByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: {
                statusId: data.statusId ?? 0,
                pageNumber: data.pageNumber,
                pageSize: data.pageSize,
                sortBy: data.sortBy ?? '',
                sortDirection: data.sortDirection ?? 'desc',
              } as any,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    getSupplyDetails: tool({
      description: `Get detailed information about a specific supply.
Call this when the user asks about the contents, status, or goods inside a supply.
Required: supplyID.
Optional: pageNumber (default 1), pageSize (default 10), search, preorderID.`,
      inputSchema: z.object({
        supplyID: z.string(),
        pageNumber: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).default(10),
        search: z.string().optional(),
        preorderID: z.number().int().optional().nullable(),
      }),
      execute: safeTool('getSupplyDetails', async (data) => {
        return loggedTool('getSupplyDetails', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          return cachedExecute(`supply-details-${data.supplyID}`, 30000, async () => {
            return wbSupplierService.getSupplyDetailsByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: {
                supplyID: Number(data.supplyID),
                pageNumber: data.pageNumber,
                pageSize: data.pageSize,
                search: data.search ?? '',
                preorderID: data.preorderID ?? null,
              } as any,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    getBalances: tool({
      description: `Get warehouse balances for the user's selected account.
Call this when the user asks about stock levels, remaining inventory, or balances.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getBalances', async () => {
        return loggedTool('getBalances', userId, async () => {
          const ctx = await resolveAccountContext(userId);
          return cachedExecute(`balances-${ctx.accountId}`, 30000, async () => {
            return wbSupplierService.getBalancesByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              params: { limit: 100, offset: 0 } as any,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),
  };
}
