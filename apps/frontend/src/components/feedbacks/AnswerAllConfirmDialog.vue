<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Ответить на все отзывы"
    :style="{ width: '450px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="flex flex-col gap-4">
      <!-- Initial confirmation state -->
      <div v-if="!loading && !result" class="flex flex-col gap-3">
        <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <i class="pi pi-info-circle text-blue-500 text-2xl" />
          <div>
            <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
              Найдено {{ count }} неотвеченных отзывов
            </p>
            <p class="text-xs text-surface-500">
              ИИ сгенерирует и опубликует ответы на все отзывы. Это может занять некоторое время.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex flex-col items-center gap-3 py-6">
        <ProgressSpinner style="width: 48px; height: 48px" stroke-width="4" />
        <p class="text-sm font-medium">ИИ обрабатывает отзывы...</p>
        <p class="text-xs text-surface-500">Пожалуйста, не закрывайте окно</p>
      </div>

      <!-- Result state -->
      <div v-if="result && !loading" class="flex flex-col gap-3">
        <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-check-circle text-green-500" />
            <span class="text-sm font-medium">Обработка завершена</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 bg-white dark:bg-surface-800 rounded">
              <p class="text-lg font-bold text-surface-900 dark:text-surface-0">{{ result.processed }}</p>
              <p class="text-xs text-surface-500">Обработано</p>
            </div>
            <div class="p-2 bg-white dark:bg-surface-800 rounded">
              <p class="text-lg font-bold text-green-600">{{ result.posted }}</p>
              <p class="text-xs text-surface-500">Опубликовано</p>
            </div>
            <div class="p-2 bg-white dark:bg-surface-800 rounded">
              <p class="text-lg font-bold text-surface-500">{{ result.skipped + result.failed }}</p>
              <p class="text-xs text-surface-500">Пропущено</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error && !loading" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          v-if="!loading && !result"
          label="Отмена"
          severity="secondary"
          text
          @click="$emit('update:visible', false)"
        />
        <Button
          v-if="!loading && !result"
          label="Подтвердить"
          icon="pi pi-send"
          severity="primary"
          @click="$emit('confirm')"
        />
        <Button
          v-if="result && !loading"
          label="Закрыть"
          severity="secondary"
          @click="$emit('update:visible', false)"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';

interface ProcessResult {
  processed: number;
  posted: number;
  skipped: number;
  failed: number;
}

interface Props {
  visible: boolean;
  count: number;
  loading: boolean;
  result: ProcessResult | null;
  error: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>
