<template>
  <div class="space-y-4 p-3">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Создание автобронирования
      </h3>
      <Button
        variant="outlined"
        severity="warn"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle" />
      </Button>
    </div>

    <!-- Template Selection -->
    <AutobookingFormFields
      v-model:form="formStore._form"
      v-model:use-transit="formStore._useTransit"
      :warehouse-options="warehouseOptions"
      :suggested-coefficient="formStore.suggestedCoefficient"
      :validation-loading="formStore.validationLoading"
      :validation-result="formStore.validationResult"
      :supplier-id="userStore.activeSupplier?.supplierId"
      @warehouse-change="handleWarehouseChange"
      @validate-warehouse="formStore.validateWarehouse"
    />
  </div>

  <!-- Telegram Main Button -->
  <MainButton
    v-if="canSubmit"
    :disabled="formStore.loading"
    :progress="formStore.loading"
    text="Создать"
    @click="handleSubmit"
  />

  <AutobookingDraftGoodsModal
    v-model:show="draftStore.showGoodsModal"
    :goods="draftStore.draftGoods"
    :loading="draftStore.loadingGoods"
  />

  <AutobookingHints v-model:show="showHintsModal" />
  <BackButton @click="goBack" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BackButton, MainButton } from 'vue-tg';
import { useAutobookingFormStore } from '../../stores/autobookingForm';
import { useUserStore } from '../../stores/user';
import { useDraftStore } from '../../stores/draft';
import { useWarehousesStore } from '../../stores/warehouses';
import { useDraftsFetcher } from '../../composables/useDraftsFetcher';
import { useViewReady } from '../../composables/useSkeleton';
import Button from 'primevue/button';
import AutobookingFormFields from '../../components/autobooking/FormFields.vue';
import AutobookingDraftGoodsModal from '../../components/autobooking/DraftGoodsModal.vue';
import AutobookingHints from '../../components/autobooking/Hints.vue';

// ============================================
// Store Setup
// ============================================
const router = useRouter();
const formStore = useAutobookingFormStore();
const userStore = useUserStore();
const draftStore = useDraftStore();
const warehouseStore = useWarehousesStore();
const { viewReady } = useViewReady();

// Use the drafts fetcher composable for automatic data fetching
const draftsFetcher = useDraftsFetcher({ immediate: false });

// ============================================
// Local State
// ============================================
const showHintsModal = ref(false);

// ============================================
// Computed
// ============================================
const warehouseOptions = computed(() =>
  warehouseStore.warehouses.map((w) => ({
    label: w.name,
    value: w.ID,
  })),
);

const canSubmit = computed(
  () => formStore.canSubmit && userStore.hasAutobookingCredits,
);

// ============================================
// Event Handlers
// ============================================
function goBack() {
  router.back();
}

function navigateToStoreBookings() {
  router.push({ name: 'StoreBookings' });
}

/**
 * Handles warehouse selection change
 * Delegates to warehouse store for transit fetching
 */
function handleWarehouseChange(warehouseId: number) {
  formStore.setWarehouse(warehouseId);

  if (warehouseId) {
    warehouseStore.fetchTransits(warehouseId);
  }
}

/**
 * Handles form submission
 * Navigates back on success
 */
async function handleSubmit() {
  if (!formStore.canSubmit) {
    return;
  }

  try {
    const success = await formStore.submitForm();
    if (success) {
      goBack();
    }
  } catch (error) {
    // Error is already handled in the store
    console.error('Failed to create autobooking:', error);
  }
}

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  try {
    if (warehouseStore.warehouses.length === 0) {
      await warehouseStore.fetchWarehouses();
    }
    // Fetch drafts using the composable's unified method
    await draftsFetcher.fetchIfEmpty();
  } finally {
    // Signal view is ready
    viewReady();
  }
});
</script>

<style scoped>
/* Custom styles for form elements if needed */
</style>
