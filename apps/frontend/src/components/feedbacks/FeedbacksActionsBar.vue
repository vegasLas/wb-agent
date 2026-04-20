<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
    <!-- Auto-answer toggle -->
    <div class="flex items-center gap-3">
      <ToggleSwitch
        :model-value="autoAnswerEnabled"
        @update:model-value="onToggleAutoAnswer"
        :disabled="settingsLoading"
      />
      <div class="flex flex-col">
        <span class="text-sm font-medium text-surface-900 dark:text-surface-0">
          Автоответы
        </span>
        <span class="text-xs text-surface-500 dark:text-surface-400">
          {{ autoAnswerEnabled ? 'Включены' : 'Выключены' }}
        </span>
      </div>
    </div>

    <!-- Answer All button -->
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
import ToggleSwitch from 'primevue/toggleswitch';

interface Props {
  autoAnswerEnabled: boolean;
  settingsLoading: boolean;
  answerAllLoading: boolean;
  unansweredCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:autoAnswer', value: boolean): void;
  (e: 'answer-all'): void;
}>();

const answerAllLabel = computed(() => {
  if (props.answerAllLoading) return 'Обработка...';
  if (props.unansweredCount === 0) return 'Нет отзывов';
  return `Ответить на все (${props.unansweredCount})`;
});

function onToggleAutoAnswer(value: boolean) {
  emit('update:autoAnswer', value);
}
</script>
