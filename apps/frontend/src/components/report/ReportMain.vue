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
      <div
        class="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      >
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Отчет продаж за период
        </h3>
        <div
          class="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
          <VueDatePicker
            v-model="pickerDateRange"
            :dark="isDark"
            auto-apply
            :enable-time-picker="false"
            format="dd.MM.yyyy"
            locale="ru-RU"
            range
            placeholder="Выберите период"
            :max-date="yesterday"
            class="mt-1 w-full sm:w-auto"
            :class="{ 'dark-datepicker': isDark }"
          />
          <BaseButton
            color="primary"
            :loading="reportStore.loading"
            class="mt-2 sm:mt-0"
            @click="reportViewStore.fetchReportData()"
          >
            Обновить
          </BaseButton>
        </div>
      </div>

      <!-- Summary Statistics -->
      <div
        v-if="reportStore.data?.items && reportStore.data.items.length > 0"
        class="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ summaryStats.totalSold.toLocaleString('ru-RU') }}
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              продано (шт)
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ summaryStats.totalRevenue.toLocaleString('ru-RU') }} ₽
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              выручка
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {{ summaryStats.totalOrdered.toLocaleString('ru-RU') }}
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              заказано (шт)
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {{ summaryStats.uniqueItems.toLocaleString('ru-RU') }}
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              товаров
            </div>
          </div>
        </div>
      </div>

      <!-- Top Products Table -->
      <div
        v-if="topProducts.length > 0"
        class="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
              Топ-10 продаваемых товаров
            </h4>
            <MultiSelect
              v-model="selectedColumns"
              :options="
                availableColumns.map((col) => ({
                  value: col.key,
                  label: col.label,
                }))
              "
              placeholder="Выберите колонки"
              class="w-full sm:w-64"
            />
          </div>
        </div>
        <div class="overflow-x-auto max-h-80 overflow-y-auto">
          <table class="w-full text-sm text-left">
            <thead
              class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0"
            >
              <tr>
                <th
                  v-for="col in visibleColumns"
                  :key="col.key"
                  class="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  @click="sortBy(col.key)"
                >
                  <div class="flex items-center gap-1">
                    {{ col.label }}
                    <span v-if="sortColumn === col.key">
                      {{ sortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(product, index) in sortedTopProducts"
                :key="index"
                class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td
                  v-for="col in visibleColumns"
                  :key="col.key"
                  class="px-4 py-3"
                >
                  {{ product[col.key as keyof typeof product] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- View Toggle Buttons -->
      <div v-if="!reportStore.loading" class="mb-6 flex space-x-2">
        <BaseButton
          :color="reportViewStore.activeView === 'charts' ? 'primary' : 'gray'"
          :variant="reportViewStore.activeView === 'charts' ? 'solid' : 'outline'"
          size="sm"
          @click="reportViewStore.setActiveView('charts')"
        >
          <ChartPieIcon class="w-5 h-5 mr-1" />
          Графики
        </BaseButton>
        <BaseButton
          :color="reportViewStore.activeView === 'suggestions' ? 'primary' : 'gray'"
          :variant="reportViewStore.activeView === 'suggestions' ? 'solid' : 'outline'"
          size="sm"
          @click="reportViewStore.setActiveView('suggestions')"
        >
          <LightBulbIcon class="w-5 h-5 mr-1" />
          Рекомендации
        </BaseButton>
      </div>

      <!-- Conditional Rendering based on activeView -->
      <WarehouseSuggestions v-if="reportViewStore.activeView === 'suggestions'" />

      <ReportCharts
        v-if="reportViewStore.activeView === 'charts'"
        :items-by-warehouse="reportStore.itemsByWarehouse"
        :data="reportStore.data"
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
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { ChartPieIcon, LightBulbIcon } from '@heroicons/vue/24/outline';
import { useReportStore } from '../../stores/report';
import { useUserStore } from '../../stores/user';
import { useReportViewStore } from '../../stores/reportView';
import { useViewStore } from '../../stores/view';
import UserAlerts from '../global/UserAlerts.vue';
import BaseButton from '../ui/BaseButton.vue';
import MultiSelect from '../ui/MultiSelect.vue';
import ReportCharts from './ReportCharts.vue';
import WarehouseSuggestions from './WarehouseSuggestions.vue';
import type { ReportItem } from '../../types';

// Register Vue Date Picker
const reportStore = useReportStore();
const userStore = useUserStore();
const reportViewStore = useReportViewStore();
const viewStore = useViewStore();

// Yesterday for max date
const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));

// Dark mode detection
const isDark = computed(() => {
  return document.documentElement.classList.contains('dark');
});

// Computed property for VueDatePicker v-model
const pickerDateRange = computed({
  get: () => reportViewStore.pickerDateRangeArray,
  set: (val) => {
    if (val && val.length === 2) {
      reportViewStore.setDateRange({ start: val[0], end: val[1] });
    } else {
      reportViewStore.setDateRange({ start: null, end: null });
    }
  },
});

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

      acc[key].orderedQty = (acc[key].orderedQty as number) + (item.orderedQty || 0);
      acc[key].orderedSum = (acc[key].orderedSum as number) + (item.orderedSum || 0);
      acc[key].purchasedQty = (acc[key].purchasedQty as number) + (item.purchasedQty || 0);
      acc[key].purchasedSum = (acc[key].purchasedSum as number) + (item.purchasedSum || 0);
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
      const formattedItem: any = { ...item };

      // Format numeric fields
      numericFields.forEach((field) => {
        const value = item[field as keyof TopProduct] as number;
        if (currencyFields.has(field)) {
          formattedItem[field] = `${value.toLocaleString('ru-RU')} ₽`;
        } else if (typeof value === 'number') {
          formattedItem[field] = value.toLocaleString('ru-RU');
        }
      });

      return formattedItem as TopProduct;
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
    const aNum = typeof aVal === 'string' 
      ? parseInt(aVal.replace(/[^\d]/g, '')) || 0 
      : (aVal as number) || 0;
    const bNum = typeof bVal === 'string' 
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

onMounted(() => {
  reportViewStore.fetchReportData();
});
</script>

<style scoped>
/* Dark mode styles for date picker */
:deep(.dark-datepicker) .dp__theme_dark {
  --dp-background-color: #1f2937;
  --dp-text-color: #f3f4f6;
  --dp-hover-color: #374151;
  --dp-hover-text-color: #f3f4f6;
  --dp-primary-color: #3b82f6;
  --dp-primary-text-color: #fff;
  --dp-secondary-color: #4b5563;
  --dp-border-color: #4b5563;
}
</style>
