import { computed } from 'vue';
import { useReportStore } from '../stores/report';
import type {
  ReportItem,
  WarehouseSuggestion,
  WarehouseSuggestionItem,
} from '../types';

// Thresholds for classification
const LOW_STOCK_DAYS_THRESHOLD = 14; // Days of stock considered low
const HIGH_STOCK_DAYS_THRESHOLD = 60; // Days of stock considered high
const MIN_SALES_FOR_REPLENISH = 5; // Minimum sales to consider replenishment

// Days of sales history (from report date range)
const SALES_HISTORY_DAYS = 30;

interface GroupedItem {
  vendorCode: string;
  productName: string;
  stockQty: number;
  purchasedQty: number;
  calculatedDaysOfStock: number;
}

export function useWarehouseSuggestions() {
  const reportStore = useReportStore();

  const suggestions = computed((): WarehouseSuggestion[] => {
    if (!reportStore.itemsByWarehouse || reportStore.itemsByWarehouse.length === 0) {
      return [];
    }

    const allSuggestions: WarehouseSuggestion[] = [];

    reportStore.itemsByWarehouse.forEach(({ warehouse, items }) => {
      // Group items by vendorCode (merge sizes)
      const groupedItems = groupItemsByVendorCode(items);

      // Calculate metrics and filter items needing attention
      const relevantItems = groupedItems
        .map((item) => analyzeItem(item))
        .filter((item): item is WarehouseSuggestionItem => item !== null);

      if (relevantItems.length === 0) return;

      // Determine priority based on items
      const priority = determinePriority(relevantItems);

      // Build reason text
      const reason = buildReasonText(relevantItems, priority);

      allSuggestions.push({
        warehouseName: warehouse,
        priority,
        reason,
        relevantItems: relevantItems.slice(0, 10), // Limit to top 10 items
      });
    });

    // Sort suggestions by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    allSuggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return allSuggestions;
  });

  return {
    suggestions,
  };
}

function groupItemsByVendorCode(items: ReportItem[]): GroupedItem[] {
  const grouped = items.reduce(
    (acc: Record<string, GroupedItem>, item) => {
      const key = item.vendorCode;

      if (!acc[key]) {
        acc[key] = {
          vendorCode: item.vendorCode,
          productName: item.productName,
          stockQty: 0,
          purchasedQty: 0,
          calculatedDaysOfStock: 0,
        };
      }

      acc[key].stockQty += item.stockQty || 0;
      acc[key].purchasedQty += item.purchasedQty || 0;

      return acc;
    },
    {} as Record<string, GroupedItem>,
  );

  return Object.values(grouped);
}

function analyzeItem(item: GroupedItem): WarehouseSuggestionItem | null {
  // Calculate daily sales rate
  const dailySalesRate = item.purchasedQty / SALES_HISTORY_DAYS;

  // Calculate days of stock
  const calculatedDaysOfStock =
    dailySalesRate > 0 ? item.stockQty / dailySalesRate : Infinity;

  // Determine if item needs attention
  const needsReplenishment =
    calculatedDaysOfStock < LOW_STOCK_DAYS_THRESHOLD &&
    item.purchasedQty >= MIN_SALES_FOR_REPLENISH;

  const needsUnloading =
    calculatedDaysOfStock > HIGH_STOCK_DAYS_THRESHOLD && item.stockQty > 0;

  if (!needsReplenishment && !needsUnloading) {
    return null;
  }

  // Calculate suggested quantities
  let suggestedUnloadQty = 0;
  let isReplenishment = false;

  if (needsReplenishment) {
    isReplenishment = true;
    // Suggest replenishing to 30 days of stock (double the current)
    const targetStock = dailySalesRate * 30;
    suggestedUnloadQty = Math.ceil(targetStock - item.stockQty);
    if (suggestedUnloadQty < 0) suggestedUnloadQty = 0;
  } else if (needsUnloading) {
    isReplenishment = false;
    // Suggest unloading excess stock down to 45 days
    const targetStock = dailySalesRate * 45;
    suggestedUnloadQty = Math.ceil(item.stockQty - targetStock);
    if (suggestedUnloadQty < 0) suggestedUnloadQty = 0;
  }

  return {
    vendorCode: item.vendorCode,
    productName: item.productName,
    stockQty: item.stockQty,
    purchasedQty: item.purchasedQty,
    calculatedDaysOfStock: isFinite(calculatedDaysOfStock)
      ? calculatedDaysOfStock
      : 999,
    suggestedUnloadQty: suggestedUnloadQty > 0 ? suggestedUnloadQty : undefined,
    isReplenishment,
  };
}

function determinePriority(
  items: WarehouseSuggestionItem[],
): 'high' | 'medium' | 'low' {
  const replenishmentCount = items.filter((i) => i.isReplenishment).length;
  const unloadCount = items.filter((i) => !i.isReplenishment).length;

  // High priority: many items need replenishment (risk of stockout)
  if (replenishmentCount >= 3 || (replenishmentCount > 0 && unloadCount > 5)) {
    return 'high';
  }

  // Medium priority: some items need replenishment or many need unloading
  if (replenishmentCount > 0 || unloadCount >= 5) {
    return 'medium';
  }

  // Low priority: only a few items need unloading
  return 'low';
}

function buildReasonText(
  items: WarehouseSuggestionItem[],
  priority: 'high' | 'medium' | 'low',
): string {
  const replenishmentCount = items.filter((i) => i.isReplenishment).length;
  const unloadCount = items.filter((i) => !i.isReplenishment).length;

  const parts: string[] = [];

  if (replenishmentCount > 0) {
    parts.push(
      `${replenishmentCount} ${pluralize(replenishmentCount, 'товар', 'товара', 'товаров')} требуют пополнения запасов`,
    );
  }

  if (unloadCount > 0) {
    parts.push(
      `${unloadCount} ${pluralize(unloadCount, 'товар', 'товара', 'товаров')} имеют избыточный запас`,
    );
  }

  if (priority === 'high') {
    parts.push('требуется срочное внимание для предотвращения дефицита');
  } else if (priority === 'medium') {
    parts.push('рекомендуется оптимизация запасов');
  } else {
    parts.push('можно оптимизировать при наличии возможности');
  }

  return parts.join(', ') + '.';
}

function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}
