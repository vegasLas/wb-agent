<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card class="bg-surface-0 dark:bg-surface-800 shadow-sm">
      <template #content>
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <i class="pi pi-calendar text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">
              Сегодня
            </p>
            <p class="text-2xl font-bold text-surface-900 dark:text-surface-0">
              {{ stats.today }}
            </p>
          </div>
        </div>
      </template>
    </Card>

    <Card class="bg-surface-0 dark:bg-surface-800 shadow-sm">
      <template #content>
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
            <i class="pi pi-calendar-minus text-green-600 dark:text-green-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">
              За неделю
            </p>
            <p class="text-2xl font-bold text-surface-900 dark:text-surface-0">
              {{ stats.week }}
            </p>
          </div>
        </div>
      </template>
    </Card>

    <Card class="bg-surface-0 dark:bg-surface-800 shadow-sm">
      <template #content>
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <i class="pi pi-star text-purple-600 dark:text-purple-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">
              Всего
            </p>
            <p class="text-2xl font-bold text-surface-900 dark:text-surface-0">
              {{ stats.allTime }}
            </p>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
import type { FeedbackStatistics } from '@/stores/feedbacks';

interface Props {
  stats: FeedbackStatistics;
}

defineProps<Props>();
</script>
