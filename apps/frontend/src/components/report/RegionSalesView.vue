<template>
  <div class="space-y-4">
    <!-- Date Selection -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end gap-3">
      <div class="flex-1 w-full">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Период
        </label>
        <DatePicker
          v-model="dateRange"
          selection-mode="range"
          :show-time="false"
          date-format="dd.mm.yy"
          placeholder="Выберите период"
          class="w-full"
          locale="ru"
        />
      </div>
      <Button
        label="Обновить"
        icon="pi pi-refresh"
        :loading="reportStore.regionSalesLoading"
        :disabled="!canFetch"
        @click="fetchData"
      />
    </div>

    <!-- Error Message -->
    <div
      v-if="reportStore.regionSalesError"
      class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
    >
      {{ reportStore.regionSalesError }}
    </div>

    <!-- Loading -->
    <div
      v-if="reportStore.regionSalesLoading"
      class="flex items-center justify-center py-12"
    >
      <ProgressSpinner
        style="width: 3rem; height: 3rem"
        stroke-width="4"
      />
    </div>

    <template v-else-if="reportStore.hasRegionSalesData">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card class="text-center">
          <template #content>
            <div class="text-xl font-bold text-purple-600">
              {{ formatNumber(totalQty) }}
            </div>
            <div class="text-xs text-gray-500">
              Выкупили, шт.
            </div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-xl font-bold text-emerald-600">
              {{ formatCurrency(totalReward) }}
            </div>
            <div class="text-xs text-gray-500">
              К перечислению, руб.
            </div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-xl font-bold text-blue-600">
              {{ reportStore.regionSalesRows.length }}
            </div>
            <div class="text-xs text-gray-500">
              Фед. округов
            </div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-xl font-bold text-amber-600">
              {{ topRegion }}
            </div>
            <div class="text-xs text-gray-500">
              Топ регион
            </div>
          </template>
        </Card>
      </div>

      <!-- Table -->
      <RegionSalesTable :rows="reportStore.regionSalesRows" />
    </template>

    <!-- Empty State -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-12 text-gray-400"
    >
      <i class="pi pi-map text-4xl mb-3" />
      <p class="text-sm">
        Выберите период и нажмите «Обновить»
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useReportStore } from '@/stores/reports';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import RegionSalesTable from './RegionSalesTable.vue';

const reportStore = useReportStore();

const dateRange = ref<Date[] | null>(null);

const canFetch = computed(() => {
  return (
    Array.isArray(dateRange.value) &&
    dateRange.value.length === 2 &&
    dateRange.value[0] != null &&
    dateRange.value[1] != null
  );
});

const totalQty = computed(() =>
  reportStore.regionSalesRows.reduce((sum, row) => sum + (row.qty || 0), 0),
);

const totalReward = computed(() =>
  reportStore.regionSalesRows.reduce((sum, row) => sum + (row.reward || 0), 0),
);

const topRegion = computed(() => {
  const rows = reportStore.regionSalesRows;
  if (!rows.length) return '-';
  const top = [...rows].sort((a, b) => b.reward - a.reward)[0];
  return top.fedOkr;
});

function formatDateToDDMMYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
}

function formatNumber(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function fetchData() {
  if (!canFetch.value || !dateRange.value) return;
  const [start, end] = dateRange.value;
  await reportStore.fetchRegionSales({
    dateFrom: formatDateToDDMMYY(start),
    dateTo: formatDateToDDMMYY(end),
    limit: 50,
    offset: 0,
  });
}

onMounted(() => {
  // Set default range to last 14 days
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 13);
  dateRange.value = [start, end];
  fetchData();
});
</script>
