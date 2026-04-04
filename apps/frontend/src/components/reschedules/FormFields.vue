<template>
  <div class="space-y-4">
    <!-- Supply Selection -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Поставка
      </label>
      <div class="flex gap-2">
        <Select
          :model-value="selectedSupplyId"
          :options="supplyOptions"
          :loading="loadingSupplies"
          placeholder="Выберите поставку"
          option-value="supplyId"
          option-label="displayName"
          class="flex-1 min-w-0"
          @update:model-value="handleSupplyChange"
        />
        <Button
          size="small"
          severity="info"
          variant="outlined"
          :loading="loadingSupplies"
          class="flex-shrink-0"
          @click="refreshSupplies"
        >
          <i class="pi pi-refresh" />
        </Button>
      </div>
      <p v-if="suppliesError" class="text-sm text-red-600 dark:text-red-400">
        {{ suppliesError }}
      </p>
      <p
        v-else-if="supplyOptions.length === 0 && !loadingSupplies"
        class="text-sm text-gray-500"
      >
        Нет доступных поставок
      </p>
    </div>

    <!-- Supply Information Toggle -->
    <div v-if="selectedSupply" class="flex items-center justify-end">
      <Button size="small" variant="outlined" @click="openSupplyDetails">
        <i class="pi pi-info-circle mr-1" />
        детали
      </Button>
    </div>

    <!-- Date Selection - Only show when supply is selected -->
    <DateSelection
      v-if="selectedSupply"
      :date-type="selectedDateType"
      :start-date="startDateInput"
      :end-date="endDateInput"
      :custom-dates="customDates"
      mode="reschedule"
      :supply-date="selectedSupply?.supplyDate"
      @update:date-type="handleDateTypeChange"
      @update:start-date="handleStartDateChange"
      @update:end-date="handleEndDateChange"
      @update:custom-dates="handleCustomDatesChange"
    />

    <!-- Max Coefficient -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Максимальный коэффициент
      </label>
      <div class="flex items-center gap-4">
        <Slider
          :model-value="maxCoefficientInput"
          :min="0"
          :max="20"
          :step="1"
          class="flex-1"
          @update:model-value="handleMaxCoefficientChange"
        />
        <div class="min-w-[4rem] text-center">
          <Tag severity="secondary">
            {{ maxCoefficientInput }}
          </Tag>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        Поставка будет перепланирована только если коэффициент не превышает
        указанное значение
      </p>

      <!-- Coefficient History -->
      <CoefficientHistoryAlert
        v-if="warehouseId && supplyType"
        :warehouse-id="warehouseId"
        :supply-type="supplyType"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Slider from 'primevue/slider';
import DateSelection from '../common/DateSelection.vue';
import CoefficientHistoryAlert from '../triggers/CoefficientHistoryAlert.vue';

interface SupplyOption {
  supplyId: string;
  displayName: string;
  supplyDate?: string;
}

interface Props {
  selectedSupplyId?: number;
  supplyOptions: SupplyOption[];
  loadingSupplies: boolean;
  suppliesError?: string | null;
  selectedSupply?: SupplyOption | null;
  selectedDateType: string;
  startDateInput: string;
  endDateInput: string;
  customDates: string[];
  maxCoefficientInput: number;
  warehouseId?: number;
  supplyType?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedSupplyId': [value: number | undefined];
  refreshSupplies: [];
  openSupplyDetails: [];
  'update:selectedDateType': [value: string];
  'update:startDateInput': [value: string];
  'update:endDateInput': [value: string];
  'update:customDates': [value: string[]];
  'update:maxCoefficientInput': [value: number];
}>();

function handleSupplyChange(value: number | undefined) {
  emit('update:selectedSupplyId', value);
}

function refreshSupplies() {
  emit('refreshSupplies');
}

function openSupplyDetails() {
  emit('openSupplyDetails');
}

function handleDateTypeChange(value: string) {
  emit('update:selectedDateType', value);
}

function handleStartDateChange(value: string) {
  emit('update:startDateInput', value);
}

function handleEndDateChange(value: string) {
  emit('update:endDateInput', value);
}

function handleCustomDatesChange(value: string[]) {
  emit('update:customDates', value);
}

function handleMaxCoefficientChange(value: number) {
  emit('update:maxCoefficientInput', value);
}
</script>
