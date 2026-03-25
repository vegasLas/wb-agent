<template>
  <div class="report-charts">
    <!-- Report pending state -->
    <div
      v-if="reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
    >
      <ClockIcon class="h-12 w-12 mb-4 text-blue-500 animate-pulse" />
      <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Отчет создается
      </h3>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
        Пожалуйста, подождите около {{ estimatedWaitTime || 30 }} секунд и
        обновите страницу
      </p>
      <div class="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          class="bg-blue-500 h-2 rounded-full animate-pulse"
          style="width: 60%"
        ></div>
      </div>
      <p class="text-sm text-gray-500 mt-2">
        Система обрабатывает ваш запрос...
      </p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error && !reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
    >
      <ExclamationTriangleIcon class="h-12 w-12 mb-4 text-red-500" />
      <h3 class="text-xl font-semibold text-red-600 mb-2">
        Ошибка загрузки отчета
      </h3>
      <p class="text-lg text-gray-700 dark:text-gray-300 mb-4 max-w-md">
        {{ error }}
      </p>
      <BaseButton color="red" variant="outline" class="mt-2" @click="$emit('retry')">
        <ArrowPathIcon class="w-5 h-5 mr-2" />
        Попробовать снова
      </BaseButton>
    </div>

    <!-- Loading state -->
    <div
      v-else-if="loading"
      class="text-center min-h-[300px] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
    >
      <ArrowPathIcon class="h-12 w-12 mb-4 text-blue-500 animate-spin" />
      <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Загрузка отчета
      </h3>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Получаем данные о продажах...
      </p>
    </div>

    <!-- Data visualization -->
    <div v-else-if="itemsByWarehouse && itemsByWarehouse.length > 0" class="space-y-8">
      <div
        v-for="{ warehouse, items } in itemsByWarehouse"
        :key="warehouse"
      >
        <WarehousePolarAreaChart
          :warehouse-name="warehouse"
          :items="items"
        />
      </div>
    </div>

    <!-- No data state -->
    <div
      v-else-if="
        data &&
        (data.items.length === 0 || !data.items) &&
        (!itemsByWarehouse || itemsByWarehouse.length === 0)
      "
      class="text-center min-h-[300px] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
    >
      <CircleStackIcon class="h-12 w-12 mb-4 text-gray-400" />
      <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Нет данных о продажах
      </h3>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
        За выбранный период не найдено продаж по складам
      </p>
    </div>

    <!-- Default empty state -->
    <div
      v-else-if="!data && !error && !loading && !reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
    >
      <DocumentChartBarIcon class="h-12 w-12 mb-4 text-gray-400" />
      <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Выберите период для отчета
      </h3>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
        Укажите даты для получения аналитики продаж
      </p>
      <p class="text-sm text-gray-500">
        Данные будут отображены в виде интерактивных графиков
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReportParsedData, ReportItem } from '../../types';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CircleStackIcon,
  DocumentChartBarIcon,
} from '@heroicons/vue/24/outline';
import BaseButton from '../ui/BaseButton.vue';
import WarehousePolarAreaChart from './WarehousePolarAreaChart.vue';

interface Props {
  itemsByWarehouse: {
    warehouse: string;
    items: ReportItem[];
    totalSold: number;
  }[];
  data: ReportParsedData | null;
  error: string | null;
  loading: boolean;
  reportPending?: boolean;
  estimatedWaitTime?: number | null;
}

defineProps<Props>();

defineEmits<{
  retry: [];
}>();
</script>
