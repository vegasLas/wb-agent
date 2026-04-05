<template>
  <div class="warehouse-suggestions">
    <!-- Suggestions List -->
    <div
      v-if="suggestions && suggestions.length > 0"
      class="space-y-4"
    >
      <Card
        v-for="(suggestion, index) in suggestions"
        :key="index"
      >
        <!-- Header with priority icon -->
        <template #title>
          <div
            class="px-4 py-3 -mt-4 -mx-4 mb-4 rounded-t-lg"
            :class="{
              'bg-red-50 dark:bg-red-900/20': suggestion.priority === 'high',
              'bg-yellow-50 dark:bg-yellow-900/20':
                suggestion.priority === 'medium',
              'bg-blue-50 dark:bg-blue-900/20': suggestion.priority === 'low',
            }"
          >
            <div class="flex items-center">
              <i
                class="text-xl mr-2"
                :class="getPriorityIconClass(suggestion.priority)"
              />
              <h3 class="text-lg font-medium">
                {{ suggestion.warehouseName }} -
                <Tag
                  :severity="getPrioritySeverity(suggestion.priority)"
                  :value="translatePriority(suggestion.priority).toUpperCase()"
                />
              </h3>
            </div>
          </div>
        </template>
        <template #content>
          <p class="text-gray-700 dark:text-gray-300 mb-4">
            {{ suggestion.reason }}
          </p>

          <!-- Items Table -->
          <Card
            v-if="
              suggestion.relevantItems && suggestion.relevantItems.length > 0
            "
            class="border border-gray-200 dark:border-gray-700"
          >
            <template #content>
              <div class="max-h-60 overflow-y-auto">
                <DataTable
                  :value="suggestion.relevantItems"
                  scrollable
                  scroll-height="flex"
                  class="p-datatable-sm"
                >
                  <Column
                    field="vendorCode"
                    header="Товар (Артикул)"
                  >
                    <template #body="{ data }">
                      <span class="font-medium">{{ data.vendorCode }}</span>
                    </template>
                  </Column>
                  <Column
                    field="stockQty"
                    header="Остаток"
                  >
                    <template #body="{ data }">
                      {{ data.stockQty.toLocaleString('ru-RU') }}
                    </template>
                  </Column>
                  <Column
                    field="purchasedQty"
                    header="Продано (30д)"
                  >
                    <template #body="{ data }">
                      {{ data.purchasedQty.toLocaleString('ru-RU') }}
                    </template>
                  </Column>
                  <Column
                    field="calculatedDaysOfStock"
                    header="Запас (дн.)"
                  >
                    <template #body="{ data }">
                      {{ formatDaysOfStock(data.calculatedDaysOfStock) }}
                    </template>
                  </Column>
                  <Column header="Рекомендация">
                    <template #body="{ data }">
                      <span
                        :class="{
                          'font-semibold text-green-600 dark:text-green-400':
                            data.isReplenishment,
                          'font-semibold text-orange-600 dark:text-orange-400':
                            !data.isReplenishment,
                        }"
                      >
                        {{ getRecommendationText(data) }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </template>
      </Card>
    </div>

    <!-- Loading State -->
    <Card
      v-else-if="reportStore.loading"
      class="mt-8 text-center py-12"
    >
      <template #content>
        <i
          class="pi pi-spin pi-refresh text-3xl mx-auto mb-4 text-blue-500 dark:text-blue-400"
        />
        <p class="text-gray-500 dark:text-gray-400">
          Анализ рекомендаций...
        </p>
      </template>
    </Card>

    <!-- Empty State -->
    <Card
      v-else
      class="mt-8 text-center py-12"
    >
      <template #content>
        <i class="pi pi-info-circle text-4xl mx-auto mb-4 text-gray-400" />
        <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Нет доступных рекомендаций
        </h4>
        <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Нет доступных рекомендаций для выбранного периода или по заданным
          критериям.
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useWarehouseSuggestions } from '../../composables/useWarehouseSuggestions';
import { useReportStore } from '../../stores/report';
import type { WarehouseSuggestionItem } from '../../types';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const reportStore = useReportStore();
const { suggestions } = useWarehouseSuggestions();

const getPriorityIconClass = (priority: 'high' | 'medium' | 'low') => {
  return {
    high: 'pi pi-exclamation-triangle text-red-500 dark:text-red-400',
    medium: 'pi pi-exclamation-circle text-yellow-500 dark:text-yellow-400',
    low: 'pi pi-info-circle text-blue-500 dark:text-blue-400',
  }[priority];
};

const getPrioritySeverity = (priority: 'high' | 'medium' | 'low') => {
  return {
    high: 'danger',
    medium: 'warn',
    low: 'info',
  }[priority] as 'danger' | 'warn' | 'info';
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
    return `Пополнить: ${item.suggestedUnloadQty.toLocaleString('ru-RU')} шт.`;
  } else if (
    item.suggestedUnloadQty !== undefined &&
    item.suggestedUnloadQty > 0
  ) {
    return `Разгрузить: ${item.suggestedUnloadQty.toLocaleString('ru-RU')} шт.`;
  }
  return 'Мониторинг';
};
</script>
