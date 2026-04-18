<template>
  <Dialog
    :visible="visible"
    :header="`Комиссии: ${cardTitle}`"
    :style="{ width: '95vw', maxWidth: '1100px' }"
    :modal="true"
    :closable="true"
    @update:visible="$emit('update:visible', $event)"
    @hide="$emit('hide')"
  >
    <div class="space-y-4">
      <!-- Warehouse filter (UX context) -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-500">Склад:</label>
        <Select
          v-model="selectedWarehouse"
          :options="warehouseOptions"
          option-label="name"
          option-value="id"
          filter
          show-clear
          placeholder="Все склады"
          class="w-full max-w-xs"
        />
      </div>

      <!-- Error -->
      <ErrorMessage
        v-if="error"
        :message="error"
      />

      <!-- Loading -->
      <LoadingSpinner v-if="loading" />

      <!-- Content -->
      <template v-else-if="hasCommissions">
        <DataTable
          :value="commissions"
          striped-rows
          class="p-datatable-sm"
          scrollable
          scroll-height="400px"
        >
          <Column
            field="name"
            header="Категория"
            style="min-width: 8rem"
          />
          <Column
            field="subject"
            header="Предмет"
            style="min-width: 8rem"
          />
          <Column
            field="percent"
            header="Склад WB (FBW), %"
            style="min-width: 8rem"
          >
            <template #body="{ data }">
              <span class="font-medium">{{ data.percent }}</span>
            </template>
          </Column>
          <Column
            field="percentFBS"
            header="Маркетплейс (FBS), %"
            style="min-width: 8rem"
          >
            <template #body="{ data }">
              <span class="font-medium">{{ data.percentFBS }}</span>
            </template>
          </Column>
          <Column
            field="kgvpSupplier"
            header="Витрина (DBS)/Курьер WB (DBW), %"
            style="min-width: 10rem"
          >
            <template #body="{ data }">
              <span>{{ data.kgvpSupplier }}</span>
            </template>
          </Column>
          <Column
            field="kgvpSupplierExpress"
            header="Витрина экспресс (EDBS), %"
            style="min-width: 9rem"
          >
            <template #body="{ data }">
              <span>{{ data.kgvpSupplierExpress }}</span>
            </template>
          </Column>
          <Column
            field="kgvpPickup"
            header="Самовывоз из магазина продавца (C&C), %"
            style="min-width: 11rem"
          >
            <template #body="{ data }">
              <span>{{ data.kgvpPickup }}</span>
            </template>
          </Column>
        </DataTable>
      </template>

      <!-- Empty -->
      <EmptyState
        v-else-if="!loading && !error"
        icon="pi pi-percentage"
        message="Нет данных о комиссиях"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import ErrorMessage from '@/components/common/ErrorMessage.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useWarehousesStore } from '@/stores/warehouses';
import type { CommissionCategory, ContentCardTableItem } from '@/types';

const props = defineProps<{
  visible: boolean;
  card: ContentCardTableItem | null;
  loading: boolean;
  error: string | null;
  hasCommissions: boolean;
  commissions: CommissionCategory[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'hide': [];
}>();

const warehouseStore = useWarehousesStore();
const selectedWarehouse = ref<number | null>(null);

const cardTitle = computed(() => props.card?.title || 'Карточка');

const warehouseOptions = computed(() => {
  const allOption = { id: null as number | null, name: 'Все склады' };
  const list = warehouseStore.warehouses.map((w) => ({
    id: w.ID,
    name: w.name,
  }));
  return [allOption, ...list];
});

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      selectedWarehouse.value = null;
      warehouseStore.fetchWarehouses();
    }
  },
);
</script>
