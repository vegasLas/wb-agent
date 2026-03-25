<template>
  <!-- Warehouse Selection -->
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Склад <span class="text-red-500">*</span>
    </label>
    <BaseSelect
      :model-value="modelValue || ''"
      :options="warehouseOptions"
      placeholder="Выберите склад"
      @update:model-value="onWarehouseChange"
    />
  </div>

  <!-- Transit Warehouse -->
  <div class="flex items-center gap-2">
    <input
      :checked="useTransit"
      type="checkbox"
      :disabled="isServiceCenter"
      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      @change="(e) => $emit('update:useTransit', (e.target as HTMLInputElement).checked)"
    />
    <label class="text-sm text-gray-700 dark:text-gray-300">Использовать транзитный склад</label>
  </div>

  <div v-if="useTransit" class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Транзитный склад <span class="text-red-500">*</span>
    </label>
    <BaseSelect
      :model-value="transitWarehouseId || ''"
      :options="transitOptions"
      placeholder="Выберите транзитный склад"
      :disabled="!modelValue"
      @update:model-value="(value) => $emit('update:transitWarehouseId', Number(value))"
    />
  </div>

  <!-- Warehouse Balances Button -->
  <div v-if="modelValue" class="flex justify-end">
    <BaseButton
      color="blue"
      variant="soft"
      size="sm"
      :loading="supplierStore.loadingBalances"
      @click="showBalancesModal = true"
    >
      <ChartBarIcon class="w-4 h-4 mr-1" />
      остатки
    </BaseButton>
  </div>

  <!-- Warehouse Balances Modal -->
  <AutobookingWarehouseBalancesModal
    v-model:show="showBalancesModal"
    :balances="selectedWarehouseBalances"
    :loading="supplierStore.loadingBalances"
    :error="supplierStore.balancesError"
    @retry="supplierStore.fetchWarehouseBalances(props.supplierId)"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChartBarIcon } from '@heroicons/vue/24/outline';
import { useSupplierStore } from '../../stores/supplier';
import { BaseButton, BaseSelect } from '../ui';
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
  supplierId?: string;
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
  return supplierStore.warehouseBalances;
});

watch(
  () => props.modelValue,
  (modelValue) => {
    if (modelValue) {
      const selectedWarehouse = props.warehouseOptions.find(
        (w) => w.value === modelValue,
      );
      isServiceCenter.value = selectedWarehouse?.label.startsWith('СЦ ') || false;
      if (isServiceCenter.value && props.useTransit) {
        emit('update:useTransit', false);
      }
    }
  },
);

function onWarehouseChange(value: string | number) {
  const numValue = Number(value);
  emit('update:modelValue', numValue);
  emit('warehouse-change', numValue);
}

// Fetch balances on mount
if (props.supplierId) {
  supplierStore.fetchWarehouseBalances(props.supplierId);
}
</script>
