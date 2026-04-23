<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
    <!-- Left: Auto-answers button -->
    <Button
      label="Автоответы"
      icon="pi pi-cog"
      severity="secondary"
      :loading="settingsLoading"
      @click="$emit('open-auto-answers')"
    />

    <!-- Right: Answer All button -->
    <Button
      :label="answerAllLabel"
      icon="pi pi-send"
      severity="primary"
      :loading="answerAllLoading"
      :disabled="answerAllLoading || unansweredCount === 0"
      @click="$emit('answer-all')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

interface Props {
  settingsLoading: boolean;
  answerAllLoading: boolean;
  unansweredCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'open-auto-answers'): void;
  (e: 'answer-all'): void;
}>();

const answerAllLabel = computed(() => {
  if (props.answerAllLoading) return 'Обработка...';
  if (props.unansweredCount === 0) return 'Нет отзывов';
  return `Ответить на все (${props.unansweredCount})`;
});
</script>
