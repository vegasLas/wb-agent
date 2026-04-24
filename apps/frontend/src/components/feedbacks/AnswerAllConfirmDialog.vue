<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Собрать все отзывы без ответа"
    :style="{ width: '700px' }"
    :modal="true"
    :closable="!loading && !answerLoading"
  >
    <div class="flex flex-col gap-4">
      <!-- Loading state -->
      <div v-if="summaryLoading" class="flex flex-col items-center gap-3 py-6">
        <ProgressSpinner style="width: 48px; height: 48px" stroke-width="4" />
        <p class="text-sm font-medium">Собираем отзывы…</p>
        <p class="text-xs text-surface-500">Пожалуйста, подождите</p>
      </div>

      <!-- Summary state -->
      <div v-else-if="summary && !answerLoading && !result && !showConfirm">
        <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
          <i class="pi pi-info-circle text-blue-500 text-2xl" />
          <div>
            <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
              Всего неотвеченных отзывов: {{ summary.totalCount }}
            </p>
            <p class="text-xs text-surface-500">
              Доступен автоответ для товаров с накопленной историей
            </p>
          </div>
        </div>

        <DataTable
          :value="summary.groups"
          :sort-field="'count'"
          :sort-order="-1"
          :show-gridlines="false"
          scrollable
          scroll-height="320px"
          class="p-datatable-sm"
          :row-class="rowClass"
        >
          <Column field="vendorCode" header="Артикул" sortable>
            <template #body="{ data }">
              <span class="font-medium">{{ data.vendorCode || '—' }}</span>
            </template>
          </Column>

          <Column field="nmId" header="nmId" sortable>
            <template #body="{ data }">
              <span class="text-xs font-mono">{{ data.nmId }}</span>
            </template>
          </Column>

          <Column field="count" header="Отзывов" sortable>
            <template #body="{ data }">
              <span class="font-semibold">{{ data.count }}</span>
            </template>
          </Column>

          <Column header="История">
            <template #body="{ data }">
              <div v-if="data.hasEnoughHistory" class="flex items-center gap-1 text-orange-400 text-xs">
                <i class="pi pi-exclamation-circle" />
                <span>отклонено: {{ data.rejectedCount }}, ответов: {{ data.responsesCount }}</span>
              </div>
              <span v-else class="text-xs text-surface-500">—</span>
            </template>
          </Column>

          <Column header="Действие" style="width: 120px; text-align: center">
            <template #body="{ data }">
              <Button
                v-if="data.hasEnoughHistory"
                label="Ответить"
                icon="pi pi-send"
                size="small"
                severity="primary"
                @click="$emit('select-nmId', data.nmId)"
              />
              <span v-else class="text-xs text-surface-500">Недостаточно истории</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Confirmation state -->
      <div v-else-if="showConfirm && selectedGroup && !answerLoading && !result" class="flex flex-col gap-3">
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-question-circle text-yellow-600" />
            <span class="text-sm font-medium">Подтверждение</span>
          </div>
          <p class="text-sm text-surface-700 dark:text-surface-300">
            Запустить автоответ для <strong>nmId {{ selectedGroup.nmId }}</strong>
            (артикул: {{ selectedGroup.vendorCode || '—' }})?
          </p>
          <p class="text-xs text-surface-500 mt-1">
            Отзывов к обработке: {{ selectedGroup.count }}
          </p>
        </div>
      </div>

      <!-- Answer loading state -->
      <div v-if="answerLoading" class="flex flex-col items-center gap-3 py-6">
        <ProgressSpinner style="width: 48px; height: 48px" stroke-width="4" />
        <p class="text-sm font-medium">ИИ обрабатывает отзывы…</p>
        <p class="text-xs text-surface-500">Пожалуйста, не закрывайте окно</p>
      </div>

      <!-- Result state -->
      <div v-if="result && !answerLoading" class="flex flex-col gap-3">
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
      <div v-if="error && !summaryLoading && !answerLoading" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          v-if="showConfirm && !answerLoading && !result"
          label="Отмена"
          severity="secondary"
          text
          @click="$emit('cancel-confirm')"
        />
        <Button
          v-if="showConfirm && !answerLoading && !result"
          label="Подтвердить"
          icon="pi pi-send"
          severity="primary"
          @click="$emit('confirm')"
        />
        <Button
          v-if="!showConfirm && !summaryLoading && !answerLoading && !result"
          label="Закрыть"
          severity="secondary"
          text
          @click="$emit('update:visible', false)"
        />
        <Button
          v-if="result && !answerLoading"
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
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import { computed } from 'vue';
import type { ProcessResult, UnansweredSummary, UnansweredSummaryGroup } from '@/stores/feedbacks';

interface Props {
  visible: boolean;
  summaryLoading: boolean;
  answerLoading: boolean;
  summary: UnansweredSummary | null;
  selectedNmId: number | null;
  showConfirm: boolean;
  result: ProcessResult | null;
  error: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select-nmId', nmId: number): void;
  (e: 'cancel-confirm'): void;
  (e: 'confirm'): void;
}>();

const selectedGroup = computed(() => {
  if (!props.summary || props.selectedNmId === null) return null;
  return props.summary.groups.find((g) => g.nmId === props.selectedNmId) || null;
});

function rowClass(data: UnansweredSummaryGroup): string {
  return data.hasEnoughHistory ? 'bg-orange-500/5' : '';
}
</script>

<style scoped>
:deep(.p-datatable) {
  border: none;
}
:deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--p-surface-800);
}
:deep(.p-datatable-tbody > tr:last-child) {
  border-bottom: none;
}
:deep(.p-datatable-thead > tr > th) {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--p-surface-400);
  padding: 0.5rem 0.75rem;
}
:deep(.p-datatable-tbody > tr > td) {
  border: none;
  padding: 0.625rem 0.75rem;
}
:deep(.p-datatable-tbody > tr.bg-orange-500\/5 > td) {
  background-color: rgba(249, 115, 22, 0.05);
}
</style>
