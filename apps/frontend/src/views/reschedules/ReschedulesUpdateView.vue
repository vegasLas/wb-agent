<template>
  <div class="space-y-4 p-3">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Редактирование перепланирования
      </h3>
      <Button
        variant="outlined"
        severity="warn"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle" />
      </Button>
    </div>

    <div class="space-y-4">
      <!-- Supply Section -->
      <div
        v-if="updateFormStore.reschedule"
        class="space-y-3"
      >
        <h4 class="font-medium text-gray-900 dark:text-white">
          Поставка
        </h4>

        <!-- Supply Information (read-only) -->
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <div>
                <span class="font-medium">Поставка:</span>
                {{ updateFormStore.reschedule?.supplyId }}
              </div>
              <div>
                <span class="font-medium">Склад:</span>
                {{
                  updateFormStore.getWarehouseName(updateFormStore.reschedule?.warehouseId || 0)
                }}
              </div>
              <div>
                <span class="font-medium">Тип:</span>
                {{
                  updateFormStore.getSupplyTypeText(
                    updateFormStore.reschedule?.supplyType || '',
                  )
                }}
              </div>
            </div>
            <!-- Supply Information Toggle Button -->
            <Button
              v-if="updateFormStore.selectedSupply"
              size="small"
              variant="outlined"
              @click="supplyDetailsStore.openModal(updateFormStore.reschedule.supplyId)"
            >
              <i class="pi pi-info-circle mr-1" />
              детали
            </Button>
          </div>
        </div>
      </div>

      <!-- Date Selection -->
      <DateSelection
        v-model:date-type="updateFormStore.formData.selectedDateType"
        v-model:start-date="updateFormStore.formData.startDateInput"
        v-model:end-date="updateFormStore.formData.endDateInput"
        v-model:custom-dates="updateFormStore.formData.customDates"
        mode="reschedule"
        :supply-date="updateFormStore.reschedule?.currentDate"
      />

      <!-- Max Coefficient Update -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Максимальный коэффициент
        </label>
        <div class="flex items-center gap-4">
          <Slider
            v-model="updateFormStore.formData.maxCoefficientInput"
            :min="0"
            :max="20"
            :step="1"
            class="flex-1"
          />
          <div class="min-w-[4rem] text-center">
            <Tag
              :value="String(updateFormStore.formData.maxCoefficientInput)"
              severity="secondary"
            />
          </div>
        </div>
        
        <!-- Coefficient History -->
        <CoefficientHistoryAlert
          v-if="updateFormStore.reschedule?.warehouseId && updateFormStore.reschedule?.supplyType"
          :warehouse-id="updateFormStore.reschedule.warehouseId"
          :supply-type="updateFormStore.reschedule.supplyType"
        />
      </div>

      <!-- Completed Dates Display (read-only) -->
      <div
        v-if="updateFormStore.reschedule && updateFormStore.reschedule.completedDates.length > 0"
        class="space-y-2"
      >
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Выполненные даты:
        </div>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="date in updateFormStore.reschedule.completedDates"
            :key="date.toString()"
            severity="success"
            class="text-xs"
          >
            {{ updateFormStore.formatDate(date) }}
          </Tag>
        </div>
      </div>
    </div>
  </div>

  <!-- Supply Details Modal -->
  <ReschedulesSupplyDetailsModal
    :show="supplyDetailsStore.showModal"
    @update:show="supplyDetailsStore.closeModal"
  />

  <!-- Telegram Main Button -->
  <MainButton
    v-if="updateFormStore.isFormValid && updateFormStore.hasChanges"
    :disabled="rescheduleStore.loading"
    :progress="rescheduleStore.loading"
    text="Обновить"
    @click="handleSubmit"
  />

  <!-- Hints Modal -->
  <ReschedulesHints v-model:show="showHintsModal" />

  <!-- Telegram Back Button -->
  <BackButton @click="goBack" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BackButton, MainButton } from 'vue-tg';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Slider from 'primevue/slider';
import { useRescheduleStore } from '../../stores/reschedules';
import { useRescheduleUpdateFormStore } from '../../stores/reschedules/updateForm';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import { useViewReady } from '../../composables/useSkeleton';
import DateSelection from '../../components/common/DateSelection.vue';
import ReschedulesSupplyDetailsModal from '../../components/reschedules/SupplyDetailsModal.vue';
import ReschedulesHints from '../../components/reschedules/Hints.vue';
import CoefficientHistoryAlert from '../../components/triggers/CoefficientHistoryAlert.vue';

const router = useRouter();
const rescheduleStore = useRescheduleStore();
const updateFormStore = useRescheduleUpdateFormStore();
const supplyDetailsStore = useSupplyDetailsStore();
const { viewReady } = useViewReady();

// Modal states
const showHintsModal = ref(false);

// Navigation
function goBack() {
  router.back();
}

// Event handlers
async function handleSubmit() {
  await updateFormStore.submit();
  goBack();
}

// Load initial data
onMounted(async () => {
  try {
    await updateFormStore.initialize();
  } finally {
    viewReady();
  }
});
</script>

<style scoped></style>
