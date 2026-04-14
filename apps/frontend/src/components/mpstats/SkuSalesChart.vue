<template>
  <div class="space-y-4">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="flex flex-col">
            <span class="text-sm text-gray-500 dark:text-gray-400">Выручка за 30 суток</span>
            <span class="text-2xl font-semibold">{{ formatCurrency(totalRevenue) }}</span>
          </div>
        </template>
      </Card>
      <Card class="bg-surface-50 dark:bg-surface-900">
        <template #content>
          <div class="flex flex-col">
            <span class="text-sm text-gray-500 dark:text-gray-400">Продаж за 30 суток</span>
            <span class="text-2xl font-semibold">{{ formatNumber(totalSales) }} шт.</span>
          </div>
        </template>
      </Card>
    </div>

    <!-- Chart -->
    <div class="chart-container relative h-72 md:h-80">
      <Bar
        v-if="chartData"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Card from 'primevue/card';
import type { MpstatsSalesItem } from '@/api/mpstats/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
);

interface Props {
  sales: MpstatsSalesItem[];
}

const props = defineProps<Props>();

const chartSales = computed(() => [...props.sales].reverse());

const totalRevenue = computed(() => {
  return props.sales.reduce((sum, item) => {
    return sum + item.sales * item.final_price;
  }, 0);
});

const totalSales = computed(() => {
  return props.sales.reduce((sum, item) => sum + item.sales, 0);
});

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('ru-RU') + ' ₽';
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

const labels = computed(() => {
  return chartSales.value.map((item) => {
    const date = new Date(item.data);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  });
});

const salesData = computed(() => chartSales.value.map((item) => item.sales));
const priceData = computed(() => chartSales.value.map((item) => item.final_price));

const isDark = computed(() => {
  return (
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
});

const chartData = computed(() => {
  return {
    labels: labels.value,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Продажи, шт.',
        data: salesData.value,
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 2,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Цена, ₽',
        data: priceData.value,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };
});

const chartOptions = computed(() => {
  const textColor = isDark.value ? '#E5E7EB' : '#374151';
  const gridColor = isDark.value
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: isDark.value
          ? 'rgba(0, 0, 0, 0.8)'
          : 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Продажи, шт.',
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Цена, ₽',
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
});
</script>
