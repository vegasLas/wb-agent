<template>
  <Dialog
    :visible="visible"
    :header="`Тарифы: ${cardTitle}`"
    :style="{ width: '95vw', maxWidth: '1400px' }"
    :modal="true"
    :closable="true"
    @update:visible="$emit('update:visible', $event)"
    @hide="$emit('hide')"
  >
    <div class="space-y-4">
      <!-- Warehouse filter -->
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
      <template v-else-if="hasTariffs">
        <DataTable
          :value="filteredTariffs"
          striped-rows
          class="p-datatable-sm"
          scrollable
          scroll-height="400px"
        >
          <ColumnGroup type="header">
            <Row>
              <Column
                header="Склад"
                :rowspan="2"
                style="min-width: 10rem"
              />
              <Column
                header="Стоимость логистики по складам и типам поставки"
                :colspan="3"
                style="min-width: 24rem"
              />
              <Column
                header="Стоимость хранения в день"
                :colspan="2"
                style="min-width: 16rem"
              />
              <Column
                header="Стоимость приёмки"
                :colspan="3"
                style="min-width: 24rem"
              />
            </Row>
            <Row>
              <Column header="Короб" />
              <Column header="Монопаллета" />
              <Column header="Стоимость обратной логистики (возврата)" />
              <Column header="Короб" />
              <Column header="Монопаллета" />
              <Column header="Короб" />
              <Column header="Монопаллета" />
              <Column header="Суперсейф" />
            </Row>
          </ColumnGroup>

          <Column field="warehouseName" />
          <Column field="delivery" />
          <Column field="deliveryMonopallet" />
          <Column field="deliveryReturn" />
          <Column field="storageMonoAndMix" />
          <Column field="storageMonopallet" />
          <Column field="acceptanceMonoAndMix" />
          <Column field="acceptanceMonopallet" />
          <Column field="acceptanceSuperSafe" />
        </DataTable>
      </template>

      <!-- Empty -->
      <EmptyState
        v-else-if="!loading && !error"
        icon="pi pi-truck"
        message="Нет данных о тарифах"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';
import Row from 'primevue/row';
import Select from 'primevue/select';
import ErrorMessage from '@/components/common/ErrorMessage.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useWarehousesStore } from '@/stores/warehouses';
import type { TariffWarehouse, ContentCardTableItem } from '@/types';

const props = defineProps<{
  visible: boolean;
  card: ContentCardTableItem | null;
  loading: boolean;
  error: string | null;
  hasTariffs: boolean;
  tariffs: TariffWarehouse[];
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

const filteredTariffs = computed(() => {
  if (!selectedWarehouse.value) return props.tariffs;
  const warehouseName = warehouseStore.warehouses.find(
    (w) => w.ID === selectedWarehouse.value,
  )?.name;
  if (!warehouseName) return props.tariffs;
  return props.tariffs.filter((t) =>
    t.warehouseName.toLowerCase().includes(warehouseName.toLowerCase()),
  );
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
