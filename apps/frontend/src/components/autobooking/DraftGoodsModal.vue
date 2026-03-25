<template>
  <BaseModal
    :model-value="show"
    title="Товары в черновике"
    size="lg"
    @update:model-value="(value) => $emit('update:show', value)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <table v-if="goods.length" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Фото</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Артикул</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Количество</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="item in goods" :key="item.article">
            <td class="px-4 py-2">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.name"
                class="h-12 w-12 object-cover rounded"
              />
              <div v-else class="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                <PhotoIcon class="w-6 h-6" />
              </div>
            </td>
            <td class="px-4 py-2 text-sm">{{ item.name || item.article }}</td>
            <td class="px-4 py-2 text-sm">{{ item.quantity }} шт.</td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        Товары не найдены
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { PhotoIcon } from '@heroicons/vue/24/outline';
import { BaseModal } from '../ui';

interface DraftGood {
  article?: string;
  image?: string;
  name: string;
  quantity: number;
}

interface Props {
  show: boolean;
  goods: DraftGood[];
  loading: boolean;
}

defineProps<Props>();
defineEmits<{
  'update:show': [value: boolean];
}>();
</script>
