/**
 * Warehouse Suggestions Composable
 * Advanced algorithm with dynamic thresholds
 * Migrated from deprecated project composables/useWarehouseSuggestions.ts
 */

import { computed } from 'vue';
import { useReportStore } from '@/stores/reports';
import type {
  ReportItem,
  WarehouseSuggestion,
  WarehouseSuggestionItem,
} from '@/types';

// Default thresholds (will be dynamically adjusted based on data)
const DEFAULT_MIN_SALES_FOR_VOLUME_ALERT = 10;
const DEFAULT_MIN_SALES_VELOCITY_FOR_TURNOVER_ALERT = 0.2;
const DEFAULT_HIGH_TURNOVER_STOCK_DAYS_THRESHOLD = 7;

// Recommendation parameters
const HIGH_TURNOVER_RECOMMENDATION_DAYS = 30; // Target days of stock for high turnover items
const MIN_SALES_FOR_RECOMMENDATION = 1; // Minimum sales required to recommend additional stock

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

    const { items } = reportStore.data;
    const { itemsByWarehouse } = reportStore;
    const newSuggestions: WarehouseSuggestion[] = [];

    // --- Dynamic Threshold Calculations ---
    let actualMinSalesForVolume = DEFAULT_MIN_SALES_FOR_VOLUME_ALERT;
    let actualMinSalesVelocity = DEFAULT_MIN_SALES_VELOCITY_FOR_TURNOVER_ALERT;
    let actualHighTurnoverStockDays =
      DEFAULT_HIGH_TURNOVER_STOCK_DAYS_THRESHOLD;

    // Calculate dynamicMinSalesForVolumeAlert based on average warehouse sales
    const warehouseSalesVolumes = itemsByWarehouse
      .map(
        (warehouseData: {
          warehouse: string;
          items: ReportItem[];
          totalSold: number;
        }) => warehouseData.totalSold,
      )
      .filter((sales: number) => sales > 0);

    if (warehouseSalesVolumes.length > 0) {
      const averageWarehouseSales =
        warehouseSalesVolumes.reduce(
          (sum: number, sales: number) => sum + sales,
          0,
        ) / warehouseSalesVolumes.length;
      actualMinSalesForVolume = Math.max(1, averageWarehouseSales * 0.5);
    }

    // Calculate dynamicMinSalesVelocityForTurnoverAlert based on average item velocity
    const itemDailySalesVelocities = items
      .filter((item) => item.purchasedQty > 0)
      .map((item) => item.purchasedQty / 30);

    if (itemDailySalesVelocities.length > 0) {
      const averageItemDailySales =
        itemDailySalesVelocities.reduce((sum, velocity) => sum + velocity, 0) /
        itemDailySalesVelocities.length;
      actualMinSalesVelocity = Math.max(0.01, averageItemDailySales * 0.25);
    }

    // Calculate dynamicHighTurnoverStockDaysThreshold based on 25th percentile
    const daysOfStockValues = items
      .filter((item) => item.purchasedQty > 0 && item.stockQty > 0)
      .map((item) => {
        const dailySales = item.purchasedQty / 30;
        return item.stockQty / dailySales;
      })
      .filter((dos) => Number.isFinite(dos) && dos >= 0)
      .sort((a, b) => a - b);

    if (daysOfStockValues.length >= 4) {
      actualHighTurnoverStockDays = Math.max(
        1,
        daysOfStockValues[Math.floor(daysOfStockValues.length * 0.25)],
      );
    }
    // --- End Dynamic Threshold Calculations ---

    for (const warehouseData of itemsByWarehouse) {
      const { warehouse: warehouseName, items: warehouseItems } = warehouseData;

      const reasonsForThisWarehouse: string[] = [];
      const collectedRelevantItems: WarehouseSuggestionItem[] = [];
      let highestPriorityForThisWarehouse:
        | 'high'
        | 'medium'
        | 'low'
        | undefined = undefined;

      const updatePriority = (newPriority: 'high' | 'medium' | 'low') => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (
          highestPriorityForThisWarehouse === undefined ||
          priorityOrder[newPriority] <
            priorityOrder[highestPriorityForThisWarehouse]
        ) {
          highestPriorityForThisWarehouse = newPriority;
        }
      };

      let totalSalesLast30Days = 0;
      const highTurnoverItemsForWarehouse: WarehouseSuggestionItem[] = [];
      const itemsToSuggestUnloading: WarehouseSuggestionItem[] = [];

      // First pass: analyze items and identify high turnover items
      warehouseItems.forEach((item: ReportItem) => {
        totalSalesLast30Days += item.purchasedQty;
        const dailySales = item.purchasedQty / 30;
        const currentDaysOfStock =
          dailySales > 0 ? item.stockQty / dailySales : Infinity;

        // Check for High Turnover (needs replenishment)
        if (
          item.stockQty > 0 &&
          dailySales > actualMinSalesVelocity &&
          currentDaysOfStock < actualHighTurnoverStockDays
        ) {
          // Calculate recommended additional units for high turnover items
          let recommendedAdditionalUnits = 0;
          if (dailySales > MIN_SALES_FOR_RECOMMENDATION) {
            const targetStock = Math.ceil(
              dailySales * HIGH_TURNOVER_RECOMMENDATION_DAYS,
            );
            recommendedAdditionalUnits = Math.max(
              0,
              targetStock - item.stockQty,
            );
          }

          highTurnoverItemsForWarehouse.push({
            vendorCode: item.vendorCode,
            productName: item.productName,
            stockQty: item.stockQty,
            purchasedQty: item.purchasedQty,
            calculatedDaysOfStock: currentDaysOfStock,
            suggestedUnloadQty:
              recommendedAdditionalUnits > 0
                ? recommendedAdditionalUnits * 2
                : undefined,
            isReplenishment: recommendedAdditionalUnits > 0,
          });
        }
      });

      // Rule 1: Sales Volume by Warehouse
      if (totalSalesLast30Days > actualMinSalesForVolume) {
        let currentReason = `Склад '${warehouseName}' показывает значительный объем продаж (${totalSalesLast30Days.toLocaleString('ru-RU')} шт. за последние 30 дней). Это ключевой склад для ваших товаров. Обеспечьте достаточное наличие товаров для поддержания спроса. (Динамический порог объема: ${actualMinSalesForVolume.toFixed(1)})`;
        updatePriority('high');

        // Enrich top selling items with unload info if present
        const topSalesEnriched: WarehouseSuggestionItem[] = [...warehouseItems]
          .filter((item) => item.purchasedQty > 0)
          .sort((a, b) => b.purchasedQty - a.purchasedQty)
          .map((item) => {
            const matchingTurnoverItem = highTurnoverItemsForWarehouse.find(
              (ht) => ht.vendorCode === item.vendorCode,
            );

            if (
              matchingTurnoverItem &&
              matchingTurnoverItem.suggestedUnloadQty &&
              matchingTurnoverItem.suggestedUnloadQty > 0
            ) {
              // This is a high turnover item that needs more stock
              return matchingTurnoverItem;
            } else {
              // This item is a top seller but not in high turnover list
              const dailySales = item.purchasedQty / 30;
              const calculatedDaysOfStock =
                dailySales > 0 ? item.stockQty / dailySales : Infinity;

              // Calculate if we need to recommend additional stock
              let recommendedAdditionalUnits = 0;
              let isReplenishment = false;
              if (
                dailySales > MIN_SALES_FOR_RECOMMENDATION &&
                calculatedDaysOfStock < HIGH_TURNOVER_RECOMMENDATION_DAYS
              ) {
                const targetStock = Math.ceil(
                  dailySales * HIGH_TURNOVER_RECOMMENDATION_DAYS,
                );
                recommendedAdditionalUnits = Math.max(
                  0,
                  targetStock - item.stockQty,
                );
                isReplenishment = recommendedAdditionalUnits > 0;
              }

              return {
                vendorCode: item.vendorCode,
                productName: item.productName,
                stockQty: item.stockQty,
                purchasedQty: item.purchasedQty,
                calculatedDaysOfStock: calculatedDaysOfStock,
                suggestedUnloadQty:
                  recommendedAdditionalUnits > 0
                    ? recommendedAdditionalUnits
                    : undefined,
                isReplenishment:
                  recommendedAdditionalUnits > 0 ? isReplenishment : undefined,
              };
            }
          });

        collectedRelevantItems.push(...topSalesEnriched);

        // If there are items to unload in this high-volume warehouse, augment reason
        if (itemsToSuggestUnloading.length > 0) {
          const unloadReasonPart = `Дополнительно, на этом складе выявлены товары (${itemsToSuggestUnloading.length} SKU), рекомендуемые к выгрузке для оптимизации запасов.`;
          currentReason += ` \n\n---\n\n ${unloadReasonPart}`;

          // Add unloadable items that are NOT ALREADY IN topSalesEnriched by vendorCode
          const topSalesVendorCodes = new Set(
            topSalesEnriched.map((i) => i.vendorCode),
          );
          const additionalUnloadItems = itemsToSuggestUnloading
            .filter((ulItem) => !topSalesVendorCodes.has(ulItem.vendorCode))
            .sort(
              (a, b) =>
                (b.suggestedUnloadQty ?? 0) - (a.suggestedUnloadQty ?? 0),
            );

          collectedRelevantItems.push(...additionalUnloadItems);
        }
        reasonsForThisWarehouse.push(currentReason);
      }

      // Rule 2: Stock Turnover Rate
      if (highTurnoverItemsForWarehouse.length > 0) {
        const reason = `На складе '${warehouseName}' товары (${highTurnoverItemsForWarehouse.length} SKU) быстро распродаются (запас менее чем на ${actualHighTurnoverStockDays.toFixed(0)} дней). Это указывает на высокий спрос и эффективное управление запасами. Рассмотрите своевременное пополнение для этих позиций. (Динамический порог оборачиваемости: <${actualHighTurnoverStockDays.toFixed(0)} дн., мин. скорость продаж: ${actualMinSalesVelocity.toFixed(2)}/дн.)`;
        reasonsForThisWarehouse.push(reason);
        updatePriority('medium');

        const sortedTurnoverItems = highTurnoverItemsForWarehouse.sort(
          (a, b) =>
            (a.calculatedDaysOfStock ?? Infinity) -
            (b.calculatedDaysOfStock ?? Infinity),
        );
        collectedRelevantItems.push(...sortedTurnoverItems);
      }

      if (
        reasonsForThisWarehouse.length > 0 &&
        highestPriorityForThisWarehouse
      ) {
        // Deduplicate items by vendorCode
        const uniqueItemSKUs = new Set<string>();
        const deduplicatedRelevantItems = collectedRelevantItems.filter(
          (item) => {
            const key = String(item.vendorCode);
            if (key === 'undefined' || key === 'null' || key === '') {
              return true; // Keep items without a valid SKU, treat as unique
            }
            if (!uniqueItemSKUs.has(key)) {
              uniqueItemSKUs.add(key);
              return true;
            }
            return false;
          },
        );

        newSuggestions.push({
          warehouseName,
          reason: reasonsForThisWarehouse.join(' \n\n---\n\n '),
          priority: highestPriorityForThisWarehouse,
          relevantItems: deduplicatedRelevantItems.slice(0, 20), // Limit to top 20 items
        });
      }
    }

    // Sort suggestions by priority (high -> medium -> low)
    newSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return newSuggestions;
  });

  return {
    suggestions,
  };
}
