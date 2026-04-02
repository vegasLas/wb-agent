<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :modal="true"
    header="Остатки на складе"
    @hide="$emit('update:show', false)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <DataTable
        v-if="balances.length"
        :value="balances"
        size="small"
        class="p-datatable-sm"
      >
        <Column
          field="supplierArticle"
          header="Артикул"
        >
          <template #body="slotProps">
            {{ slotProps.data.supplierArticle }}
          </template>
        </Column>
        <Column
          field="quantity"
          header="Количество"
        >
          <template #body="slotProps">
            {{ slotProps.data.quantity }} шт.
          </template>
        </Column>
      </DataTable>

      <div
        v-else-if="loading"
        class="flex justify-center items-center py-12"
      >
        <i class="pi pi-spin pi-spinner text-2xl text-blue-500 dark:text-blue-400" />
      </div>

      <div
        v-else-if="error"
        class="text-center py-12"
      >
        <div class="text-red-500 dark:text-red-400 mb-4">
          {{ error }}
        </div>
        <Button
          severity="danger"
          variant="outlined"
          @click="$emit('retry')"
        >
          Попробовать снова
        </Button>
      </div>

      <div
        v-else
        class="text-center py-12 text-gray-500 dark:text-gray-400"
      >
        Остатки не найдены
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <p
          v-if="balances.length"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          Всего товаров: {{ totalQuantity }} шт.
        </p>
        <div />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

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
const emit = defineEmits<{
  'update:show': [value: boolean];
  retry: [];
}>();

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

const totalQuantity = computed(() =>
  props.balances.reduce((sum, item) => sum + item.quantity, 0),
);
</script>
