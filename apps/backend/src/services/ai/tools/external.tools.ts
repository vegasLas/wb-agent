import { tool, Tool } from 'ai';
import { z } from 'zod';
import { wbWarehouseService } from '@/services/external/wb/wb-warehouse.service';
import { triggerService } from '@/services/external/wb/trigger.service';
import { freeWarehouseService } from '@/services/external/wb/free-warehouse.service';
import { closeApiService } from '@/services/external/wb/close-api.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';
import { resolveAccountContext } from './account-context.utils';

export function externalTools(userId: number): Record<string, Tool> {
  return {
    getAllWarehouses: tool({
      description: `Get all warehouses for the user's selected account from the WB seller API.
Call this when the user needs the full warehouse list tied to their account or when resolving warehouse names to IDs.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getAllWarehouses', async () => {
        return loggedTool('getAllWarehouses', userId, async () => {
          return cachedExecute('all-warehouses', 30000, async () => {
            const ctx = await resolveAccountContext(userId);
            return wbWarehouseService.getAllWarehousesByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    getCoefficients: tool({
      description: `Get current acceptance coefficients for given warehouse IDs from the public WB API.
Call this when the user asks about coefficients, prices, or acceptance costs.
Required: none.
Optional: warehouseIds (array of numbers). If omitted, returns coefficients for all warehouses.`,
      inputSchema: z.object({
        warehouseIds: z.array(z.number().int()).optional(),
      }),
      execute: safeTool('getCoefficients', async ({ warehouseIds }) => {
        return loggedTool('getCoefficients', userId, async () => {
          return cachedExecute(`coefficients-${warehouseIds?.join(',') || 'all'}`, 30000, async () => {
            const ids = warehouseIds?.join(',');
            return triggerService.getCoefficients(ids);
          });
        });
      }),
    }),

    getWarehouseTransitions: tool({
      description: `Get available transit warehouses and tariffs for a specific warehouse.
Call this when the user asks about transit delivery or moving goods through another warehouse.
Required: warehouseId (number).`,
      inputSchema: z.object({
        warehouseId: z.number().int(),
      }),
      execute: safeTool('getWarehouseTransitions', async ({ warehouseId }) => {
        return loggedTool('getWarehouseTransitions', userId, async () => {
          return cachedExecute(`transitions-${warehouseId}`, 30000, async () => {
            const ctx = await resolveAccountContext(userId);
            return wbWarehouseService.getTransitionsByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              warehouseId,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    getAcceptanceCoefficients: tool({
      description: `Get acceptance coefficient report for the next 14-28 day window from the WB supplier API.
Call this when the user asks about planned acceptance coefficients for their account.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getAcceptanceCoefficients', async () => {
        return loggedTool('getAcceptanceCoefficients', userId, async () => {
          return cachedExecute('acceptance-coefficients', 30000, async () => {
            const ctx = await resolveAccountContext(userId);
            return wbWarehouseService.getAcceptanceCoefficientsByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
          });
        });
      }),
    }),

    getWarehouseCacheStatus: tool({
      description: `Internal diagnostics: check the freshness and size of the cached warehouse coefficient data.
Call this only when diagnosing warehouse data issues.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getWarehouseCacheStatus', async () => {
        return loggedTool('getWarehouseCacheStatus', userId, async () => {
          return {
            freeWarehouses: {
              count: freeWarehouseService.getAllCachedWarehouses().length,
              ...freeWarehouseService.getCacheInfo(),
            },
            closeApi: closeApiService.getCacheInfo(),
          };
        });
      }),
    }),
  };
}
