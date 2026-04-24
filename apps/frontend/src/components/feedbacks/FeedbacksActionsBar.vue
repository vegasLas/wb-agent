<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3">
    <!-- Left: Answer All button -->
    <Button
      :label="answerAllLabel"
      icon="pi pi-send"
      severity="primary"
      :loading="answerAllLoading"
      @click="$emit('answer-all')"
    />

    <!-- Right: Auto-answers button -->
    <Button
      label="Автоответы"
      icon="pi pi-cog"
      severity="secondary"
      :loading="settingsLoading"
      @click="$emit('open-auto-answers')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

interface Props {
  settingsLoading: boolean;
  answerAllLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'open-auto-answers'): void;
  (e: 'answer-all'): void;
}>();

const answerAllLabel = computed(() => {
  if (props.answerAllLoading) return 'Обработка...';
  return 'Собрать все отзывы без ответа';
});
</script>
