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
    <div class="filter-block">
      <FloatLabel variant="on">
        <InputNumber
          id="minCost"
          v-model="minCost"
          :min="0"
          :step="10"
          class="filter-input"
          input-class="filter-input-inner"
        />
        <label for="minCost" class="filter-float-label">Мин. затраты, ₽</label>
      </FloatLabel>
      <div class="filter-divider" />
      <FloatLabel variant="on">
        <InputNumber
          id="minCtr"
          v-model="minCtr"
          :min="0"
          :step="0.1"
          :maxFractionDigits="2"
          class="filter-input"
          input-class="filter-input-inner"
        />
        <label for="minCtr" class="filter-float-label">Макс. CTR</label>
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
      @page="onPageChange"
      scrollable
      scroll-height="400px"
      :row-class="getRowClass"
    >
      <Column field="name" header="Название" style="min-width: 180px">
        <template #body="{ data }">
          <div class="font-medium text-sm truncate">{{ data.name }}</div>
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

      <Column field="ctr" header="CTR" style="width: 5rem" class="text-right">
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

      <Column field="cpm" header="CPM" style="width: 5rem" class="text-right">
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

<style scoped>
.filter-block {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  border-radius: 18px;
  background: linear-gradient(
    160deg,
    rgba(30, 30, 40, 0.9),
    rgba(21, 21, 28, 1)
  );
  border: 1px solid rgba(106, 57, 244, 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.filter-input {
  width: 130px;
}

.filter-input :deep(.filter-input-inner) {
  background: rgba(10, 10, 15, 0.7) !important;
  border: 1px solid #2a2a35 !important;
  border-radius: 12px !important;
  color: #ffffff !important;
  padding: 0.875rem 0.875rem 0.5rem !important;
  font-size: 0.9375rem !important;
  font-weight: 600 !important;
  transition: all 0.2s ease;
}

.filter-input :deep(.filter-input-inner:hover) {
  border-color: #3d3d4d !important;
  background: rgba(10, 10, 15, 0.85) !important;
}

.filter-input :deep(.filter-input-inner:focus) {
  border-color: #6a39f4 !important;
  box-shadow: 0 0 0 3px rgba(106, 57, 244, 0.12) !important;
  background: rgba(10, 10, 15, 0.9) !important;
}

.filter-float-label {
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em;
}

.filter-input :deep(.filter-input-inner:focus ~ label),
.filter-input :deep(label.p-active) {
  color: #8b69f6 !important;
}

.filter-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, transparent, #2a2a35 50%, transparent);
}

:deep(.bg-amber-50) {
  background-color: rgba(251, 191, 36, 0.12) !important;
}
:deep(.bg-amber-50 td) {
  background-color: rgba(251, 191, 36, 0.12) !important;
}
</style>
