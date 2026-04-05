<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :modal="true"
    :draggable="false"
    header="Товары в черновике"
    @hide="$emit('update:show', false)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <DataTable
        v-if="goods.length"
        :value="goods"
        size="small"
        class="p-datatable-sm"
      >
        <Column
          field="image"
          header="Фото"
        >
          <template #body="slotProps">
            <img
              v-if="slotProps.data.imgSrc || slotProps.data.image"
              :src="slotProps.data.imgSrc || slotProps.data.image"
              :alt="slotProps.data.imtName || slotProps.data.name"
              class="h-12 w-12 object-cover rounded"
            >
            <div
              v-else
              class="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500"
            >
              <i class="pi pi-image text-xl" />
            </div>
          </template>
        </Column>
        <Column
          field="article"
          header="Артикул"
        >
          <template #body="slotProps">
            {{
              slotProps.data.nmSa || slotProps.data.sa || slotProps.data.article
            }}
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
        <i
          class="pi pi-spin pi-spinner text-2xl text-blue-500 dark:text-blue-400"
        />
      </div>

      <div
        v-else
        class="text-center py-12 text-gray-500 dark:text-gray-400"
      >
        Товары не найдены
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

interface DraftGood {
  article?: string;
  sa?: string;
  nmSa?: string;
  image?: string;
  imgSrc?: string;
  name?: string;
  imtName?: string;
  quantity: number;
}

interface Props {
  show: boolean;
  goods: readonly DraftGood[];
  loading: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});
</script>
