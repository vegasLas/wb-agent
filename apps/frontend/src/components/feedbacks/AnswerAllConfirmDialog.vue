<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="собрать все отзывы без ответа"
    :style="{ width: '720px' }"
    :modal="true"
    :closable="!summaryLoading"
  >
    <div class="flex flex-col gap-4">
      <!-- Loading state -->
      <div v-if="summaryLoading" class="flex flex-col items-center gap-3 py-6">
        <ProgressSpinner style="width: 48px; height: 48px" stroke-width="4" />
        <p class="text-sm font-medium">Собираем отзывы…</p>
        <p class="text-xs text-surface-500">Пожалуйста, подождите</p>
      </div>

      <!-- Submitted / Success state -->
      <div
        v-else-if="submitted"
        class="flex flex-col items-center gap-4 py-8"
      >
        <div
          class="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30"
        >
          <i class="pi pi-check-circle text-green-500 text-3xl" />
        </div>
        <div class="text-center">
          <p class="text-base font-semibold text-surface-900 dark:text-surface-0">
            Обработка запущена
          </p>
          <p class="text-sm text-surface-500 mt-1 max-w-sm">
            Обработка {{ submittedNmIdsCount }} выбранных товаров запущена в фоновом режиме.
            Результаты появятся через несколько минут. Вы можете продолжить работу.
          </p>
        </div>
      </div>

      <!-- Summary state -->
      <div v-else-if="summary">
        <div
          class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3"
        >
          <i class="pi pi-info-circle text-blue-500 text-2xl" />
          <div>
            <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
              Всего неотвеченных отзывов: {{ summary.totalCount }}
            </p>
            <p class="text-xs text-surface-500">
              Доступен автоответ только для товаров с накопленной историей
            </p>
          </div>
        </div>

        <DataTable
          v-model:selection="selectedRows"
          :value="sortedGroups"
          :show-gridlines="false"
          scrollable
          scroll-height="320px"
          class="p-datatable-sm"
          :row-class="rowClass"
          data-key="nmId"
        >
          <Column header-style="width: 3rem">
            <template #header>
              <div class="flex justify-center">
                <Checkbox
                  :model-value="isAllSelectableSelected"
                  :binary="true"
                  :disabled="selectableGroups.length === 0"
                  @update:model-value="toggleSelectAll"
                />
              </div>
            </template>
            <template #body="{ data }">
              <div class="flex justify-center">
                <Checkbox
                  :model-value="isSelected(data)"
                  :binary="true"
                  :disabled="!data.hasEnoughHistory"
                  @update:model-value="(val: boolean) => toggleRow(data, val)"
                />
              </div>
            </template>
          </Column>

          <Column field="vendorCode" header="Артикул">
            <template #body="{ data }">
              <span class="font-medium">{{ data.vendorCode || '—' }}</span>
            </template>
          </Column>

          <Column field="nmId" header="nmId">
            <template #body="{ data }">
              <span class="text-xs font-mono">{{ data.nmId }}</span>
            </template>
          </Column>

          <Column field="count" header="Отзывов">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.count }}</span>
            </template>
          </Column>

          <Column header="История">
            <template #body="{ data }">
              <div
                v-if="data.hasEnoughHistory"
                class="flex items-center gap-1 text-orange-400 text-xs"
              >
                <i class="pi pi-exclamation-circle" />
                <span
                  >отклонено: {{ data.rejectedCount }}, ответов:
                  {{ data.responsesCount }}</span
                >
              </div>
              <span v-else class="text-xs text-surface-500"
                >Недостаточно истории</span
              >
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Error state -->
      <div
        v-if="error && !summaryLoading"
        class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm"
      >
        {{ error }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="submitted ? 'Продолжить работу' : 'Закрыть'"
          severity="secondary"
          text
          @click="$emit('update:visible', false)"
        />
        <Button
          v-if="!submitted"
          :label="actionButtonLabel"
          icon="pi pi-send"
          severity="primary"
          :disabled="selectedRows.length === 0 || !summary"
          @click="onConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import { computed, ref, watch } from 'vue';
import type {
  UnansweredSummary,
  UnansweredSummaryGroup,
} from '@/stores/feedbacks';

interface Props {
  visible: boolean;
  summaryLoading: boolean;
  summary: UnansweredSummary | null;
  error: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm-bulk', nmIds: number[]): void;
}>();

const selectedRows = ref<UnansweredSummaryGroup[]>([]);
const submitted = ref(false);
const submittedNmIdsCount = ref(0);

// Reset state when dialog opens/closes
watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen) {
      submitted.value = false;
      submittedNmIdsCount.value = 0;
    }
  },
);

// Reset selection when dialog opens with new data
watch(
  () => props.summary,
  () => {
    selectedRows.value = [];
    submitted.value = false;
    submittedNmIdsCount.value = 0;
  },
);

const selectableGroups = computed(() => {
  return props.summary?.groups.filter((g) => g.hasEnoughHistory) || [];
});

// Sort: hasEnoughHistory first, then by count descending
const sortedGroups = computed(() => {
  if (!props.summary) return [];
  return [...props.summary.groups].sort((a, b) => {
    if (a.hasEnoughHistory && !b.hasEnoughHistory) return -1;
    if (!a.hasEnoughHistory && b.hasEnoughHistory) return 1;
    return b.count - a.count;
  });
});

const isAllSelectableSelected = computed(() => {
  if (selectableGroups.value.length === 0) return false;
  return selectableGroups.value.every((g) =>
    selectedRows.value.some((r) => r.nmId === g.nmId),
  );
});

const totalSelectedCount = computed(() => {
  return selectedRows.value.reduce((sum, g) => sum + g.count, 0);
});

const actionButtonLabel = computed(() => {
  const count = selectedRows.value.length;
  if (count === 0) return 'Ответить выбранные';
  return `Ответить выбранные (${count} товаров, ${totalSelectedCount.value} отзывов)`;
});

function rowClass(data: UnansweredSummaryGroup): string {
  return data.hasEnoughHistory ? 'bg-orange-500/5' : 'opacity-60';
}

function isSelected(data: UnansweredSummaryGroup): boolean {
  return selectedRows.value.some((r) => r.nmId === data.nmId);
}

function toggleRow(data: UnansweredSummaryGroup, checked: boolean) {
  if (!data.hasEnoughHistory) return;
  if (checked) {
    if (!isSelected(data)) {
      selectedRows.value = [...selectedRows.value, data];
    }
  } else {
    selectedRows.value = selectedRows.value.filter((r) => r.nmId !== data.nmId);
  }
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedRows.value = [...selectableGroups.value];
  } else {
    selectedRows.value = [];
  }
}

function onConfirm() {
  if (selectedRows.value.length === 0) return;
  const nmIds = selectedRows.value.map((g) => g.nmId);
  submittedNmIdsCount.value = nmIds.length;
  submitted.value = true;
  emit('confirm-bulk', nmIds);
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
:deep(.p-datatable-tbody > tr.opacity-60) {
  opacity: 0.6;
}
</style>
