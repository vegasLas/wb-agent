<template>
  <div
    v-if="total"
    class="p-4 bg-purple-50 rounded-lg border border-purple-200"
  >
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="text-center">
        <div class="text-lg font-bold text-purple-700">
          {{ formatNumber(total.views) }}
        </div>
        <div class="text-xs text-gray-600">Показы</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-purple-700">
          {{ formatNumber(total.clicks) }}
        </div>
        <div class="text-xs text-gray-600">Клики</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-purple-700">
          {{ formatNumber(total.orders) }}
        </div>
        <div class="text-xs text-gray-600">Заказы</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-purple-700">
          {{ formatCurrency(total.spend) }}
        </div>
        <div class="text-xs text-gray-600">Расход</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PresetInfoTotal } from '@/stores/adverts';

defineProps<{
  total: PresetInfoTotal | null;
}>();

function formatNumber(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>
