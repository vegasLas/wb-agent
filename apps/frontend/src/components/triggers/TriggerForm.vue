<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button variant="text" size="small" @click="goBack">
          <i class="pi pi-arrow-left"></i>
        </Button>
        <h2 class="text-xl font-semibold">Создание таймслота</h2>
      </div>
      <Button
        variant="text"
        size="small"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle text-yellow-600"></i>
      </Button>
    </div>

    <!-- Form -->
    <Card class="shadow-sm" :pt="{ root: { class: 'rounded-lg border border-gray-200 dark:border-gray-700' }, content: { class: 'p-4' } }">
      <template #content>
        <div class="space-y-5">
          <!-- Warehouses -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Склады (максимум 3) <span class="text-red-500">*</span>
            </label>
            <MultiSelect
              v-model="triggerFormStore.form.warehouseIds"
              :options="triggerFormStore.warehouseOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите склады"
              class="w-full"
              :maxSelectedLabels="3"
              :selectionLimit="3"
            />
            <p v-if="formErrors.warehouseIds" class="mt-1 text-sm text-red-600">
              {{ formErrors.warehouseIds }}
            </p>
          </div>

          <!-- Supply Types -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Типы коробов <span class="text-red-500">*</span>
            </label>
            <MultiSelect
              v-model="triggerFormStore.form.supplyTypes"
              :options="triggerFormStore.supplyTypesOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите типы коробов"
              class="w-full"
            />
            <p v-if="formErrors.supplyTypes" class="mt-1 text-sm text-red-600">
              {{ formErrors.supplyTypes }}
            </p>
          </div>

          <!-- Check Interval -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Интервал проверки <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="triggerFormStore.form.checkInterval"
              :options="TRIGGER_INTERVALS.map(i => ({ label: i.label, value: i.value }))"
              optionLabel="label"
              optionValue="value"
              placeholder="Интервал проверки"
              class="w-full"
            />
            <p class="mt-1 text-xs text-gray-500">
              Через сколько после срабатывания таймслота снова проверять склады
            </p>
          </div>

          <!-- Search Mode -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Режим поиска <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="triggerFormStore.form.searchMode"
              :options="triggerFormStore.searchModeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите режим поиска"
              class="w-full"
              @update:model-value="onSearchModeChange"
            />
          </div>

          <!-- Date Range (for RANGE mode) -->
          <div v-if="triggerFormStore.showDatePicker">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Период поиска <span class="text-red-500">*</span>
            </label>
            <VueDatePicker
              v-model="dateRange"
              :min-date="new Date()"
              :enable-time-picker="false"
              format="dd.MM.yyyy"
              range
              locale="ru-RU"
              auto-apply
              placeholder="Выберите период"
              @update:model-value="onDateRangeChange"
            />
          </div>

          <!-- Selected Dates (for CUSTOM_DATES mode) -->
          <div v-if="triggerFormStore.showRangePicker">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Выбрать даты <span class="text-red-500">*</span>
            </label>
            <MultiSelect
              v-model="selectedDates"
              :options="availableDatesOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите даты"
              class="w-full"
            />
          </div>

          <!-- Max Coefficient -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Максимальный коэффициент выгрузки
            </label>
            <div class="flex items-center gap-4">
              <Slider
                v-model="triggerFormStore.form.maxCoefficient"
                :min="0"
                :max="20"
                :step="1"
                class="flex-1"
              />
              <Tag
                :value="String(triggerFormStore.form.maxCoefficient)"
                severity="secondary"
                class="min-w-[3rem] justify-center"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">
              0 означает поиск только бесплатных слотов
            </p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Actions -->
    <div class="flex gap-2">
      <Button variant="outlined" class="flex-1" @click="goBack">
        Отмена
      </Button>
      <Button
        severity="primary"
        class="flex-1"
        :loading="triggerFormStore.loading"
        :disabled="!isFormValid"
        @click="submitForm"
      >
        Создать
      </Button>
    </div>

    <!-- Telegram Buttons -->
    <MainButton
      v-if="isFormValid"
      :disabled="triggerStore.isCreating"
      :progress="triggerStore.isCreating"
      text="Создать"
      @click="submitForm"
    />
    <BackButton @click="goBack" />

    <!-- Hints Modal -->
    <TriggerHints :show="showHintsModal" @close="showHintsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { BackButton, MainButton } from 'vue-tg';
