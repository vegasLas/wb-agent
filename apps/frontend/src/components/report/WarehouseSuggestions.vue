<template>
  <div class="warehouse-suggestions">
    <!-- Suggestions List -->
    <div v-if="suggestions && suggestions.length > 0" class="space-y-4">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <!-- Header with priority icon -->
        <div
          class="px-4 py-3 border-b border-gray-200 dark:border-gray-700"
          :class="{
            'bg-red-50 dark:bg-red-900/20': suggestion.priority === 'high',
            'bg-yellow-50 dark:bg-yellow-900/20': suggestion.priority === 'medium',
            'bg-blue-50 dark:bg-blue-900/20': suggestion.priority === 'low',
          }"
        >
          <div class="flex items-center">
            <component
              :is="getPriorityIcon(suggestion.priority)"
              class="w-6 h-6 mr-2"
              :class="{
                'text-red-500': suggestion.priority === 'high',
                'text-yellow-500': suggestion.priority === 'medium',
                'text-blue-500': suggestion.priority === 'low',
              }"
            />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ suggestion.warehouseName }} -
              <span
                :class="{
                  'text-red-600 dark:text-red-400':
                    suggestion.priority === 'high',
                  'text-yellow-600 dark:text-yellow-400':
                    suggestion.priority === 'medium',
                  'text-blue-600 dark:text-blue-400':
                    suggestion.priority === 'low',
                }"
              >
                Приоритет:
                {{ translatePriority(suggestion.priority).toUpperCase() }}
              </span>
            </h3>
          </div>
        </div>

        <div class="p-4">
          <p class="text-gray-700 dark:text-gray-300 mb-4">
            {{ suggestion.reason }}
          </p>

          <!-- Items Table -->
          <div
            v-if="suggestion.relevantItems && suggestion.relevantItems.length > 0"
            class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-sm text-left">
                <thead
                  class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0"
                >
                  <tr>
                    <th class="px-3 py-2">Товар (Артикул)</th>
                    <th class="px-3 py-2">Остаток</th>
                    <th class="px-3 py-2">Продано (30д)</th>
                    <th class="px-3 py-2">Запас (дн.)</th>
                    <th class="px-3 py-2">Рекомендация</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, itemIndex) in suggestion.relevantItems"
                    :key="itemIndex"
                    class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td class="px-3 py-2 font-medium">
                      {{ item.vendorCode }}
                    </td>
                    <td class="px-3 py-2">
                      {{ item.stockQty.toLocaleString('ru-RU') }}
                    </td>
                    <td class="px-3 py-2">
                      {{ item.purchasedQty.toLocaleString('ru-RU') }}
                    </td>
                    <td class="px-3 py-2">
                      {{ formatDaysOfStock(item.calculatedDaysOfStock) }}
                    </td>
                    <td class="px-3 py-2">
                      <span
                        :class="{
                          'font-semibold text-green-600 dark:text-green-400':
                            item.isReplenishment,
                          'font-semibold text-orange-600 dark:text-orange-400':
                            !item.isReplenishment,
                        }"
                      >
                        {{ getRecommendationText(item) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-else-if="reportStore.loading"
      class="mt-8 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <ArrowPathIcon class="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
      <p class="text-gray-500 dark:text-gray-400">Анализ рекомендаций...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="mt-8 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <InformationCircleIcon class="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Нет доступных рекомендаций
      </h4>
      <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Нет доступных рекомендаций для выбранного периода или по заданным
        критериям.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWarehouseSuggestions } from '../../composables/useWarehouseSuggestions';
import { useReportStore } from '../../stores/report';
import type { WarehouseSuggestionItem } from '../../types';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/solid';

const reportStore = useReportStore();
const { suggestions } = useWarehouseSuggestions();

const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
  return {
    high: ExclamationTriangleIcon,
    medium: ExclamationCircleIcon,
    low: InformationCircleIcon,
  }[priority];
};

const translatePriority = (priority: 'high' | 'medium' | 'low') => {
  const priorityMap = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  };
  return priorityMap[priority] || priority;
};

// Helper to format days of stock
const formatDaysOfStock = (days?: number) => {
  if (days === undefined || days === null) return 'N/A';
  if (!Number.isFinite(days)) return '∞';
  return days.toFixed(0);
};

const getRecommendationText = (item: WarehouseSuggestionItem): string => {
  if (
    item.suggestedUnloadQty !== undefined &&
    item.suggestedUnloadQty > 0 &&
    item.isReplenishment
  ) {
    return `Пополнить: ${item.suggestedUnloadQty * 2} шт.`;
  } else if (
    item.suggestedUnloadQty !== undefined &&
    item.suggestedUnloadQty > 0
  ) {
    return `Разгрузить: ${item.suggestedUnloadQty} шт.`;
  }
  return 'Нет';
};
</script>
