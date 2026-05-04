<template>
  <Card>
    <template #title>
      <h3 class="text-lg font-semibold">
        {{ warehouseName }}
      </h3>
    </template>
    <template #content>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Chart -->
        <div class="chart-container relative h-80 lg:h-96">
          <PolarArea
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
        <Card class="border border-gray-200 dark:border-gray-700">
          <template #content>
            <div class="max-h-64 lg:max-h-96 overflow-y-auto">
              <DataTable
                :value="sortedItems"
                scrollable
                scroll-height="flex"
                class="p-datatable-sm"
              >
                <Column
                  field="vendorCode"
                  header="Артикул"
                  sortable
                >
                  <template #body="{ data }">
                    <span class="font-medium">{{ data.vendorCode }}</span>
                  </template>
                </Column>
                <Column
                  field="orderedQty"
                  header="Заказано"
                  sortable
                >
                  <template #body="{ data }">
                    {{ data.orderedQty.toLocaleString('ru-RU') }}
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </Card>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { PolarArea } from 'vue-chartjs';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import type { ReportItem } from '../../types';
import { useUserStore } from '@/stores/user';
import { useColorMode } from '@vueuse/core';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

// Register Chart.js components
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend, Title);

interface Props {
  warehouseName: string;
  items: ReportItem[];
}

const props = defineProps<Props>();
const userStore = useUserStore();

// Sorting
const sortColumn = ref<'vendorCode' | 'orderedQty'>('orderedQty');
const sortDirection = ref<'asc' | 'desc'>('desc');

function sortBy(column: 'vendorCode' | 'orderedQty') {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'desc';
  }
}

const sortedItems = computed(() => {
  const sorted = [...props.items];
  sorted.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    if (sortColumn.value === 'vendorCode') {
      aVal = a.vendorCode;
      bVal = b.vendorCode;
      return sortDirection.value === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    } else {
      aVal = a[sortColumn.value];
      bVal = b[sortColumn.value];
      return sortDirection.value === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });
  return sorted;
});

// Detect dark mode reactively
const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});
const isDark = computed(() => colorMode.value === 'dark');

const chartData = computed(() => {
  const labels: string[] = props.items.map(
    (item: ReportItem) => item.vendorCode,
  );
  const data: number[] = props.items.map((item: ReportItem) => item.orderedQty);

  // Generate random colors for each segment
  const generateColors = (numColors: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < numColors; i++) {
      const r = Math.floor(Math.random() * 200 + 55);
      const g = Math.floor(Math.random() * 200 + 55);
      const b = Math.floor(Math.random() * 200 + 55);
      colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
  };

  const backgroundColors = generateColors(props.items.length);
  const borderColors = backgroundColors.map((color) =>
    color.replace('0.7', '1'),
  );

  return {
    labels,
    datasets: [
      {
        label: 'Заказанное количество',
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };
});

const chartOptions = computed(() => {
  const isDarkMode = isDark.value;
  const titleColor = isDarkMode ? '#FFFFFF' : '#6B7280';
  const legendColor = isDarkMode ? '#E5E7EB' : '#374151';
  const gridColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: legendColor,
          font: {
            size: 11,
          },
          boxWidth: 12,
        },
      },
      title: {
        display: true,
        text: `Заказанное количество по артикулу`,
        color: titleColor,
        font: {
          size: 14,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode
          ? 'rgba(0, 0, 0, 0.8)'
          : 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: TooltipItem<'polarArea'>) => {
            const label = context.label || '';
            const value = (context.raw as number) || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      r: {
        ticks: {
          display: false,
          backdropColor: 'transparent',
        },
        grid: {
          color: gridColor,
        },
        angleLines: {
          color: gridColor,
        },
        pointLabels: {
          display: false, // Hide point labels (item names around the chart)
        },
      },
    },
  };
});
</script>
