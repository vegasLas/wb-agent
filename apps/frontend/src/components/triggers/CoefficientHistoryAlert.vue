<template>
  <BaseAlert
    v-if="coefficientHistory.length > 0"
    color="primary"
    variant="soft"
    title="Последние коэффициенты:"
    class="mt-2"
  >
    <template #default>
      <div class="space-y-2">
        <div class="flex items-center justify-end">
          <BaseButton
            variant="ghost"
            size="xs"
            @click="toggleExpanded"
          >
            <component
              :is="isExpanded ? ChevronUpIcon : ChevronDownIcon"
              class="w-4 h-4"
            />
          </BaseButton>
        </div>
        <div v-if="isExpanded" class="space-y-1 max-h-60 overflow-y-auto">
          <div
            v-for="(coefficient, index) in coefficientHistory"
            :key="index"
            class="flex items-center gap-2 text-xs flex-wrap"
          >
            <span
              v-if="warehouseIdsArray.length > 1"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              {{ coefficient.warehouseName }}
            </span>
            <span
              v-if="supplyTypesArray.length > 1"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
            >
              {{ coefficient.supplyTypeLabel }}
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {{ formatCoefficientDate(coefficient.date) }}
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
              коэф: {{ coefficient.maxCoefficient }}
            </span>
            <span class="text-gray-500">
              обновлен: {{ formatCaptureDate(coefficient.updatedAt) }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </BaseAlert>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { useCoefficientsStore } from '../../stores/coefficients';
import { useWarehousesStore } from '../../stores/warehouses';
import BaseAlert from '../ui/BaseAlert.vue';
import BaseButton from '../ui/BaseButton.vue';

interface Props {
  warehouseId?: number | null;
  warehouseIds?: number[];
  supplyType?: string;
  supplyTypes?: string[];
}

const props = defineProps<Props>();

const coefficientsStore = useCoefficientsStore();
const warehouseStore = useWarehousesStore();

// State for expand/collapse
const isExpanded = ref(false);

// Computed to get warehouse IDs array (either single or multiple)
const warehouseIdsArray = computed(() => {
  if (props.warehouseIds && props.warehouseIds.length > 0) {
    return props.warehouseIds;
  }
  if (props.warehouseId) {
    return [props.warehouseId];
  }
  return [];
});

// Computed to get supply types array (either single or multiple)
const supplyTypesArray = computed(() => {
  if (props.supplyTypes && props.supplyTypes.length > 0) {
    return props.supplyTypes;
  }
  if (props.supplyType) {
    return [props.supplyType];
  }
  return [];
});

// Function to get supply type label
function getSupplyTypeLabel(type: string): string {
  switch (type) {
    case 'BOX':
      return 'Короба';
    case 'SUPERSAFE':
      return 'Суперсейф';
    case 'MONOPALLETE':
      return 'Монопаллеты';
    default:
      return type;
  }
}

// Computed to get coefficient history for all warehouses and supply types
const coefficientHistory = computed(() => {
  if (
    warehouseIdsArray.value.length === 0 ||
    supplyTypesArray.value.length === 0
  ) {
    return [];
  }

  const allHistory: Array<{
    warehouseId: number;
    warehouseName: string;
    supplyType: string;
    supplyTypeLabel: string;
    date: string;
    maxCoefficient: number;
    updatedAt: string;
  }> = [];

  warehouseIdsArray.value.forEach((warehouseId) => {
    supplyTypesArray.value.forEach((supplyType) => {
      const history = coefficientsStore.getLastThreeCoefficientDetails(warehouseId, supplyType);
      history.forEach((item) => {
        allHistory.push({
          ...item,
          warehouseId,
          warehouseName: warehouseStore.getWarehouseName(warehouseId),
          supplyType,
          supplyTypeLabel: getSupplyTypeLabel(supplyType),
        });
      });
    });
  });

  // Sort by date (newest first)
  return allHistory.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
});

function formatCoefficientDate(dateString: string): string {
  const date = new Date(dateString);
  // Use UTC timezone for global consistency
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatCaptureDate(dateString: string): string {
  const date = new Date(dateString);
  // Use UTC timezone for global consistency
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}
</script>
