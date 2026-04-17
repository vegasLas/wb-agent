<template>
  <div class="space-y-4">
    <!-- State filter buttons -->
    <div class="flex gap-2">
      <Button
        :severity="activeFilter === 1 ? 'primary' : 'secondary'"
        class="flex-1"
        size="small"
        @click="$emit('filter-state-change', 1)"
      >
        Активные
      </Button>
      <Button
        :severity="activeFilter === 2 ? 'primary' : 'secondary'"
        class="flex-1"
        size="small"
        @click="$emit('filter-state-change', 2)"
      >
        Неактивные
      </Button>
    </div>

    <!-- Filter inputs -->
    <div
      class="flex flex-wrap items-center gap-4 p-4 rounded-[18px] border bg-card border-[var(--color-border)] shadow-card dark:bg-gradient-to-br dark:from-[rgba(30,30,40,0.9)] dark:to-[#15151C] dark:border-[rgba(106,57,244,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
    >
      <FloatLabel
        variant="on"
        class="flex-1"
      >
        <InputNumber
          id="minCost"
          v-model="minCost"
          :min="0"
          :step="10"
        />
        <label for="minCost">Мин. затраты, ₽</label>
      </FloatLabel>
      <div
        class="w-px h-10 hidden sm:block bg-[var(--color-border)] dark:bg-[#2a2a35]"
      />
      <FloatLabel
        variant="on"
        class="flex-1"
      >
        <InputNumber
          id="minCtr"
          v-model="minCtr"
          :min="0"
          :step="0.1"
          :max-fraction-digits="2"
        />
        <label for="minCtr">Макс. CTR</label>
      </FloatLabel>
    </div>

    <DataTable
      :value="filteredItems"
      striped-rows
      class="p-datatable-sm"
      :paginator="filteredTotalPages > 1"
      :rows="pageSize"
      :total-records="filteredTotalCount"
      :lazy="true"
      :first="(currentPage - 1) * pageSize"
      scrollable
      scroll-height="400px"
      :row-class="getRowClass"
      @page="onPageChange"
    >
      <Column
        field="name"
        header="Название"
        style="min-width: 180px"
      >
        <template #body="{ data }">
          <div class="font-medium text-sm truncate">
            {{ data.name }}
          </div>
        </template>
      </Column>

      <Column
        field="spend"
        header="Затраты, ₽"
        style="width: 7rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm font-medium">{{
            formatCurrency(data.spend)
          }}</span>
        </template>
      </Column>

      <Column
        field="ctr"
        header="CTR"
        style="width: 5rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatCtr(data.ctr) }}</span>
        </template>
      </Column>

      <Column
        field="avg_pos"
        header="Средняя позиция"
        style="width: 7rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatNumber(data.avg_pos) }}</span>
        </template>
      </Column>

      <Column
        field="views"
        header="Показы"
        style="width: 6rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatNumber(data.views) }}</span>
        </template>
      </Column>

      <Column
        field="clicks"
        header="Клики"
        style="width: 5rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatNumber(data.clicks) }}</span>
        </template>
      </Column>

      <Column
        field="baskets"
        header="Корзина"
        style="width: 6rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatNumber(data.baskets) }}</span>
        </template>
      </Column>

      <Column
        field="orders"
        header="Заказанные товары, шт"
        style="width: 8rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatNumber(data.orders) }}</span>
        </template>
      </Column>

      <Column
        field="cpm"
        header="CPM"
        style="width: 5rem"
        class="text-right"
      >
        <template #body="{ data }">
          <span class="text-sm">{{ formatCurrency(data.cpm) }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Matching count -->
    <div class="text-xs text-gray-500 text-right">
      Подходит под критерии: {{ matchingCount }} из {{ items.length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStorage } from '@vueuse/core';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import type { PresetInfoItem } from '@/stores/adverts';

const props = defineProps<{
  items: PresetInfoItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  activeFilter?: number;
}>();

const emit = defineEmits<{
  'page-change': [page: number, rows: number];
  'filter-state-change': [state: number];
}>();

// Filter state persisted in localStorage
const minCost = useStorage('adverts-filter-min-cost', 50);
const minCtr = useStorage('adverts-filter-min-ctr', 2);

// Filtered items based on criteria
// Rows with high cost (above threshold) AND low CTR (below threshold) get warning color
const filteredItems = computed(() => {
  return props.items.map((item) => ({
    ...item,
    _isWarning: item.spend > minCost.value && item.ctr < minCtr.value,
  }));
});

const matchingCount = computed(() => {
  return props.items.filter(
    (item) => !(item.spend > minCost.value && item.ctr < minCtr.value),
  ).length;
});

const filteredTotalCount = computed(() => props.totalCount);
const filteredTotalPages = computed(() => props.totalPages);

function getRowClass(data: PresetInfoItem & { _isWarning?: boolean }) {
  return data._isWarning ? 'bg-amber-50' : '';
}

function onPageChange(event: { first: number; rows: number }) {
  const page = Math.floor(event.first / event.rows) + 1;
  emit('page-change', page, event.rows);
}

// Formatting functions
function formatNumber(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCtr(value: number): string {
  if (value === undefined || value === null) return '-';
  // Don't convert, show as-is (already in correct format from API)
  return value.toFixed(2);
}
</script>

<style>
.bg-amber-50 {
  background-color: rgba(251, 191, 36, 0.12) !important;
}
.bg-amber-50 td {
  background-color: rgba(251, 191, 36, 0.12) !important;
}
</style>
