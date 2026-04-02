<template>
  <!-- Warehouse Selection -->
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Склад <span class="text-red-500 dark:text-red-400">*</span>
    </label>
    <Select
      :model-value="modelValue || ''"
      :options="warehouseOptions"
      option-label="label"
      option-value="value"
      editable
      placeholder="Выберите склад"
      class="w-full"
      @update:model-value="onWarehouseChange"
    />
  </div>

  <!-- Transit Warehouse -->
  <div class="flex items-center gap-2">
    <Checkbox
      :model-value="useTransit"
      :binary="true"
      :disabled="isServiceCenter"
      @update:model-value="
        (value) => $emit('update:useTransit', value as boolean)
      "
    />
    <label class="text-sm text-gray-700 dark:text-gray-300">Использовать транзитный склад</label>
  </div>

  <div
    v-if="useTransit"
    class="space-y-2"
  >
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Транзитный склад <span class="text-red-500 dark:text-red-400">*</span>
    </label>
    <Select
      :model-value="transitWarehouseId || ''"
      :options="transitOptions"
      option-label="label"
      option-value="value"
      placeholder="Выберите транзитный склад"
      :disabled="!modelValue"
      class="w-full"
      @update:model-value="
        (value) => $emit('update:transitWarehouseId', Number(value))
      "
    />
  </div>

  <!-- Warehouse Balances Button -->
  <div
    v-if="modelValue"
    class="flex justify-end"
  >
    <Button
      severity="info"
      variant="outlined"
      size="small"
      :loading="supplierStore.loadingBalances"
      @click="showBalancesModal = true"
    >
      <i class="pi pi-chart-bar mr-1" />
      остатки
    </Button>
  </div>

  <!-- Warehouse Balances Modal -->
  <AutobookingWarehouseBalancesModal
    v-model:show="showBalancesModal"
    :balances="selectedWarehouseBalances"
    :loading="supplierStore.loadingBalances"
    :error="supplierStore.balancesError"
    @retry="supplierStore.fetchWarehouseBalances(props.accountId)"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSupplierStore } from '../../stores/supplier';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import AutobookingWarehouseBalancesModal from './WarehouseBalancesModal.vue';

interface WarehouseOption {
  label: string;
  value: number;
}

interface Props {
  modelValue: number | null;
  transitWarehouseId?: number | null;
  useTransit: boolean;
  warehouseOptions: WarehouseOption[];
  transitOptions: WarehouseOption[];
  loading?: boolean;
  accountId?: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: number];
  'update:transitWarehouseId': [value: number];
  'update:useTransit': [value: boolean];
  'warehouse-change': [warehouseId: number];
}>();

// Stores and reactive state
const supplierStore = useSupplierStore();
const isServiceCenter = ref<boolean>(false);
const showBalancesModal = ref(false);

// Computed for selected warehouse balances
const selectedWarehouseBalances = computed(() => {
  if (!props.modelValue) return [];
  console.log('props.modelValue: ', props.modelValue);
  console.log(
    'supplierStore.getBalancesForWarehouse(props.modelValue): ',
    supplierStore.getBalancesForWarehouse(props.modelValue),
  );
  return supplierStore.getBalancesForWarehouse(props.modelValue);
});

watch(
  () => props.modelValue,
  (modelValue) => {
    console.log('modelValue: ', modelValue);
    if (modelValue) {
      const selectedWarehouse = props.warehouseOptions.find(
        (w) => w.value === modelValue,
      );
      isServiceCenter.value =
        selectedWarehouse?.label.startsWith('СЦ ') || false;
      if (isServiceCenter.value && props.useTransit) {
        emit('update:useTransit', false);
      }
    }
  },
);

function onWarehouseChange(value: string | number) {
  const numValue = Number(value);
  console.log(numValue);
  emit('update:modelValue', numValue);
  emit('warehouse-change', numValue);
}

// Fetch balances on mount
if (props.accountId && supplierStore.warehouseBalances.length === 0) {
  supplierStore.fetchWarehouseBalances(props.accountId);
}
</script>
