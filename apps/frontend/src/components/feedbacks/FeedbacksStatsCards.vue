<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card
      v-for="card in cards"
      :key="card.label"
      class="bg-surface-0 dark:bg-surface-800 shadow-sm"
    >
      <template #content>
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg" :class="card.iconBgClass">
            <i class="text-xl" :class="[card.iconClass, card.iconColorClass]" />
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">
              {{ card.label }}
            </p>
            <p class="text-2xl font-bold text-surface-900 dark:text-surface-0">
              {{ card.value }}
            </p>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import type { FeedbackStatistics } from '@/stores/feedbacks';

interface Props {
  stats: FeedbackStatistics;
}

const props = defineProps<Props>();

interface StatCardConfig {
  label: string;
  value: number;
  iconClass: string;
  iconBgClass: string;
  iconColorClass: string;
}

const cards = computed<StatCardConfig[]>(() => [
  {
    label: 'Сегодня',
    value: props.stats.today,
    iconClass: 'pi pi-calendar',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'За неделю',
    value: props.stats.week,
    iconClass: 'pi pi-calendar-minus',
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
  },
  {
    label: 'Всего',
    value: props.stats.allTime,
    iconClass: 'pi pi-star',
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
  },
]);
</script>
