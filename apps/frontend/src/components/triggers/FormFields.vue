<template>
  <div class="space-y-4">
    <!-- Warehouses -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Склады (максимум 3)
        <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <MultiSelect
        :model-value="warehouseIds"
        :options="warehouseOptions"
        option-label="label"
        option-value="value"
        placeholder="Выберите склады"
        class="w-full"
        :max-selected-labels="3"
        :selection-limit="3"
        :loading="loading"
        @update:model-value="handleWarehouseIdsChange"
      />
      <p
        v-if="formErrors.warehouseIds"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ formErrors.warehouseIds }}
      </p>
    </div>

    <!-- Supply Types -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Типы коробов <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <MultiSelect
        :model-value="supplyTypes"
        :options="supplyTypesOptions"
        option-label="label"
        option-value="value"
        placeholder="Выберите типы коробов"
        class="w-full"
        @update:model-value="handleSupplyTypesChange"
      />
      <p
        v-if="formErrors.supplyTypes"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
      >
        {{ formErrors.supplyTypes }}
      </p>
    </div>

    <!-- Check Interval -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Интервал проверки <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <Select
        :model-value="checkInterval"
        :options="intervalOptions"
        option-label="label"
        option-value="value"
        placeholder="Интервал проверки"
        class="w-full"
        @update:model-value="handleCheckIntervalChange"
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Через сколько после срабатывания таймслота снова проверять склады
      </p>
    </div>

    <!-- Search Mode -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Режим поиска <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <Select
        :model-value="searchMode"
        :options="searchModeOptions"
        option-label="label"
        option-value="value"
        placeholder="Выберите режим поиска"
        class="w-full"
        @update:model-value="handleSearchModeChange"
      />
    </div>

    <!-- Date Range (for RANGE mode) -->
    <div v-if="showDatePicker">
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Период поиска <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <DatePicker
        :model-value="dateRangeValue"
        selection-mode="range"
        :min-date="new Date()"
        :show-time="false"
        date-format="dd.mm.yy"
        placeholder="Выберите период"
        class="w-full"
        @update:model-value="handleDateRangeChange"
      />
    </div>

    <!-- Selected Dates (for CUSTOM_DATES mode) -->
    <div v-if="showRangePicker">
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Выбрать даты <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <MultiSelect
        :key="`dates-${selectedDates?.length || 0}`"
        :model-value="selectedDates"
        :options="availableDatesOptions"
        option-label="label"
        option-value="value"
        placeholder="Выберите даты"
        display="chip"
        class="w-full"
        @update:model-value="handleSelectedDatesChange"
      />
    </div>

    <!-- Max Coefficient -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Максимальный коэффициент выгрузки
      </label>
      <div class="flex items-center gap-4 px-2 pb-2">
        <Slider
          :model-value="maxCoefficient"
          :min="0"
          :max="20"
          :step="1"
          class="flex-1"
          @update:model-value="handleMaxCoefficientChange"
        />
        <Tag
          :value="String(maxCoefficient)"
          severity="secondary"
          class="min-w-[3rem] justify-center"
        />
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        0 означает поиск только бесплатных слотов
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Slider from 'primevue/slider';
import Tag from 'primevue/tag';
import { TRIGGER_INTERVALS } from '../../constants';
import type { SearchMode } from '../../types';

interface Option {
  label: string;
  value: string | number;
}

interface Props {
  warehouseIds: number[];
  supplyTypes: string[];
  checkInterval: number;
  searchMode: SearchMode | undefined;
  maxCoefficient: number;
  startDate: string | null;
  endDate: string | null;
  selectedDates: string[];
  warehouseOptions: Option[];
  supplyTypesOptions: Option[];
  searchModeOptions: Option[];
  showDatePicker: boolean;
  showRangePicker: boolean;
  formErrors: Record<string, string>;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:warehouseIds': [value: number[]];
  'update:supplyTypes': [value: string[]];
  'update:checkInterval': [value: number];
  'update:searchMode': [value: SearchMode];
  'update:maxCoefficient': [value: number];
  'update:startDate': [value: string | null];
  'update:endDate': [value: string | null];
  'update:selectedDates': [value: string[]];
  searchModeChange: [mode: SearchMode];
}>();

const intervalOptions = TRIGGER_INTERVALS.map((i) => ({
  label: i.label,
  value: i.value,
}));

// Computed for date range picker
const dateRangeValue = computed(() => {
  if (!props.startDate || !props.endDate) return null;
  return [new Date(props.startDate), new Date(props.endDate)];
});

// Available dates for selection (next 3 months)
const availableDatesOptions = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const dates = [];
  const current = new Date(today);
  while (current <= threeMonthsLater) {
    dates.push({
      label: current.toLocaleDateString('ru-RU'),
      value: current.toISOString(),
    });
    current.setDate(current.getDate() + 1);
  }

  return dates;
});

function handleWarehouseIdsChange(value: number[]) {
  emit('update:warehouseIds', value);
}

function handleSupplyTypesChange(value: string[]) {
  emit('update:supplyTypes', value);
}

function handleCheckIntervalChange(value: number) {
  emit('update:checkInterval', value);
}

function handleSearchModeChange(value: SearchMode) {
  emit('update:searchMode', value);
  emit('searchModeChange', value);
}

function handleMaxCoefficientChange(value: number) {
  emit('update:maxCoefficient', value);
}

function handleDateRangeChange(
  val: Date | Date[] | (Date | null)[] | null | undefined,
) {
  if (!Array.isArray(val) || val.length !== 2 || !val[0] || !val[1]) {
    emit('update:startDate', null);
    emit('update:endDate', null);
    return;
  }

  const [start, end] = val;

  // Set start to beginning of day and end to end of day
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  emit('update:startDate', startDate.toISOString());
  emit('update:endDate', endDate.toISOString());

  // Generate all dates in range
  const dates = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current).toISOString());
    current.setDate(current.getDate() + 1);
  }
  emit('update:selectedDates', dates);
}

function handleSelectedDatesChange(value: string[]) {
  emit('update:selectedDates', value);
  if (value.length > 0) {
    const dates = value.map((d) => new Date(d));
    const start = new Date(Math.min(...dates.map((d) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d) => d.getTime())));
    emit('update:startDate', start.toISOString());
    emit('update:endDate', end.toISOString());
  } else {
    emit('update:startDate', null);
    emit('update:endDate', null);
  }
}
</script>
