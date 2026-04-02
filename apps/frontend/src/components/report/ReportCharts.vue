<template>
  <div class="report-charts">
    <!-- Report pending state -->
    <Card
      v-if="reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center"
    >
      <template #content>
        <i class="pi pi-clock text-5xl mb-4 text-blue-500 dark:text-blue-400 animate-pulse" />
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Отчет создается
        </h3>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
          Пожалуйста, подождите около {{ estimatedWaitTime || 30 }} секунд и
          обновите страницу
        </p>
        <div class="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-500 dark:bg-blue-600 h-2 rounded-full animate-pulse"
            style="width: 60%"
          />
        </div>
        <p class="text-sm text-gray-500 mt-2">
          Система обрабатывает ваш запрос...
        </p>
      </template>
    </Card>

    <!-- Error state -->
    <Card
      v-else-if="error && !reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center"
    >
      <template #content>
        <i class="pi pi-exclamation-triangle text-5xl mb-4 text-red-500 dark:text-red-400" />
        <h3 class="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
          Ошибка загрузки отчета
        </h3>
        <p class="text-lg text-gray-700 dark:text-gray-300 mb-4 max-w-md">
          {{ error }}
        </p>
        <Button
          severity="danger"
          variant="outlined"
          class="mt-2"
          @click="$emit('retry')"
        >
          <i class="pi pi-refresh mr-2" />
          Попробовать снова
        </Button>
      </template>
    </Card>

    <!-- Loading state -->
    <Card
      v-else-if="loading"
      class="text-center min-h-[300px] flex flex-col justify-center items-center"
    >
      <template #content>
        <i class="pi pi-spin pi-refresh text-5xl mb-4 text-blue-500 dark:text-blue-400" />
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Загрузка отчета
        </h3>
        <p class="text-lg text-gray-600 dark:text-gray-400">
          Получаем данные о продажах...
        </p>
      </template>
    </Card>

    <!-- Data visualization -->
    <div
      v-else-if="itemsByWarehouse && itemsByWarehouse.length > 0"
      class="space-y-8"
    >
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
    <Card
      v-else-if="
        data &&
          (data.items.length === 0 || !data.items) &&
          (!itemsByWarehouse || itemsByWarehouse.length === 0)
      "
      class="text-center min-h-[300px] flex flex-col justify-center items-center"
    >
      <template #content>
        <i class="pi pi-database text-5xl mb-4 text-gray-400" />
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Нет данных о продажах
        </h3>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
          За выбранный период не найдено продаж по складам
        </p>
      </template>
    </Card>

    <!-- Default empty state -->
    <Card
      v-else-if="!data && !error && !loading && !reportPending"
      class="text-center min-h-[300px] flex flex-col justify-center items-center"
    >
      <template #content>
        <i class="pi pi-chart-bar text-5xl mb-4 text-gray-400" />
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Выберите период для отчета
        </h3>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
          Укажите даты для получения аналитики продаж
        </p>
        <p class="text-sm text-gray-500">
          Данные будут отображены в виде интерактивных графиков
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { ReportParsedData, ReportItem } from '../../types';
import Button from 'primevue/button';
import Card from 'primevue/card';
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
