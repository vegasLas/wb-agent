import { tool, Tool } from 'ai';
import { z } from 'zod';
import { getSalesReport, getOrdersReport } from '@/services/domain/report/report.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';
import { normalizeWbDate } from './date-normalizer';

export function reportsTools(userId: number): Record<string, Tool> {
  return {
    getSalesReport: tool({
      description: `Get the SALES report (отчет о ПРОДАЖАХ) from the official WB Statistics API.
Shows actual sales and returns — items the buyer has already received or returned.
Optional: dateFrom, dateTo (DD.MM.YY or YYYY-MM-DD format, default last 30 days).
NOTE: first request for a new date range may take 2–5 minutes because the API has a 1 request/minute rate limit. Subsequent calls are instant thanks to caching.

=== RAW UPSTREAM API FIELDS (WB Statistics API GET /api/v1/supplier/sales) ===
Each raw transaction row contains:
- date: Date of the sale/return event (YYYY-MM-DD).
- lastChangeDate: Timestamp of last update in RFC3339 (used for pagination, not shown in report).
- warehouseName: WB warehouse name, e.g. "Коледино", "Подольск".
- warehouseType: Warehouse type, e.g. "СЦ" (sorting center), "СГТ".
- countryName: Delivery country.
- oblastOkrugName: Federal district (федеральный округ).
- regionName: Region (регион).
- supplierArticle: Seller's article / SKU (артикул продавца).
- category: Product category (категория).
- subject: Product subject / type (предмет) — mapped to productName in report.
- brand: Brand name (бренд).
- techSize: Size variant (размер).
- isSupply: true if item arrived via supply (поставка).
- isRealization: true if realization sale (реализация).
- isCancel: true if the sale was cancelled or returned (отмена/возврат).
- cancelDate: Cancellation date if isCancel is true.
- totalPrice: Original price before any discounts (базовая цена).
- discountPercent: Discount percentage applied by seller (скидка продавца, %).
- spp: SPP — loyalty program discount (скидка постоянного покупателя, %).
- finishedPrice: Final price the buyer actually paid (итоговая цена).
- priceWithDisc: Price after seller discount (цена со скидкой).
- forPay: Amount to be paid to seller after WB commission (к перечислению).

=== AGGREGATED REPORT FIELDS (what you actually receive) ===
parsedData.items is an array where each element is one product+warehouse aggregation:
- vendorCode: Seller's article (артикул) = upstream supplierArticle.
- productName: Product name (название) = upstream subject.
- brand: Brand (бренд).
- category: Category (категория).
- warehouse: Warehouse name (склад) = upstream warehouseName, converted to Russian.
- size: Size variant (размер).
- orderedQty: Total count of all sale/return rows for this product+warehouse (всего транзакций).
- orderedSum: Sum of finishedPrice for all rows (общая сумма заказов, ₽).
- purchasedQty: Count of non-cancelled sales (фактически продано шт.).
- purchasedSum: Sum of forPay for non-cancelled sales (выручка к перечислению, ₽).

Use purchasedQty / purchasedSum for actual revenue. Use orderedQty / orderedSum to see total demand including returns.`,
      inputSchema: z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
      execute: safeTool('getSalesReport', async ({ dateFrom, dateTo }) => {
        const normalizedFrom = normalizeWbDate(dateFrom);
        const normalizedTo = normalizeWbDate(dateTo);
        const cacheKey = `ai:tool:reports:sales:${userId}:${normalizedFrom}:${normalizedTo}`;
        return loggedTool('getSalesReport', userId, async () => {
          return cachedExecute(cacheKey, 30 * 60 * 1000, () =>
            getSalesReport({
              userId,
              dateFrom: normalizedFrom,
              dateTo: normalizedTo,
            }),
          );
        });
      }),
    }),

    getOrdersReport: tool({
      description: `Get the ORDERS report (отчет о ЗАКАЗАХ) from the official WB Statistics API.
Shows all orders placed by buyers, INCLUDING cancelled orders. Use this when the user asks about orders, заказы, or cancellation rates.
Optional: dateFrom, dateTo (DD.MM.YY or YYYY-MM-DD format, default last 30 days).
NOTE: first request for a new date range may take 2–5 minutes because the API has a 1 request/minute rate limit. Subsequent calls are instant thanks to caching.

=== RAW UPSTREAM API FIELDS (WB Statistics API GET /api/v1/supplier/orders) ===
Each raw order row contains:
- date: Order creation date (YYYY-MM-DD).
- lastChangeDate: Timestamp of last update in RFC3339 (used for pagination, not shown in report).
- warehouseName: WB warehouse name, e.g. "Коледино", "Подольск".
- warehouseType: Warehouse type, e.g. "СЦ" (sorting center), "СГТ".
- countryName: Delivery country.
- oblastOkrugName: Federal district (федеральный округ).
- regionName: Region (регион).
- supplierArticle: Seller's article / SKU (артикул продавца).
- category: Product category (категория).
- subject: Product subject / type (предмет) — mapped to productName in report.
- brand: Brand name (бренд).
- techSize: Size variant (размер).
- isSupply: true if item arrived via supply (поставка).
- isRealization: true if realization (реализация).
- status: Order status. Common values: "new" (новый), "confirm" (подтвержден), "cancel" (отменен), "deliver" (доставка), "delivered" (доставлен). Cancelled orders have status "cancel" or "2".
- totalPrice: Original price before any discounts (базовая цена).
- discountPercent: Discount percentage applied by seller (скидка продавца, %).
- spp: SPP — loyalty program discount (скидка постоянного покупателя, %).
- finishedPrice: Final price the buyer would pay (итоговая цена).
- priceWithDisc: Price after seller discount (цена со скидкой).
- forPay: Amount to be paid to seller after WB commission (к перечислению).

=== AGGREGATED REPORT FIELDS (what you actually receive) ===
parsedData.items is an array where each element is one product+warehouse aggregation:
- vendorCode: Seller's article (артикул) = upstream supplierArticle.
- productName: Product name (название) = upstream subject.
- brand: Brand (бренд).
- category: Category (категория).
- warehouse: Warehouse name (склад) = upstream warehouseName, converted to Russian.
- size: Size variant (размер).
- orderedQty: Total count of all order rows for this product+warehouse (всего заказов шт.).
- orderedSum: Sum of finishedPrice for all rows (общая сумма заказов, ₽).
- cancelledQty: Count of orders where status indicates cancellation (отменено шт.).
- cancelledSum: Sum of finishedPrice for cancelled orders (сумма отмен, ₽).

Use orderedQty / orderedSum to see total buyer demand. Use cancelledQty / cancelledSum to measure cancellation losses.`,
      inputSchema: z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
      execute: safeTool('getOrdersReport', async ({ dateFrom, dateTo }) => {
        const normalizedFrom = normalizeWbDate(dateFrom);
        const normalizedTo = normalizeWbDate(dateTo);
        const cacheKey = `ai:tool:reports:orders:${userId}:${normalizedFrom}:${normalizedTo}`;
        return loggedTool('getOrdersReport', userId, async () => {
          return cachedExecute(cacheKey, 30 * 60 * 1000, () =>
            getOrdersReport({
              userId,
              dateFrom: normalizedFrom,
              dateTo: normalizedTo,
            }),
          );
        });
      }),
    }),
  };
}
