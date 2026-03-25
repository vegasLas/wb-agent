import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reportsAPI } from '../api';
import { useUserStore } from './user';
import type {
  Report,
  ReportParsedData,
  ReportItem,
  ReportRequestParams,
  ReportApiPayload,
} from '../types';

// Helper to convert warehouse names to Russian
const convertWarehouseName = (name: string): string => {
  const warehouseMap: Record<string, string> = {
    'Kazan': 'Казань',
    'Kazan_2': 'Казань 2',
    'Novosibirsk': 'Новосибирск',
    'Novosibirsk_2': 'Новосибирск 2',
    'Omsk': 'Омск',
    'Omsk_2': 'Омск 2',
    'Ekaterinburg': 'Екатеринбург',
    'Ekaterinburg_2': 'Екатеринбург 2',
    'Chekhov': 'Чехов',
    'Chekhov_2': 'Чехов 2',
    'Podolsk': 'Подольск',
    'Podolsk_2': 'Подольск 2',
    'Elektrostal': 'Электросталь',
    'Elektrostal_2': 'Электросталь 2',
    'Krasnodar': 'Краснодар',
    'Krasnodar_2': 'Краснодар 2',
    'Pulkovo': 'Пулково',
    'Pulkovo_2': 'Пулково 2',
    'Koledino': 'Коледино',
    'Koledino_2': 'Коледино 2',
    'Tver': 'Тверь',
    'Tver_2': 'Тверь 2',
    'Belyastok': 'Белая Столб',
    'Belyastok_2': 'Белая Столб 2',
    'Quadrator': 'Квадратор',
    'Quadrator_2': 'Квадратор 2',
    'Shelkovskaya': 'Щелковская',
    'Shelkovskaya_2': 'Щелковская 2',
  };
  return warehouseMap[name] || name;
};

export const useReportStore = defineStore('report', () => {
  const userStore = useUserStore();

  // State - Sales Report
  const data = ref<ReportParsedData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const reportPending = ref(false);
  const estimatedWaitTime = ref<number | null>(null);

  // Legacy booking report state (keep for backward compatibility)
  const report = ref<Report | null>(null);
  const isFetched = ref(false);

  // Getters
  const items = computed(() => data.value?.items || []);
  const meta = computed(() => data.value?.meta || null);

  const itemsByWarehouse = computed(() => {
    if (!data.value?.items) {
      return [];
    }

    // Group items by warehouse (names already converted to Russian)
    const groupedByWarehouse = data.value.items.reduce(
      (acc: Record<string, ReportItem[]>, item: ReportItem) => {
        const warehouse = item.warehouse || 'Unknown Warehouse';
        if (!acc[warehouse]) {
          acc[warehouse] = [];
        }
        acc[warehouse].push(item);
        return acc;
      },
      {} as Record<string, ReportItem[]>,
    );

    // Merge duplicates within each warehouse and calculate total sales
    const warehouseSales = Object.entries(groupedByWarehouse)
      .map(([warehouse, items]) => {
        // Merge duplicate items by vendorCode and size
        const mergedItems = items.reduce(
          (acc: Record<string, ReportItem>, item: ReportItem) => {
            const key = `${item.vendorCode}-${item.size}`;

            if (acc[key]) {
              // Merge quantities for duplicate items
              acc[key] = {
                ...acc[key],
                orderedQty: acc[key].orderedQty + item.orderedQty,
                orderedSum: acc[key].orderedSum + item.orderedSum,
                purchasedQty: acc[key].purchasedQty + item.purchasedQty,
                purchasedSum: acc[key].purchasedSum + item.purchasedSum,
                stockQty: acc[key].stockQty + item.stockQty,
              };
            } else {
              acc[key] = { ...item };
            }

            return acc;
          },
          {} as Record<string, ReportItem>,
        );

        const mergedItemsArray = Object.values(mergedItems);
        const totalSold = mergedItemsArray.reduce(
          (sum, item) => sum + (item.purchasedQty || 0),
          0,
        );

        return { warehouse, items: mergedItemsArray, totalSold };
      })
      .filter((entry) => entry.totalSold > 0);

    // Sort warehouses by total sales in descending order
    warehouseSales.sort((a, b) => b.totalSold - a.totalSold);

    return warehouseSales;
  });

  // Legacy getters (booking stats)
  const totalBookings = computed(() => report.value?.totalBookings || 0);
  const bookingsByMonth = computed(() => report.value?.bookingsByMonth || []);
  const warehouseStats = computed(() => report.value?.warehouseStats || []);
  const coefficientStats = computed(() => report.value?.coefficientStats || []);
  const warehouseSuggestions = computed(
    () => report.value?.warehouseSuggestions || [],
  );
  const hasData = computed(() => !!data.value && items.value.length > 0);
  const hasSuggestions = computed(() => warehouseSuggestions.value.length > 0);

  // Actions
  async function getReport(params?: ReportRequestParams) {
    if (!userStore.user.selectedAccountId) {
      error.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      error.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      error.value = 'Необходимо активировать подписку';
      return;
    }

    loading.value = true;
    error.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;

    try {
      const response: ReportApiPayload = await reportsAPI.fetchSalesReport(params);

      if (response.error) {
        error.value = response.error;
        data.value = null;
        reportPending.value = response.reportPending || false;
        estimatedWaitTime.value = response.estimatedWaitTime || null;
      } else {
        // Remove header row if present
        if (response.parsedData?.items && response.parsedData.items.length > 0) {
          response.parsedData.items.shift();
        }

        // Convert warehouse names to Russian when data is fetched
        if (response.parsedData?.items) {
          response.parsedData.items = response.parsedData.items.map((item) => ({
            ...item,
            warehouse: convertWarehouseName(item.warehouse || ''),
          }));
        }

        data.value = response.parsedData;
        reportPending.value = false;
        estimatedWaitTime.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'An unexpected error occurred';
      data.value = null;
      reportPending.value = false;
      estimatedWaitTime.value = null;
    } finally {
      loading.value = false;
    }
  }

  // Legacy fetch (booking stats)
  async function fetchReport() {
    try {
      loading.value = true;
      error.value = null;
      const result = await reportsAPI.fetchReport();
      report.value = result;
      isFetched.value = true;
      return result;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch report';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearReport() {
    data.value = null;
    report.value = null;
    isFetched.value = false;
    error.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
  }

  return {
    // State
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    reportPending: readonly(reportPending),
    estimatedWaitTime: readonly(estimatedWaitTime),
    report: readonly(report),
    isFetched: readonly(isFetched),

    // Getters
    items,
    meta,
    itemsByWarehouse,
    totalBookings,
    bookingsByMonth,
    warehouseStats,
    coefficientStats,
    warehouseSuggestions,
    hasData,
    hasSuggestions,

    // Actions
    getReport,
    fetchReport,
    clearReport,
  };
});
