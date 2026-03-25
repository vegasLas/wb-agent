<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ warehouseName }}
      </h3>
    </div>

    <div class="p-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Chart -->
        <div class="chart-container relative h-80 lg:h-96">
          <PolarArea
            v-if="chartData"
            :data="chartData"
            :options="chartOptions"
          />
          <p v-else class="text-gray-500 text-center py-8">Нет данных</p>
        </div>

        <!-- Table -->
        <div
          class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <div class="max-h-64 lg:max-h-96 overflow-y-auto">
            <table class="w-full text-sm text-left">
              <thead
                class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0"
              >
                <tr>
                  <th class="px-3 py-2 cursor-pointer" @click="sortBy('vendorCode')">
                    <div class="flex items-center gap-1">
                      Артикул
                      <span v-if="sortColumn === 'vendorCode'">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                  <th class="px-3 py-2 cursor-pointer" @click="sortBy('orderedQty')">
                    <div class="flex items-center gap-1">
                      Заказано
                      <span v-if="sortColumn === 'orderedQty'">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                  <th class="px-3 py-2 cursor-pointer" @click="sortBy('stockQty')">
                    <div class="flex items-center gap-1">
                      Остаток
                      <span v-if="sortColumn === 'stockQty'">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in sortedItems"
                  :key="`${item.vendorCode}-${item.size}`"
                  class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td class="px-3 py-2 font-medium text-gray-900 dark:text-white">
                    {{ item.vendorCode }}
                  </td>
                  <td class="px-3 py-2">
                    {{ item.orderedQty.toLocaleString('ru-RU') }}
                  </td>
                  <td class="px-3 py-2">
                    {{ item.stockQty.toLocaleString('ru-RU') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
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
import type { ReportItem } from '../../types';
import { useUserStore } from '../../stores/user';

// Register Chart.js components
ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend, Title);

interface Props {
  warehouseName: string;
  items: ReportItem[];
}

const props = defineProps<Props>();
const userStore = useUserStore();

// Sorting
const sortColumn = ref<'vendorCode' | 'orderedQty' | 'stockQty'>('orderedQty');
const sortDirection = ref<'asc' | 'desc'>('desc');

function sortBy(column: 'vendorCode' | 'orderedQty' | 'stockQty') {
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

// Detect dark mode
const isDark = computed(() => {
  // Check if the document has dark class or prefers dark color scheme
  return (
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
});

const chartData = computed(() => {
  const labels: string[] = props.items.map((item: ReportItem) => item.vendorCode);
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
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
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
