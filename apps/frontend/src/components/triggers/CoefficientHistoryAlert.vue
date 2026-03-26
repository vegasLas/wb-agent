<template>
  <Message
    v-if="coefficientHistory.length > 0"
    severity="info"
    :closable="false"
    class="mt-2"
  >
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-medium">Последние коэффициенты:</span>
        <Button
          variant="text"
          size="small"
          @click="toggleExpanded"
        >
          <i :class="isExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
        </Button>
      </div>
      <div v-if="isExpanded" class="space-y-1 max-h-60 overflow-y-auto">
        <div
          v-for="(coefficient, index) in coefficientHistory"
          :key="index"
          class="flex items-center gap-2 text-xs flex-wrap"
        >
          <Tag
            v-if="warehouseIdsArray.length > 1"
            severity="info"
            :value="coefficient.warehouseName"
            class="text-xs"
          />
          <Tag
            v-if="supplyTypesArray.length > 1"
            severity="success"
            :value="coefficient.supplyTypeLabel"
            class="text-xs"
          />
          <Tag
            severity="secondary"
            :value="formatCoefficientDate(coefficient.date)"
            class="text-xs"
          />
          <Tag
            severity="warn"
            :value="'коэф: ' + coefficient.maxCoefficient"
            class="text-xs"
          />
          <span class="text-gray-500">
            обновлен: {{ formatCaptureDate(coefficient.updatedAt) }}
          </span>
        </div>
      </div>
    </div>
  </Message>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCoefficientsStore } from '../../stores/coefficients';
import { useWarehousesStore } from '../../stores/warehouses';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

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
