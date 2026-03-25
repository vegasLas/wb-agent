<template>
  <BaseModal
    :model-value="show"
    title="Товары в поставке"
    @update:model-value="(value) => $emit('update:show', value)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <!-- Goods Table (when data exists) -->
      <div v-if="goods.length" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Название</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Количество</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Детали</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="row in goods" :key="row.barcode || row.id">
              <td class="px-3 py-2 whitespace-nowrap">
                <img
                  v-if="row.imgSrc"
                  :src="row.imgSrc"
                  class="w-10 h-10 rounded object-cover"
                  :alt="row.imtName"
                />
              </td>
              <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{{ row.imtName }}</td>
              <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{{ row.quantity }} шт.</td>
              <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                <div v-if="row.brandName">{{ row.brandName }}</div>
                <div v-if="row.subjectName">{{ row.subjectName }}</div>
                <div v-if="row.colorName" class="text-gray-500">
                  {{ row.colorName }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading State -->
      <div
        v-else-if="loading"
        class="flex justify-center items-center py-12"
      >
        <ArrowPathIcon class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <!-- Error/Empty State -->
      <div v-else class="text-center py-12 text-gray-500">
        {{ error || 'Товары не найдены' }}
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import { BaseModal } from '../ui';
import type { SupplyGood } from '../../types';

interface Props {
  show: boolean;
  goods: SupplyGood[];
  loading: boolean;
  error?: string | null;
}

defineProps<Props>();

defineEmits<{
  'update:show': [value: boolean];
}>();
</script>
