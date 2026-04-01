<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Редактирование автобронирования
      </h3>
      <Button
        variant="outlined"
        severity="warn"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle" />
      </Button>
    </div>

    <AutobookingFormFields
      v-model:form="updateStore._form"
      v-model:use-transit="updateStore._useTransit"
      :warehouse-options="warehouseOptions"
      :validation-loading="updateStore.validationLoading"
      :validation-result="updateStore.validationResult"
      :suggested-coefficient="updateStore.suggestedCoefficient"
      :supplier-id="updateStore.currentAutobooking?.supplierId"
      @warehouse-change="handleWarehouseChange"
      @validate-warehouse="updateStore.validateWarehouse"
    />
  </div>

  <MainButton
    v-if="canSubmit"
    :disabled="updateStore.loading"
    :progress="isSubmitting || updateStore.loading"
    text="Обновить"
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
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';
import { useWarehousesStore } from '../../stores/warehouses';
import { useDraftStore } from '../../stores/draft';
import { useUserStore } from '../../stores/user';
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
const updateStore = useAutobookingUpdateStore();
const warehouseStore = useWarehousesStore();
const draftStore = useDraftStore();
const userStore = useUserStore();
const { viewReady } = useViewReady();

// Use the drafts fetcher composable for automatic data fetching
const draftsFetcher = useDraftsFetcher({ immediate: false });

// ============================================
// Local State
// ============================================
const showHintsModal = ref(false);
const isSubmitting = ref(false);

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
  () => updateStore.isValid && !updateStore.loading && !isSubmitting.value,
);

// ============================================
// Event Handlers
// ============================================
function goBack() {
  router.back();
}

/**
 * Handles warehouse selection change
 */
function handleWarehouseChange(warehouseId: number) {
  updateStore.handleWarehouseChange(warehouseId);
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return;

  try {
    isSubmitting.value = true;
    await updateStore.updateAutobooking();
    goBack();
  } catch (error) {
    console.error('Failed to update autobooking:', error);
  } finally {
    isSubmitting.value = false;
  }
}

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  try {
    await updateStore.initialize();

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
