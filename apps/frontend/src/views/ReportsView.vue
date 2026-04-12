<template>
  <div class="report-main">
    <!-- User Alerts -->
    <UserAlerts class="mb-6" />

    <!-- Display content only if user has selected account, valid supplier and subscription is active -->
    <template
      v-if="
        userStore.user.selectedAccountId &&
          userStore.hasValidSupplier &&
          userStore.subscriptionActive
      "
    >
      <!-- Date Range Selection -->
      <Card class="mb-6">
        <template #title>
          <h3 class="text-lg font-semibold">
            Отчет продаж за период
          </h3>
        </template>
        <template #content>
          <div
            class="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
          >
            <DatePicker
              :model-value="reportViewStore.pickerDateRangeArray"
              selection-mode="range"
              :show-time="false"
              date-format="dd.mm.yy"
              placeholder="Выберите период"
              :max-date="yesterday"
              class="mt-1 w-full sm:w-auto"
              @update:model-value="onDateRangeChange"
            />
            <Button
              severity="primary"
              :loading="reportStore.loading"
              class="mt-2 sm:mt-0"
              @click="reportViewStore.fetchReportData()"
            >
              Обновить
            </Button>
          </div>
        </template>
      </Card>

      <!-- Summary Statistics -->
      <div
        v-if="reportStore.data?.items && reportStore.data.items.length > 0"
        class="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ summaryStats.totalSold.toLocaleString('ru-RU') }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                продано (шт)
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div
                class="text-2xl font-bold text-green-600 dark:text-green-400"
              >
                {{ summaryStats.totalRevenue.toLocaleString('ru-RU') }} ₽
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                выручка
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div
                class="text-2xl font-bold text-purple-600 dark:text-purple-400"
              >
                {{ summaryStats.totalOrdered.toLocaleString('ru-RU') }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                заказано (шт)
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="text-center">
              <div
                class="text-2xl font-bold text-orange-600 dark:text-orange-400"
              >
                {{ summaryStats.uniqueItems.toLocaleString('ru-RU') }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                товаров
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Top Products Table -->
      <Card
        v-if="topProducts.length > 0"
        class="mb-6"
      >
        <template #title>
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <h4 class="text-lg font-semibold">
              Топ-10 продаваемых товаров
            </h4>
            <MultiSelect
              v-model="selectedColumns"
              :options="availableColumns"
              option-label="label"
              option-value="key"
              placeholder="Выберите колонки"
              display="chip"
              class="w-full sm:w-64"
            />
          </div>
        </template>
        <template #content>
          <div class="overflow-x-auto max-h-80 overflow-y-auto">
            <DataTable
              :value="sortedTopProducts"
              scrollable
              scroll-height="flex"
              class="p-datatable-sm"
            >
              <Column
                v-for="col in visibleColumns"
                :key="col.key"
                :field="col.key"
                :header="col.label"
                sortable
              />
            </DataTable>
          </div>
        </template>
      </Card>

      <!-- View Toggle Buttons -->
      <div
        v-if="!reportStore.loading"
        class="mb-6 flex space-x-2"
      >
        <Button
          :severity="
            reportViewStore.activeView === 'charts' ? 'primary' : 'secondary'
          "
          :variant="
            reportViewStore.activeView === 'charts' ? 'filled' : 'outlined'
          "
          size="small"
          @click="reportViewStore.setActiveView('charts')"
        >
          <i class="pi pi-chart-pie mr-1" />
          Графики
        </Button>
        <Button
          :severity="
            reportViewStore.activeView === 'suggestions'
              ? 'primary'
              : 'secondary'
          "
          :variant="
            reportViewStore.activeView === 'suggestions' ? 'filled' : 'outlined'
          "
          size="small"
          @click="reportViewStore.setActiveView('suggestions')"
        >
          <i class="pi pi-lightbulb mr-1" />
          Рекомендации
        </Button>
      </div>

      <!-- Conditional Rendering based on activeView -->
      <WarehouseSuggestions
        v-if="reportViewStore.activeView === 'suggestions'"
      />

      <ReportCharts
        v-if="reportViewStore.activeView === 'charts'"
        :items-by-warehouse="reportStore.itemsByWarehouse"
        :data="reportDataTyped"
        :error="reportStore.error"
        :loading="reportStore.loading"
        :report-pending="reportStore.reportPending"
        :estimated-wait-time="reportStore.estimatedWaitTime"
        @retry="reportViewStore.fetchReportData()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useViewReady } from '../composables/useSkeleton';
import DatePicker from 'primevue/datepicker';
import { useReportStore } from '@/stores/reports';
import { useUserStore } from '@/stores/user';
import { useReportViewStore } from '@/stores/reports';
import UserAlerts from '../components/global/UserAlerts.vue';
import MultiSelect from 'primevue/multiselect';
import ReportCharts from '../components/report/ReportCharts.vue';
import WarehouseSuggestions from '../components/report/WarehouseSuggestions.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { ReportItem, ReportParsedData } from '../types';

const reportStore = useReportStore();
const userStore = useUserStore();
const reportViewStore = useReportViewStore();

// Typed report data for template (avoid type assertion with | in template)
const reportDataTyped = computed<ReportParsedData | null>(() => {
  return reportStore.data as ReportParsedData | null;
});

// Yesterday for max date
const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));

