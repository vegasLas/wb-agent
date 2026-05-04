/**
 * Warehouse Suggestions Composable
 * Simplified version — shows sales volume by warehouse with top selling items.
 * Stock-based recommendations removed because stock data is not available
 * from the official WB Statistics API.
 */

import { computed } from 'vue';
import { useReportStore } from '@/stores/reports';
import type {
  ReportItem,
  WarehouseSuggestion,
  WarehouseSuggestionItem,
} from '@/types';

// Default threshold
const DEFAULT_MIN_SALES_FOR_VOLUME_ALERT = 10;

export function useWarehouseSuggestions() {
  const reportStore = useReportStore();

  const suggestions = computed((): WarehouseSuggestion[] => {
    if (
      !reportStore.data?.items ||
      reportStore.data.items.length === 0 ||
      !reportStore.itemsByWarehouse ||
      reportStore.itemsByWarehouse.length === 0
    ) {
      return [];
    }

    const { itemsByWarehouse } = reportStore;
    const newSuggestions: WarehouseSuggestion[] = [];

    // Calculate dynamic minimum sales threshold based on average warehouse sales
    const warehouseSalesVolumes = itemsByWarehouse
      .map((w) => w.totalSold)
      .filter((sales) => sales > 0);

    let actualMinSalesForVolume = DEFAULT_MIN_SALES_FOR_VOLUME_ALERT;
    if (warehouseSalesVolumes.length > 0) {
      const averageWarehouseSales =
        warehouseSalesVolumes.reduce((sum, sales) => sum + sales, 0) /
        warehouseSalesVolumes.length;
      actualMinSalesForVolume = Math.max(1, averageWarehouseSales * 0.5);
    }

    for (const warehouseData of itemsByWarehouse) {
      const { warehouse: warehouseName, items: warehouseItems } = warehouseData;

      const totalSalesLast30Days = warehouseItems.reduce(
        (sum, item: ReportItem) => sum + item.purchasedQty,
        0,
      );

      if (totalSalesLast30Days <= actualMinSalesForVolume) {
        continue;
      }

      // Top selling items for this warehouse
      const topSales: WarehouseSuggestionItem[] = [...warehouseItems]
        .filter((item) => item.purchasedQty > 0)
        .sort((a, b) => b.purchasedQty - a.purchasedQty)
        .slice(0, 20)
        .map((item) => ({
          vendorCode: item.vendorCode,
          productName: item.productName,
          purchasedQty: item.purchasedQty,
        }));

      const reason =
        `Склад '${warehouseName}' показывает значительный объем продаж ` +
        `(${totalSalesLast30Days.toLocaleString('ru-RU')} шт. за последние 30 дней). ` +
        `Это ключевой склад для ваших товаров. ` +
        `(Динамический порог объема: ${actualMinSalesForVolume.toFixed(1)})`;

      newSuggestions.push({
        warehouseName,
        reason,
        priority: 'high',
        relevantItems: topSales,
      });
    }

    return newSuggestions;
  });

  return {
    suggestions,
  };
}
