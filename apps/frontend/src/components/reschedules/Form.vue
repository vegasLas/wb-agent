<template>
  <div class="space-y-4">
    <div class="bg-card rounded-lg shadow-card p-4">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-3 mb-6">
        <Button
          icon="pi pi-arrow-left"
          variant="text"
          severity="secondary"
          @click="goBack"
        />
        <h3 class="text-xl text-center font-semibold flex-1">
          Создание перепланирования
        </h3>
        <Button
          variant="outlined"
          severity="warn"
          @click="showHintsModal = true"
        >
          <i class="pi pi-question-circle" />
        </Button>
      </div>

      <form class="mb-6 space-y-3">
        <!-- Supply Selection -->
        <div class="space-y-3">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
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
              @update:model-value="formStore.handleSupplyChange"
            />
            <Button
              size="small"
              severity="info"
              variant="outlined"
              :loading="loadingSupplies"
              class="flex-shrink-0"
              @click="formStore.refreshSupplies"
            >
              <i class="pi pi-refresh" />
            </Button>
          </div>
          <p
            v-if="suppliesError"
            class="text-sm text-red-600 dark:text-red-400"
          >
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
        <div
          v-if="selectedSupply"
          class="flex items-center justify-end"
        >
          <Button
            size="small"
            variant="outlined"
            @click="
              supplyDetailsStore.openModal(String(selectedSupply.supplyId))
            "
          >
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
          @update:date-type="formStore.handleDateTypeChange"
          @update:start-date="formStore.handleStartDateChange"
          @update:end-date="formStore.handleEndDateChange"
          @update:custom-dates="formStore.handleCustomDatesChange"
        />

        <!-- Max Coefficient -->
        <div class="space-y-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Максимальный коэффициент
          </label>
          <div class="flex items-center gap-4">
            <input
              type="range"
              class="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer"
              :value="maxCoefficientInput"
              :step="1"
              :min="0"
              :max="20"
              @input="
                (e) =>
                  formStore.handleMaxCoefficientChange(
                    Number((e.target as HTMLInputElement).value),
                  )
              "
            >
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
            v-if="form.warehouseId && form.supplyType"
            :warehouse-id="form.warehouseId"
            :supply-type="form.supplyType"
          />
        </div>
      </form>

      <Message
        severity="warn"
        class="mb-4"
      >
        <div class="text-sm space-y-2">
          <p class="font-semibold mb-2">
            Важная информация
          </p>
          <p>
            <strong>Автоматическое перепланирование</strong> работает как
            автобронирование — бот будет пытаться перепланировать поставку, но
            <strong>успех не гарантирован</strong>.
          </p>
          <p>
            Обязательно <strong>проверьте историю коэффициентов</strong> и
            будьте готовы к тому, что перепланирование может не сработать.
          </p>
        </div>
      </Message>

      <!-- Submit Button -->
      <div class="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] z-50">
        <Button
          :loading="isSubmitting || rescheduleStore.loading"
          :disabled="!validate || isSubmitting || rescheduleStore.loading"
          class="w-full"
          label="Создать"
          icon="pi pi-check"
          @click="handleSubmit"
        />
      </div>
      
      <!-- Spacer for fixed button -->
      <div class="h-20" />
    </div>
  </div>

  <!-- Supply Details Modal -->
  <ReschedulesSupplyDetailsModal
    :show="supplyDetailsStore.showModal"
    @update:show="supplyDetailsStore.closeModal"
  />

  <!-- Hints Modal -->
  <ReschedulesHints
    :show="showHintsModal"
    @close="showHintsModal = false"
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import Button from 'primevue/button';
import Select from 'primevue/select';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useRescheduleStore } from '@/stores/reschedules';
import { useRescheduleCreateFormStore } from '@/stores/reschedules';
import { useSupplyDetailsStore } from '@/stores/supplies';
import DateSelection from '../common/DateSelection.vue';
import ReschedulesSupplyDetailsModal from './SupplyDetailsModal.vue';
import ReschedulesHints from './Hints.vue';
import CoefficientHistoryAlert from '../triggers/CoefficientHistoryAlert.vue';

const router = useRouter();
const rescheduleStore = useRescheduleStore();
const formStore = useRescheduleCreateFormStore();
const supplyDetailsStore = useSupplyDetailsStore();

// Destructure reactive refs from stores
const {
  form,
  isSubmitting,
  validate,
  showHintsModal,
  selectedSupplyId,
  selectedDateType,
  startDateInput,
  endDateInput,
  customDates,
  maxCoefficientInput,
  supplyOptions,
  selectedSupply,
} = storeToRefs(formStore);

const { loadingSupplies, suppliesError } = storeToRefs(rescheduleStore);

// Load data on mount
onMounted(async () => {
  await formStore.initialize();
});

// Navigation
function goBack() {
  router.back();
}

// Event handlers
async function handleSubmit() {
  const success = await formStore.submit();
  if (success) {
    goBack();
  }
}
</script>