function onDateRangeChange(
  val: Date | Date[] | (Date | null)[] | null | undefined,
) {
  if (Array.isArray(val) && val.length === 2 && val[0] && val[1]) {
    reportViewStore.setDateRange({ start: val[0], end: val[1] });
  } else {
    reportViewStore.setDateRange({ start: null, end: null });
  }
}

// Table column options
interface ColumnOption {
  key: keyof TopProduct | string;
  label: string;
}

interface TopProduct {
  vendorCode: string;
  productName: string;
  brand: string;
  category: string;
  season: string;
  collection: string;
  wbArticle: number | string;
  barcode: string;
  size: string;
  orderedQty: number | string;
  orderedSum: number | string;
  purchasedQty: number | string;
  purchasedSum: number | string;
  qty: number | string;
}

const availableColumns: ColumnOption[] = [
  { key: 'vendorCode', label: 'Артикул' },
  { key: 'productName', label: 'Название товара' },
  { key: 'brand', label: 'Бренд' },
  { key: 'category', label: 'Категория' },
  { key: 'season', label: 'Сезон' },
  { key: 'collection', label: 'Коллекция' },
  { key: 'wbArticle', label: 'Артикул WB' },
  { key: 'barcode', label: 'Баркод' },
  { key: 'size', label: 'Размер' },
  { key: 'orderedQty', label: 'Заказано (шт)' },
  { key: 'orderedSum', label: 'Заказано (₽)' },
  { key: 'purchasedQty', label: 'Продано (шт)' },
  { key: 'purchasedSum', label: 'Выручка (₽)' },
  { key: 'qty', label: 'Остаток' },
];

const selectedColumns = ref<string[]>([
  'vendorCode',
  'brand',
  'purchasedQty',
  'purchasedSum',
  'qty',
]);

const visibleColumns = computed(() => {
  return availableColumns.filter((col) =>
    selectedColumns.value.includes(col.key as string),
  );
});

// Sorting
const sortColumn = ref<keyof TopProduct>('purchasedQty');
const sortDirection = ref<'asc' | 'desc'>('desc');

function sortBy(column: keyof TopProduct | string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column as keyof TopProduct;
    sortDirection.value = 'desc';
  }
}

// Numeric and currency fields
const numericFields = new Set([
  'wbArticle',
  'orderedQty',
  'orderedSum',
  'purchasedQty',
  'purchasedSum',
  'qty',
]);
const currencyFields = new Set(['orderedSum', 'purchasedSum']);

