<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :modal="true"
    :draggable="false"
    header="Создание таймслота"
    class="trigger-dialog"
    :style="{ width: '100%', maxWidth: '600px' }"
    @hide="handleClose"
  >
    <div class="max-h-[60vh] overflow-auto p-2">
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
        :loading="triggerFormStore.loading"
        @search-mode-change="onSearchModeChange"
      />
    </div>

    <template #footer>
      <div class="flex gap-2 p-2">
        <Button
          variant="outlined"
          class="flex-1"
          @click="handleClose"
        >
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
    </template>
  </Dialog>

  <!-- Hints Modal -->
  <TriggerHints v-model:show="showHintsModal" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useTriggerFormStore } from '@/stores/triggers';
import TriggersFormFields from './FormFields.vue';
import TriggerHints from './TriggerHints.vue';
import type { SearchMode } from '../../types';

// ============================================
// Props & Emits
// ============================================
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  created: [];
}>();

// ============================================
// Store Setup
// ============================================
const triggerFormStore = useTriggerFormStore();

// ============================================
// Local State
// ============================================
const showHintsModal = ref(false);
const formErrors = ref<Record<string, string>>({});
const isInitializing = ref(false);

// ============================================
// Computed
// ============================================
const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

// Use store's isValid computed directly for proper reactivity
const isFormValid = computed(() => {
  return triggerFormStore.isValid;
});

// ============================================
// Watchers
// ============================================
watch(
  () => props.show,
  async (newValue) => {
    if (newValue && !isInitializing.value) {
      isInitializing.value = true;
      try {
        // Reset form when opening dialog
        triggerFormStore.resetForm();
        await triggerFormStore.initializeWarehouses();
        // Initialize default dates based on current search mode
        if (triggerFormStore.form.searchMode === 'TODAY') {
          handleTodayMode();
        }
      } finally {
        isInitializing.value = false;
      }
    }
  },
);

// ============================================
// Event Handlers
// ============================================
function handleClose() {
  emit('update:show', false);
  triggerFormStore.resetForm();
  formErrors.value = {};
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
    emit('created');
    handleClose();
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      formErrors.value.general = err.message;
    }
  }
}
</script>

<style scoped>
.trigger-dialog :deep(.p-dialog-content) {
  padding: 0;
}
</style>
