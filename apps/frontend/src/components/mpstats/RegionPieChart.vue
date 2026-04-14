<template>
  <Card>
    <template #title>
      <h3 class="text-lg font-semibold">{{ title }}</h3>
    </template>
    <template #content>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Chart -->
        <div class="chart-container relative h-64 lg:h-72">
          <Pie
            v-if="chartData"
            :data="chartData"
            :options="chartOptions"
          />
          <p
            v-else
            class="text-gray-500 text-center py-8"
          >
            Нет данных
          </p>
        </div>

        <!-- Table -->
        <div class="max-h-64 lg:max-h-72 overflow-y-auto">
          <DataTable
            :value="sortedItems"
            scrollable
            scroll-height="flex"
            class="p-datatable-sm"
          >
            <Column
              field="store"
              :header="storeHeader"
            >
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full inline-block"
                    :style="{ backgroundColor: data.color }"
                  />
                  <span class="truncate max-w-[120px]">{{ data.store }}</span>
                </div>
              </template>
            </Column>
            <Column
              field="percentage"
              :header="percentageHeader"
            >
              <template #body="{ data }">
                {{ data.percentage.toFixed(2) }}%
              </template>
            </Column>
            <Column
              field="value"
              :header="valueHeader"
            >
              <template #body="{ data }">
                {{ data.value.toLocaleString('ru-RU') }}
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface RegionItem {
  store: string;
  sales?: number;
  balance?: number;
}

interface Props {
  title: string;
  items: RegionItem[];
  type: 'sales' | 'balance';
}

const props = defineProps<Props>();

const storeHeader = 'Склад';
const percentageHeader = props.type === 'sales' ? 'Продажи, %' : 'Остатки, %';
const valueHeader = props.type === 'sales' ? 'Продажи, шт.' : 'Остатки, шт.';

const COLORS = [
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#3B82F6', // blue-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
];

const sortedItems = computed(() => {
  const total = props.items.reduce(
    (sum, item) => sum + (props.type === 'sales' ? item.sales || 0 : item.balance || 0),
    0,
  );

  const withValues = props.items.map((item, index) => {
    const value = props.type === 'sales' ? item.sales || 0 : item.balance || 0;
    return {
      store: item.store,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: COLORS[index % COLORS.length],
    };
  });

  return withValues.sort((a, b) => b.value - a.value);
});

const isDark = computed(() => {
  return (
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
});

const chartData = computed(() => {
  const labels = sortedItems.value.map((item) => item.store);
  const data = sortedItems.value.map((item) => item.value);
  const backgroundColors = sortedItems.value.map((item) => item.color);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: isDark.value ? '#1f2937' : '#ffffff',
      },
    ],
  };
});

const chartOptions = computed(() => {
  const textColor = isDark.value ? '#E5E7EB' : '#374151';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark.value
          ? 'rgba(0, 0, 0, 0.8)'
          : 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: { label?: string; raw: number }) => {
            const value = context.raw || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
            return `${context.label}: ${value.toLocaleString('ru-RU')} (${percentage}%)`;
          },
        },
      },
    },
  };
});
</script>
