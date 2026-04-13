<template>
  <div class="space-y-4 p-3">
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

    <Message
      severity="warn"
      class="mt-4"
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
          Обязательно <strong>проверьте историю коэффициентов</strong> и будьте
          готовы к тому, что перепланирование может не сработать.
        </p>
      </div>
    </Message>

    <!-- Submit Button -->
    <div class="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] z-50">
      <Button
        :loading="formStore.isSubmitting || rescheduleStore.loading"
        :disabled="!formStore.validate || formStore.isSubmitting || rescheduleStore.loading"
        class="w-full"
        label="Создать"
        icon="pi pi-check"
        @click="handleSubmit"
      />
    </div>
    
    <!-- Spacer for fixed button -->
    <div class="h-20" />
  </div>

  <!-- Supply Details Modal -->
  <ReschedulesSupplyDetailsModal
    :show="supplyDetailsStore.showModal"
    @update:show="supplyDetailsStore.closeModal"
  />

  <!-- Hints Modal -->
  <ReschedulesHints v-model:show="showHintsModal" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useRescheduleStore } from '@/stores/reschedules';
import { useRescheduleCreateFormStore } from '@/stores/reschedules';
import { useSupplyDetailsStore } from '@/stores/supplies';
import { useViewReady } from '../../composables/ui';
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
    // Dismiss skeleton immediately for form views
    viewReady();
  }
});
</script>

<style scoped></style>
