<template>
  <div class="space-y-4 p-3">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Создание перепланирования
      </h3>
      <Button variant="outlined" severity="warn" @click="showHintsModal = true">
        <i class="pi pi-question-circle" />
      </Button>
    </div>

    <ReschedulesFormFields
      v-model:selected-supply-id="formStore.selectedSupplyId"
      v-model:selected-date-type="formStore.selectedDateType"
      v-model:start-date-input="formStore.startDateInput"
      v-model:end-date-input="formStore.endDateInput"
      v-model:custom-dates="formStore.customDates"
      v-model:max-coefficient-input="formStore.maxCoefficientInput"
      :supply-options="formStore.supplyOptions"
      :loading-supplies="rescheduleStore.loadingSupplies"
      :supplies-error="rescheduleStore.suppliesError"
      :selected-supply="formStore.selectedSupply"
      :warehouse-id="formStore.form.warehouseId"
      :supply-type="formStore.form.supplyType"
      @refresh-supplies="formStore.refreshSupplies"
      @open-supply-details="
        supplyDetailsStore.openModal(String(formStore.selectedSupplyId || ''))
      "
    />

    <Message severity="warn" class="mt-4">
      <div class="text-sm space-y-2">
        <p class="font-semibold mb-2">Важная информация</p>
        <p>
          <strong>Автоматическое перепланирование</strong> работает как
          автобронирование — бот будет пытаться перепланировать поставку, но
          <strong>успех не гарантирован</strong>.
        </p>
        <p>
          Обязательно <strong>проверьте историю коэффициентов</strong> и будьте
          готовы к тому, что перепланирование может не сработать.
        </p>
      </div>
    </Message>
  </div>

  <!-- Telegram Main Button -->
  <MainButton
    v-if="formStore.validate"
    :disabled="formStore.isSubmitting || rescheduleStore.loading"
    :progress="formStore.isSubmitting || rescheduleStore.loading"
    text="Создать"
    @click="handleSubmit"
  />

  <!-- Supply Details Modal -->
  <ReschedulesSupplyDetailsModal
    :show="supplyDetailsStore.showModal"
    @update:show="supplyDetailsStore.closeModal"
  />

  <!-- Hints Modal -->
  <ReschedulesHints v-model:show="showHintsModal" />

  <BackButton @click="goBack" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BackButton, MainButton } from 'vue-tg';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useRescheduleStore } from '../../stores/reschedules';
import { useRescheduleCreateFormStore } from '../../stores/reschedules/createForm';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import { useViewReady } from '../../composables/useSkeleton';
import ReschedulesFormFields from '../../components/reschedules/FormFields.vue';
import ReschedulesSupplyDetailsModal from '../../components/reschedules/SupplyDetailsModal.vue';
import ReschedulesHints from '../../components/reschedules/Hints.vue';

const router = useRouter();
const rescheduleStore = useRescheduleStore();
const formStore = useRescheduleCreateFormStore();
const supplyDetailsStore = useSupplyDetailsStore();
const { viewReady } = useViewReady();

// Local state
const showHintsModal = ref(false);

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

// Load data on mount
onMounted(async () => {
  try {
    await formStore.initialize();
  } finally {
    viewReady();
  }
});
</script>

<style scoped></style>
