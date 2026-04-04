<template>
  <div class="space-y-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center justify-end mb-6">
        <h3 class="text-xl text-center font-semibold flex-1">
          Редактировать перепланирование
        </h3>
        <Button severity="warning" text @click="showHintsModal = true">
          <i class="pi pi-question-circle" />
        </Button>
      </div>

      <form class="space-y-6">
        <!-- Supply Section -->
        <div v-if="reschedule" class="space-y-3">
          <h4 class="font-medium text-gray-900 dark:text-white">Поставка</h4>

          <!-- Supply Information (read-only) -->
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <span class="font-medium">Поставка:</span>
                  {{ reschedule?.supplyId }}
                </div>
                <div>
                  <span class="font-medium">Склад:</span>
                  {{
                    updateFormStore.getWarehouseName(
                      reschedule?.warehouseId || 0,
                    )
                  }}
                </div>
                <div>
                  <span class="font-medium">Тип:</span>
                  {{
                    updateFormStore.getSupplyTypeText(
                      reschedule?.supplyType || '',
                    )
                  }}
                </div>
              </div>
              <!-- Supply Information Toggle Button -->
              <Button
                v-if="selectedSupply"
                size="small"
                text
                @click="supplyDetailsStore.openModal(reschedule.supplyId)"
              >
                <i class="pi pi-info-circle mr-1" />
                детали
              </Button>
            </div>
          </div>
        </div>

        <!-- Supply Details Modal -->
        <ReschedulesSupplyDetailsModal
          :show="supplyDetailsStore.showModal"
          @update:show="supplyDetailsStore.closeModal"
        />

        <!-- Date Selection -->
        <DateSelection
          v-model:date-type="formData.selectedDateType"
          v-model:start-date="formData.startDateInput"
          v-model:end-date="formData.endDateInput"
          v-model:custom-dates="formData.customDates"
          mode="reschedule"
          :supply-date="reschedule?.currentDate"
        />

        <!-- Max Coefficient Update -->
        <div class="space-y-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Максимальный коэффициент
          </label>
          <div class="flex items-center gap-4">
            <input
              v-model="formData.maxCoefficientInput"
              type="range"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              :step="1"
              :min="0"
              :max="20"
            />
            <div class="min-w-[4rem] text-center">
              <span
                class="px-2 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              >
                {{ formData.maxCoefficientInput }}
              </span>
            </div>
          </div>

          <!-- Coefficient History -->
          <CoefficientHistoryAlert
            v-if="reschedule?.warehouseId && reschedule?.supplyType"
            :warehouse-id="reschedule.warehouseId"
            :supply-type="reschedule.supplyType"
          />
        </div>

        <!-- Completed Dates Display (read-only) -->
        <div
          v-if="reschedule && reschedule.completedDates.length > 0"
          class="space-y-2"
        >
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Выполненные даты:
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="date in reschedule.completedDates"
              :key="date.toString()"
              class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
            >
              {{ updateFormStore.formatDate(date) }}
            </span>
          </div>
        </div>
      </form>
    </div>

    <!-- Telegram Main Button -->
    <MainButton
      v-if="isFormValid && hasChanges"
      :disabled="rescheduleStore.loading"
      :progress="rescheduleStore.loading"
      text="изменить"
      @click="handleSubmit"
    />

    <!-- Hints Modal -->
    <ReschedulesHints :show="showHintsModal" @close="showHintsModal = false" />

    <!-- Telegram Back Button -->
    <BackButton @click="goBack" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { BackButton, MainButton } from 'vue-tg';
import Button from 'primevue/button';
import { useRescheduleStore } from '../../stores/reschedules';
import { useRescheduleUpdateFormStore } from '../../stores/reschedules/updateForm';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import DateSelection from '../common/DateSelection.vue';
import ReschedulesSupplyDetailsModal from './SupplyDetailsModal.vue';
import ReschedulesHints from './Hints.vue';
import CoefficientHistoryAlert from '../triggers/CoefficientHistoryAlert.vue';

const router = useRouter();
const rescheduleStore = useRescheduleStore();
const updateFormStore = useRescheduleUpdateFormStore();
const supplyDetailsStore = useSupplyDetailsStore();

// Destructure reactive refs from stores
const { formData, reschedule, hasChanges, isFormValid, selectedSupply } =
  storeToRefs(updateFormStore);

// Modal states
const showHintsModal = ref(false);

// Load initial data
onMounted(() => {
  updateFormStore.initialize();
});

// Navigation
function goBack() {
  router.back();
}

// Event handlers
async function handleSubmit() {
  await updateFormStore.submit();
  goBack();
}
</script>
