<template>
  <Dialog
    v-model:visible="visible"
    header="Товары в поставке"
    :style="{ width: '90vw', maxWidth: '800px' }"
    :modal="true"
  >
    <div class="max-h-[60vh] overflow-auto">
      <!-- Goods DataTable (when data exists) -->
      <DataTable
        v-if="goods.length"
        :value="goods"
        size="small"
        class="p-datatable-sm"
      >
        <Column
          header=""
          style="width: 4rem"
        >
          <template #body="slotProps">
            <img
              v-if="slotProps.data.imgSrc"
              :src="slotProps.data.imgSrc"
              class="w-10 h-10 rounded object-cover"
              :alt="slotProps.data.imtName"
            >
          </template>
        </Column>
        <Column
          field="imtName"
          header="Название"
        >
          <template #body="slotProps">
            <span class="text-sm text-gray-900 dark:text-gray-100">{{
              slotProps.data.imtName
            }}</span>
          </template>
        </Column>
        <Column
          field="quantity"
          header="Количество"
        >
          <template #body="slotProps">
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ slotProps.data.quantity }} шт.</span>
          </template>
        </Column>
        <Column
          field="details"
          header="Детали"
        >
          <template #body="slotProps">
            <div class="text-xs text-gray-600 dark:text-gray-400">
              <div v-if="slotProps.data.brandName">
                {{ slotProps.data.brandName }}
              </div>
              <div v-if="slotProps.data.subjectName">
                {{ slotProps.data.subjectName }}
              </div>
              <div
                v-if="slotProps.data.colorName"
                class="text-gray-500"
              >
                {{ slotProps.data.colorName }}
              </div>
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Loading State -->
      <div
        v-else-if="loading"
        class="flex justify-center items-center py-12"
      >
        <i class="pi pi-refresh animate-spin text-4xl text-gray-400" />
      </div>

      <!-- Error/Empty State -->
      <div
        v-else
        class="text-center py-12 text-gray-500"
      >
        {{ error || 'Товары не найдены' }}
      </div>
    </div>
    <template #footer>
      <Button
        label="Закрыть"
        @click="visible = false"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { SupplyGood } from '../../types';

interface Props {
  show: boolean;
  goods: SupplyGood[];
  loading: boolean;
  error?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
  },
});
</script>
