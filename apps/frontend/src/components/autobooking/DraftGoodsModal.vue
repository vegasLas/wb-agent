<template>
  <Dialog
    v-model:visible="visible"
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
        <Column field="image" header="Фото">
          <template #body="slotProps">
            <img
              v-if="slotProps.data.imgSrc"
              :src="slotProps.data.imgSrc"
              :alt="slotProps.data.imtName"
              class="h-12 w-12 object-cover rounded"
            />
            <div
              v-else
              class="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-gray-400"
            >
              <i class="pi pi-image text-xl"></i>
            </div>
          </template>
        </Column>
        <Column field="article" header="Артикул">
          <template #body="slotProps">
            {{ slotProps.data.nmSa }}
          </template>
        </Column>
        <Column field="quantity" header="Количество">
          <template #body="slotProps">
            {{ slotProps.data.quantity }} шт.
          </template>
        </Column>
      </DataTable>

      <div v-else-if="loading" class="flex justify-center items-center py-12">
        <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
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
  image?: string;
  name: string;
  quantity: number;
}

interface Props {
  show: boolean;
  goods: DraftGood[];
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
