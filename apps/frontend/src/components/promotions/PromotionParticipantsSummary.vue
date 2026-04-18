<template>
  <div
    class="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-6 text-sm">
        <div v-if="canEdit">
          <span class="text-gray-500 dark:text-gray-400">Режим:</span>
          <span
            :class="[
              'ml-1 font-medium',
              isRecovery
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            ]"
          >
            {{ isRecovery ? 'Восстановление' : 'Исключение' }}
          </span>
        </div>
        <div v-else>
          <span class="text-gray-500 dark:text-gray-400">Режим:</span>
          <span class="ml-1 font-medium text-gray-600 dark:text-gray-400">
            Просмотр
          </span>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400">Всего товаров:</span>
          <span class="ml-1 font-medium text-gray-900 dark:text-gray-100">
            {{ totalCount }}
          </span>
        </div>
        <div v-if="participatingCount > 0">
          <span class="text-gray-500 dark:text-gray-400">Участвует:</span>
          <span class="ml-1 font-medium text-green-600 dark:text-green-400">
            {{ participatingCount }}
          </span>
        </div>
        <div v-if="notParticipatingCount > 0">
          <span class="text-gray-500 dark:text-gray-400">Не участвует:</span>
          <span class="ml-1 font-medium text-gray-600 dark:text-gray-400">
            {{ notParticipatingCount }}
          </span>
        </div>
      </div>
      <div class="min-w-[200px]">
        <MultiSelect
          v-model="selectedColumns"
          :options="availableColumns"
          option-label="header"
          option-value="field"
          placeholder="Выберите колонки"
          class="w-full text-sm"
          display="chip"
          :max-selected-labels="3"
          :selected-items-label="'{0} колонок выбрано'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MultiSelect from 'primevue/multiselect';

export interface ColumnConfig {
  field: string;
  header: string;
  defaultVisible: boolean;
}

interface Props {
  canEdit: boolean;
  isRecovery: boolean;
  totalCount: number;
  participatingCount: number;
  notParticipatingCount: number;
  availableColumns: ColumnConfig[];
  modelValue: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const selectedColumns = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
