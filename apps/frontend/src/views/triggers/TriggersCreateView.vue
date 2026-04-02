<template>
  <div class="space-y-4 p-3">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Создание таймслота
      </h3>
      <Button
        variant="outlined"
        severity="warn"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle" />
      </Button>
    </div>

    <TriggersFormFields
      v-model:warehouse-ids="triggerFormStore._form.warehouseIds"
      v-model:supply-types="triggerFormStore._form.supplyTypes"
      v-model:check-interval="triggerFormStore._form.checkInterval"
      v-model:search-mode="triggerFormStore._form.searchMode"
      v-model:max-coefficient="triggerFormStore._form.maxCoefficient"
      v-model:start-date="triggerFormStore._form.startDate"
      v-model:end-date="triggerFormStore._form.endDate"
      v-model:selected-dates="triggerFormStore._form.selectedDates"
      :warehouse-options="triggerFormStore.warehouseOptions"
      :supply-types-options="triggerFormStore.supplyTypesOptions"
      :search-mode-options="triggerFormStore.searchModeOptions"
      :show-date-picker="triggerFormStore.showDatePicker"
      :show-range-picker="triggerFormStore.showRangePicker"
      :form-errors="formErrors"
      @search-mode-change="onSearchModeChange"
    />
  </div>

  <!-- Telegram Main Button -->
  <MainButton
    v-if="isFormValid"
    :disabled="triggerFormStore.loading"
    :progress="triggerFormStore.loading"
    text="Создать"
    @click="submitForm"
  />
  <BackButton @click="goBack" />

  <!-- Hints Modal -->
  <TriggerHints v-model:show="showHintsModal" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { BackButton, MainButton } from 'vue-tg';
import Button from 'primevue/button';
import { useTriggerFormStore } from '../../stores/triggerForm';
import { useViewReady } from '../../composables/useSkeleton';
import TriggersFormFields from '../../components/triggers/FormFields.vue';
import TriggerHints from '../../components/triggers/TriggerHints.vue';
import type { SearchMode } from '../../types';

const router = useRouter();
const triggerFormStore = useTriggerFormStore();
const { viewReady } = useViewReady();

const showHintsModal = ref(false);
const formErrors = ref<Record<string, string>>({});

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
  triggerFormStore._form.startDate = null;
  triggerFormStore._form.endDate = null;
  triggerFormStore._form.selectedDates = [];

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

  triggerFormStore._form.startDate = today.toISOString();
  triggerFormStore._form.endDate = endOfDay.toISOString();
  triggerFormStore._form.selectedDates = [today.toISOString()];
}

function handleTomorrowMode() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  triggerFormStore._form.startDate = tomorrow.toISOString();
  triggerFormStore._form.endDate = endOfTomorrow.toISOString();
  triggerFormStore._form.selectedDates = [tomorrow.toISOString()];
}

function handleWeekMode() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  triggerFormStore._form.startDate = today.toISOString();
  triggerFormStore._form.endDate = endOfWeek.toISOString();

  // Select all days in the week
  const rangeDates = [];
  const current = new Date(today);
  while (current <= endOfWeek) {
    rangeDates.push(new Date(current).toISOString());
    current.setDate(current.getDate() + 1);
  }
  triggerFormStore._form.selectedDates = rangeDates;
}

function handleUntilFoundMode() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  triggerFormStore._form.startDate = today.toISOString();
  triggerFormStore._form.endDate = null;
  triggerFormStore._form.selectedDates = [];
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
  try {
    await triggerFormStore.initializeWarehouses();
    // Initialize default dates based on current search mode
    if (triggerFormStore.form.searchMode === 'TODAY') {
      handleTodayMode();
    }
  } finally {
    viewReady();
  }
});

onUnmounted(() => {
  triggerFormStore.resetForm();
});
</script>

<style scoped></style>
