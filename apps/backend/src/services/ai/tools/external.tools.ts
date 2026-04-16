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
Call this when the user needs the full warehouse list tied to their account or when resolving warehouse names.
Each warehouse has: name, address, rating, and warehouseId. Use warehouseId when calling createAutobooking.
NEVER mention warehouseId or any numeric ID to the user in your response.
DO NOT dump the entire list if there are more than 6 warehouses. Use searchWarehouses instead to let the user search by city/name.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getAllWarehouses', async () => {
        return loggedTool('getAllWarehouses', userId, async () => {
          return cachedExecute('all-warehouses', 30000, async () => {
            const ctx = await resolveAccountContext(userId);
            const res: any = await wbWarehouseService.getAllWarehousesByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
            // Return only user-friendly fields + warehouseId (which is origid internally)
            const warehouses =
              res.result?.resp?.data?.map((w: any) => ({
                name: w.warehouse,
                address: w.address,
                rating: w.rating,
                warehouseId: w.origid,
              })) || [];
            return { warehouses };
          });
        });
      }),
    }),

    searchWarehouses: tool({
      description: `Search warehouses by city or name. Use this INSTEAD of getAllWarehouses when the user needs to pick a warehouse.
Ask the user: "Какой склад вам нужен?" (or let them type the city/name). Then call this tool with their reply.
Returns up to 6 best matches. Rules for the AI:
- 0 matches: say not found and ask again.
- 1 match: use it directly (do NOT ask to confirm with a numbered list).
- 2–6 matches: present as a numbered list (1., 2., etc.) and ask to choose.
- >6 matches: the tool returns the top 6; tell the user these are the best matches and ask them to pick or refine.
Required: query (string).`,
      inputSchema: z.object({ query: z.string() }),
      execute: safeTool('searchWarehouses', async ({ query }) => {
        return loggedTool('searchWarehouses', userId, async () => {
          return cachedExecute(`search-warehouses-${query}`, 30000, async () => {
            const ctx = await resolveAccountContext(userId);
            const res: any = await wbWarehouseService.getAllWarehousesByAccount({
              accountId: ctx.accountId,
              supplierId: ctx.supplierId,
              userAgent: ctx.userAgent,
              proxy: ctx.proxy,
            });
            const all =
              res.result?.resp?.data?.map((w: any) => ({
                name: w.warehouse,
                address: w.address,
                rating: w.rating,
                warehouseId: w.origid,
              })) || [];
            const q = query.toLowerCase();
            const scored = all.map((w: any) => {
              const name = (w.name || '').toLowerCase();
              const addr = (w.address || '').toLowerCase();
              let score = 0;
              if (name === q) score += 100;
              else if (name.startsWith(q)) score += 80;
              else if (name.includes(q)) score += 60;
              if (addr.includes(q)) score += 30;
              return { ...w, score };
            });
            const matches = scored
              .filter((w: any) => w.score > 0)
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 6);
            return { matches, total: all.length };
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
