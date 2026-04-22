<template>
  <Dialog
    :visible="visible"
    :header="dialogHeader"
    :modal="true"
    :closable="false"
    :style="{ width: '450px' }"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <div class="space-y-4">
      <p class="text-surface-700 dark:text-surface-300">
        {{ dialogMessage }}
      </p>
      <div
        v-if="targetType === 'category' && categoryStat"
        class="bg-surface-100 dark:bg-surface-800 p-3 rounded-lg text-sm"
      >
        <div class="flex justify-between">
          <span>Опубликовано:</span>
          <span class="font-medium">{{ categoryStat.postedCount }}</span>
        </div>
        <div class="flex justify-between">
          <span>Отклонено:</span>
          <span class="font-medium">{{ categoryStat.rejectedCount }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Отмена"
          severity="secondary"
          @click="onCancel"
        />
        <Button
          label="Включить"
          severity="primary"
          @click="onConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import type { CategoryStat } from '@/api/feedbacks/types';

interface Props {
  visible: boolean;
  targetType: 'category' | 'product';
  targetName: string;
  categoryStat?: CategoryStat;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
}>();

const dialogHeader = computed(() => {
  return props.targetType === 'category'
    ? `Включить автоответ для категории`
    : `Включить автоответ для товара`;
});

const dialogMessage = computed(() => {
  if (props.targetType === 'category') {
    return `Включить автоответ для категории «${props.targetName}»? Это позволит автоматически генерировать и публиковать ответы для всех отзывов в этой категории.`;
  }
  return `Включить автоответ для товара «${props.targetName}»?`;
});

function onCancel() {
  emit('update:visible', false);
}

function onConfirm() {
  emit('confirm');
  emit('update:visible', false);
}
</script>