import { useTriggerFormStore } from '../../stores/triggerForm';
import { useTriggerStore } from '../../stores/triggers';
import { TRIGGER_INTERVALS } from '../../constants';
import type { SearchMode } from '../../types';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Slider from 'primevue/slider';
import Tag from 'primevue/tag';
import TriggerHints from './TriggerHints.vue';

const router = useRouter();
const triggerFormStore = useTriggerFormStore();
const triggerStore = useTriggerStore();
const showHintsModal = ref(false);
const dateRange = ref<[Date, Date] | null>(null);
const formErrors = ref<Record<string, string>>({});

// Selected dates for CUSTOM_DATES mode
const selectedDates = computed({
  get() {
    return triggerFormStore.form.selectedDates || [];
  },
  set(value: string[]) {
    triggerFormStore.form.selectedDates = value;
    if (value.length > 0) {
      const dates = value.map((d) => new Date(d));
      const start = new Date(Math.min(...dates.map((d) => d.getTime())));
      const end = new Date(Math.max(...dates.map((d) => d.getTime())));
      triggerFormStore.form.startDate = start.toISOString();
      triggerFormStore.form.endDate = end.toISOString();
    } else {
      triggerFormStore.form.startDate = null;
      triggerFormStore.form.endDate = null;
    }
  },
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

const isFormValid = computed(() => {
  const form = triggerFormStore.form;
  return (
    form.warehouseIds.length > 0 &&
    form.warehouseIds.length <= 3 &&
    form.supplyTypes.length > 0 &&
    form.checkInterval > 0 &&
    form.searchMode !== undefined
  );
});

function goBack() {
  router.back();
}

function onSearchModeChange(mode: SearchMode) {
  // Reset dates when mode changes
  dateRange.value = null;
  triggerFormStore.form.startDate = null;
  triggerFormStore.form.endDate = null;
  triggerFormStore.form.selectedDates = [];

  switch (mode) {
    case 'TODAY':
      handleTodayMode();
      break;
    case 'TOMORROW':
      handleTomorrowMode();
      break;
    case 'WEEK':
      handleWeekMode();
      break;
    case 'UNTIL_FOUND':
      handleUntilFoundMode();
      break;
    // RANGE and CUSTOM_DATES are handled by their respective pickers
  }
}

function handleTodayMode() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  dateRange.value = [today, endOfDay];
  triggerFormStore.form.startDate = today.toISOString();
  triggerFormStore.form.endDate = endOfDay.toISOString();
  triggerFormStore.form.selectedDates = [today.toISOString()];
}

function handleTomorrowMode() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  dateRange.value = [tomorrow, endOfTomorrow];
  triggerFormStore.form.startDate = tomorrow.toISOString();
  triggerFormStore.form.endDate = endOfTomorrow.toISOString();
  triggerFormStore.form.selectedDates = [tomorrow.toISOString()];
}

function handleWeekMode() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  dateRange.value = [today, endOfWeek];
  triggerFormStore.form.startDate = today.toISOString();
  triggerFormStore.form.endDate = endOfWeek.toISOString();

  // Select all days in the week
  const rangeDates = [];
  const current = new Date(today);
  while (current <= endOfWeek) {
    rangeDates.push(new Date(current).toISOString());
    current.setDate(current.getDate() + 1);
  }
  triggerFormStore.form.selectedDates = rangeDates;
}

function handleUntilFoundMode() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  triggerFormStore.form.startDate = today.toISOString();
  triggerFormStore.form.endDate = null;
  triggerFormStore.form.selectedDates = [];
}

function onDateRangeChange(rangeDates: [Date, Date] | null) {
  if (!rangeDates || !Array.isArray(rangeDates) || rangeDates.length !== 2) {
    return;
  }

  const [start, end] = rangeDates;

  // Set start to beginning of day and end to end of day
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  triggerFormStore.form.startDate = startDate.toISOString();
  triggerFormStore.form.endDate = endDate.toISOString();

  // Generate all dates in range
  const dates = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current).toISOString());
    current.setDate(current.getDate() + 1);
  }
  triggerFormStore.form.selectedDates = dates;
}

async function submitForm() {
  try {
    formErrors.value = {};
    await triggerFormStore.createTrigger();
    goBack();
  } catch (err: any) {
    if (err.message) {
      formErrors.value.general = err.message;
    }
  }
}

onMounted(async () => {
  await triggerFormStore.initializeWarehouses();
  // Initialize default dates based on current search mode
  if (triggerFormStore.form.searchMode === 'TODAY') {
    handleTodayMode();
  }
});

onUnmounted(() => {
  triggerFormStore.resetForm();
});
</script>
