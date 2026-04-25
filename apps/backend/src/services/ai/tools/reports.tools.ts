import { tool, Tool } from 'ai';
import { z } from 'zod';
import { getSalesReport } from '@/services/domain/report/report.service';
import { safeTool, loggedTool } from './safe-tool.utils';
import { normalizeWbDate } from './date-normalizer';

export function reportsTools(userId: number): Record<string, Tool> {
  return {
    getSalesReport: tool({
      description: `Get the sales report (отчет о продажах) for the user's selected account and supplier.
Call this when the user asks for a sales report, отчет о продажах, or warehouse analytics.
Optional: dateFrom, dateTo (DD.MM.YY or YYYY-MM-DD format, default last 30 days).
Response contains:
- parsedData.items: sales breakdown by product and warehouse.
- Warehouse suggestions with fields:
  - warehouseName = Склад.
  - priority = Приоритет (high/medium/low → Высокий/Средний/Низкий).
  - relevantItems: vendorCode = Товар (Артикул), stockQty = Остаток, purchasedQty = Продано (30д).
  - calculatedDaysOfStock = Запас (дн.).
  - suggestedUnloadQty = recommended quantity, isReplenishment = true means Пополнить, false means Разгрузить.`,
      inputSchema: z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
      execute: safeTool('getSalesReport', async ({ dateFrom, dateTo }) => {
        return loggedTool('getSalesReport', userId, async () => {
          return getSalesReport({
            userId,
            dateFrom: normalizeWbDate(dateFrom),
            dateTo: normalizeWbDate(dateTo),
          });
        });
      }),
    }),
  };
}