// Top products computed
const topProducts = computed((): TopProduct[] => {
  if (!reportStore.data?.items) return [];

  // Group items by vendorCode and aggregate across all warehouses
  const groupedByVendorCode = reportStore.data.items.reduce(
    (acc: Record<string, TopProduct>, item: ReportItem) => {
      const key = item.vendorCode;

      if (!acc[key]) {
        acc[key] = {
          vendorCode: item.vendorCode,
          productName: item.productName,
          brand: item.brand,
          category: item.category,
          season: item.season,
          collection: item.collection,
          wbArticle: item.wbArticle,
          barcode: item.barcode,
          size: item.size,
          orderedQty: 0,
          orderedSum: 0,
          purchasedQty: 0,
          purchasedSum: 0,
          qty: 0,
        };
      }

      acc[key].orderedQty =
        (acc[key].orderedQty as number) + (item.orderedQty || 0);
      acc[key].orderedSum =
        (acc[key].orderedSum as number) + (item.orderedSum || 0);
      acc[key].purchasedQty =
        (acc[key].purchasedQty as number) + (item.purchasedQty || 0);
      acc[key].purchasedSum =
        (acc[key].purchasedSum as number) + (item.purchasedSum || 0);
      acc[key].qty = (acc[key].qty as number) + (item.stockQty || 0);

      return acc;
    },
    {} as Record<string, TopProduct>,
  );

  // Convert to array, filter items with sales, sort and take top 10
  return Object.values(groupedByVendorCode)
    .filter((item: TopProduct) => (item.purchasedQty as number) > 0)
    .sort(
      (a: TopProduct, b: TopProduct) =>
        (b.purchasedQty as number) - (a.purchasedQty as number),
    )
    .slice(0, 10)
    .map((item: TopProduct) => {
      const formattedItem: Record<string, string | number> = { ...item };

      // Format numeric fields
      numericFields.forEach((field) => {
        const value = item[field as keyof TopProduct] as number;
        if (currencyFields.has(field)) {
          formattedItem[field] = `${value.toLocaleString('ru-RU')} ₽`;
        } else if (typeof value === 'number') {
          formattedItem[field] = value.toLocaleString('ru-RU');
        }
      });

      return formattedItem as unknown as TopProduct;
    });
});

const sortedTopProducts = computed(() => {
  const sorted = [...topProducts.value];
  sorted.sort((a, b) => {
    const aVal = a[sortColumn.value];
    const bVal = b[sortColumn.value];

    // Handle string vs number comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection.value === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Extract numeric value from formatted strings (e.g., "1 234 ₽" -> 1234)
    const aNum =
      typeof aVal === 'string'
        ? parseInt(aVal.replace(/[^\d]/g, '')) || 0
        : (aVal as number) || 0;
    const bNum =
      typeof bVal === 'string'
        ? parseInt(bVal.replace(/[^\d]/g, '')) || 0
        : (bVal as number) || 0;

    return sortDirection.value === 'asc' ? aNum - bNum : bNum - aNum;
  });
  return sorted;
});

// Summary stats
const summaryStats = computed(() => {
  if (!reportStore.data?.items) {
    return {
      totalOrdered: 0,
      totalSold: 0,
      totalRevenue: 0,
      totalStock: 0,
      uniqueItems: 0,
      totalItems: 0,
    };
  }

  const items = reportStore.data.items;
  return {
    totalOrdered: items.reduce((sum, item) => sum + (item.orderedQty || 0), 0),
    totalSold: items.reduce((sum, item) => sum + (item.purchasedQty || 0), 0),
    totalRevenue: items.reduce(
      (sum, item) => sum + (item.purchasedSum || 0),
      0,
    ),
    totalStock: items.reduce((sum, item) => sum + (item.stockQty || 0), 0),
    uniqueItems: new Set(items.map((item) => item.vendorCode)).size,
    totalItems: items.length,
  };
});

// Skeleton control - call viewReady() when component is fully loaded
const { viewReady } = useViewReady();

onMounted(async () => {
  await reportViewStore.fetchReportData();
  // Signal that view is ready after data is loaded
  viewReady();
});
</script>
