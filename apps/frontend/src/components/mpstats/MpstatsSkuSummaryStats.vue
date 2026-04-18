<template>
  <div class="space-y-4">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Revenue & Sales -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Общая выручка за 31 день, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xl font-semibold">{{
                  formatCurrency(period.revenue)
                }}</span>
                <span
                  v-if="period.revenue_prev > 0"
                  class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  <i class="pi pi-arrow-up text-[10px]" />
                  {{ formatCurrency(period.revenue_prev) }}
                </span>
              </div>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Общее количество продаж, шт.</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xl font-semibold">{{
                  formatNumber(period.sales)
                }}</span>
                <span
                  v-if="period.sales_prev > 0"
                  class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  <i class="pi pi-arrow-up text-[10px]" />
                  {{ formatNumber(period.sales_prev) }} шт.
                </span>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Estimated Revenue & Sales (Выкупы) -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <i class="pi pi-sparkles text-amber-500 text-[10px]" />
                <span>Выкупы, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatCurrency(period.revenue_estimated)
              }}</span>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <i class="pi pi-sparkles text-amber-500 text-[10px]" />
                <span>Выкупы, шт</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatNumber(period.sales_estimated)
              }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Avg Daily Revenue & Sales -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Средняя выручка в день, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatCurrency(period.revenue_avg)
              }}</span>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Средние продажи в день, шт.</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatNumber(period.sales_avg)
              }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Avg Daily with Stock -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Средняя выручка в день при наличии, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatCurrency(period.revenue_avg_with_stock)
              }}</span>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Средние продажи в день при наличии, шт.</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatNumber(period.sales_avg_with_stock)
              }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Buyout % -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Выкуп</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatPercent(purchasePercent)
              }}</span>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>С учетом возврата</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatPercent(purchaseAfterReturnPercent)
              }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Potential -->
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="space-y-3">
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Потенциал, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{
                formatCurrency(period.revenue_potential)
              }}</span>
            </div>
            <div>
              <div
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>Упущенная выручка, ₽</span>
                <i class="pi pi-question-circle text-[10px]" />
              </div>
              <span class="text-xl font-semibold">{{ formatCurrency(period.lost_profit) }} ({{
                formatPercent(period.lost_profit_percent)
              }})</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import type { MpstatsItemFull } from '@/api/mpstats/types';

interface Props {
  itemFull: MpstatsItemFull;
}

const props = defineProps<Props>();

const period = computed(
  () => props.itemFull.period_stats as unknown as Record<string, number>,
);

const purchasePercent = computed(
  () => props.itemFull.subject?.purchase?.purchase || 0,
);
const purchaseAfterReturnPercent = computed(
  () => props.itemFull.subject?.purchase?.purchase_after_return || 0,
);

const heatmapBars = computed(() => {
  const heatmap =
    (
      props.itemFull.period_stats as unknown as Record<
        string,
        Array<{ hour: number; avg_sales: number }>
      >
    ).sales_heatmap || [];
  if (heatmap.length === 0) {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sales: 0,
      percent: 0,
    }));
  }
  const maxSales = Math.max(...heatmap.map((h) => h.avg_sales), 1);
  // Fill missing hours
  const map = new Map(heatmap.map((h) => [h.hour, h.avg_sales]));
  return Array.from({ length: 24 }, (_, i) => {
    const sales = map.get(i) || 0;
    return { hour: i, sales, percent: (sales / maxSales) * 100 };
  });
});

function formatCurrency(value: number): string {
  return Math.round(value || 0).toLocaleString('ru-RU') + ' ₽';
}

function formatNumber(value: number): string {
  return (value || 0).toLocaleString('ru-RU');
}

function formatPercent(value: number): string {
  return (value || 0).toFixed(2).replace('.', ',') + ' %';
}
</script>
