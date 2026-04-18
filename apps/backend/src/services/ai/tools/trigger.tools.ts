import { tool, Tool } from 'ai';
import { z } from 'zod';
import { triggerService } from '@/services/external/wb/trigger.service';
import { safeTool, loggedTool } from './safe-tool.utils';

const searchModeEnum = z.enum(['TODAY', 'TOMORROW', 'WEEK', 'UNTIL_FOUND', 'CUSTOM_DATES', 'RANGE']);

export function triggerTools(userId: number): Record<string, Tool> {
  return {
    listTriggers: tool({
      description: `List the user's supply triggers (time slots / таймслоты / триггеры).
Call this when the user asks about their triggers or time slots.
Required: none.
Optional: status ('RELEVANT' | 'COMPLETED' | 'EXPIRED'). Also returns the active trigger count in the result.
User synonyms: таймслот, триггер, слот, time slot.`,
      inputSchema: z.object({
        status: z.enum(['RELEVANT', 'COMPLETED', 'EXPIRED']).optional(),
      }),
      execute: safeTool('listTriggers', async ({ status }) => {
        return loggedTool('listTriggers', userId, async () => {
          const [list, activeCount] = await Promise.all([
            triggerService.getUserTriggers(userId),
            triggerService.getActiveTriggersCount(userId),
          ]);
          const filtered = status ? list.filter((t: any) => t.status === status) : list;
          return { items: filtered, activeCount, total: list.length };
        });
      }),
    }),

    getTrigger: tool({
      description: `Get a single trigger by its ID.
Call this when the user refers to a specific trigger and you need full details.
Required: triggerId.`,
      inputSchema: z.object({
        triggerId: z.string().uuid(),
      }),
      execute: safeTool('getTrigger', async ({ triggerId }) => {
        return loggedTool('getTrigger', userId, async () => {
          return triggerService.getTrigger(userId, triggerId);
        });
      }),
    }),

    createTrigger: tool({
      description: `Create a new supply trigger (таймслот / триггер / time slot watcher).
Call this when the user wants to watch for available slots at specific warehouses.
Required: warehouseIds (up to 3 numbers), supplyTypes (array of 'BOX', 'MONOPALLETE', 'SUPERSAFE'), maxCoefficient.
Optional: checkInterval (60 | 180 | 360 | 720 | 1440, default 180), searchMode ('TODAY' | 'TOMORROW' | 'WEEK' | 'UNTIL_FOUND' | 'CUSTOM_DATES' | 'RANGE'), startDate, endDate, selectedDates.
User vocabulary mapping:
- supplyTypes: "Короба" = BOX, "Монопаллеты" = MONOPALLETE, "Суперсейф" = SUPERSAFE.
- searchMode: "Сегодня" = TODAY, "Завтра" = TOMORROW, "Неделя" = WEEK, "Искать до нахождения" = UNTIL_FOUND, "Выбрать даты" = CUSTOM_DATES, "Диапазон" = RANGE.
- checkInterval: "1 час" = 60, "3 часа" = 180, "6 часов" = 360, "12 часов" = 720, "24 часа" = 1440.`,
      inputSchema: z.object({
        warehouseIds: z.array(z.number().int()).max(3),
        supplyTypes: z.array(z.enum(['BOX', 'MONOPALLETE', 'SUPERSAFE'])).min(1),
        checkInterval: z.number().int().default(180),
        maxCoefficient: z.number(),
        searchMode: searchModeEnum,
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        selectedDates: z.array(z.string().datetime()).optional(),
      }),
      execute: safeTool('createTrigger', async (data) => {
        return loggedTool('createTrigger', userId, async () => {
          const activeCount = await triggerService.getActiveTriggersCount(userId);
          if (activeCount >= 30) {
            return { success: false, error: 'Достигнут лимит активных таймслотов (30)' };
          }
          const payload: any = {
            warehouseIds: data.warehouseIds,
            supplyTypes: data.supplyTypes,
            checkInterval: data.checkInterval,
            maxCoefficient: data.maxCoefficient,
            searchMode: data.searchMode,
          };
          if (data.startDate) payload.startDate = new Date(data.startDate);
          if (data.endDate) payload.endDate = new Date(data.endDate);
          if (data.selectedDates) payload.selectedDates = data.selectedDates.map((d) => new Date(d));
          return triggerService.createTrigger(userId, payload);
        });
      }),
    }),

    updateTrigger: tool({
      description: `Update a trigger's (таймслот / триггер) warehouses, supply types, active status, max coefficient, or check interval.
Call this when the user asks to change a trigger, enable/disable it (включить/выключить), or modify its settings.
To toggle active status, pass isActive explicitly.
Required: triggerId.
Optional: warehouseIds (up to 3), supplyTypes, isActive, maxCoefficient, checkInterval.
supplyTypes mapping: "Короба" = BOX, "Монопаллеты" = MONOPALLETE, "Суперсейф" = SUPERSAFE.
checkInterval mapping: "1 час" = 60, "3 часа" = 180, "6 часов" = 360, "12 часов" = 720, "24 часа" = 1440.`,
      inputSchema: z.object({
        triggerId: z.string().uuid(),
        warehouseIds: z.array(z.number().int()).max(3).optional(),
        supplyTypes: z.array(z.enum(['BOX', 'MONOPALLETE', 'SUPERSAFE'])).optional(),
        isActive: z.boolean().optional(),
        maxCoefficient: z.number().optional(),
        checkInterval: z.number().int().optional(),
      }),
      execute: safeTool('updateTrigger', async (data) => {
        return loggedTool('updateTrigger', userId, async () => {
          const { triggerId, ...rest } = data;
          return triggerService.updateTrigger(userId, {
            triggerId,
            ...rest,
          } as any);
        });
      }),
    }),

    deleteTrigger: tool({
      description: `Delete a trigger permanently.
Only call this after the user has explicitly confirmed.
Required: triggerId, confirm (must be true).`,
      inputSchema: z.object({
        triggerId: z.string().uuid(),
        confirm: z.literal(true),
      }),
      execute: safeTool('deleteTrigger', async ({ triggerId, confirm }) => {
        if (!confirm) throw new Error('Deletion not confirmed');
        return loggedTool('deleteTrigger', userId, async () => {
          await triggerService.deleteTrigger(userId, triggerId);
          return { success: true, message: 'Trigger deleted' };
        });
      }),
    }),
  };
}
