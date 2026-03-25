<template>
  <BaseModal
    :model-value="show"
    title="Остатки на складе"
    size="lg"
    @update:model-value="(value) => $emit('update:show', value)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <table v-if="balances.length" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Артикул</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Бренд</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Предмет</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Количество</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="item in balances" :key="item.supplierArticle">
            <td class="px-4 py-2 text-sm">{{ item.supplierArticle }}</td>
            <td class="px-4 py-2 text-sm">{{ item.brand }}</td>
            <td class="px-4 py-2 text-sm">{{ item.subject }}</td>
            <td class="px-4 py-2 text-sm">{{ item.quantity }} шт.</td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <div class="text-red-500 mb-4">{{ error }}</div>
        <BaseButton color="red" variant="soft" @click="$emit('retry')">
          Попробовать снова
        </BaseButton>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        Остатки не найдены
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <p v-if="balances.length" class="text-sm text-gray-500">
          Всего товаров: {{ totalQuantity }} шт.
        </p>
        <div></div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BaseModal, BaseButton } from '../ui';

interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

interface Props {
  show: boolean;
  balances: GoodBalance[];
  loading: boolean;
  error?: string | null;
}

const props = defineProps<Props>();
defineEmits<{
  'update:show': [value: boolean];
  retry: [];
}>();

const totalQuantity = computed(() =>
  props.balances.reduce((sum, item) => sum + item.quantity, 0),
);
</script>
