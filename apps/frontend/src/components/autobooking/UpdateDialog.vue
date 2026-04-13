<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :modal="true"
    :draggable="false"
    header="Редактирование автобронирования"
    class="autobooking-dialog"
    :style="{ width: '95%', maxWidth: '700px' }"
    @hide="handleClose"
  >
    <div class="max-h-[60vh] overflow-auto p-2">
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
          :loading="updateStore.loading || isSubmitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          Обновить
        </Button>
      </div>
    </template>
  </Dialog>

  <AutobookingDraftGoodsModal
    v-model:show="draftStore.showGoodsModal"
    :goods="draftStore.draftGoods"
    :loading="draftStore.loadingGoods"
  />

  <AutobookingHints v-model:show="showHintsModal" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useAutobookingUpdateStore } from '@/stores/autobooking';
import { useWarehousesStore } from '@/stores/warehouses';
import { useDraftStore } from '@/stores/drafts';
import { useDraftsFetcher } from '../../composables/autobooking';
import AutobookingFormFields from './FormFields.vue';
import AutobookingDraftGoodsModal from './DraftGoodsModal.vue';
import AutobookingHints from './Hints.vue';
import type { Autobooking } from '../../types';

// ============================================
// Props & Emits
// ============================================
const props = defineProps<{
  show: boolean;
  autobooking: Autobooking | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  updated: [];
}>();

// ============================================
// Store Setup
// ============================================
const updateStore = useAutobookingUpdateStore();
const warehouseStore = useWarehousesStore();
const draftStore = useDraftStore();

// ============================================
// Local State
// ============================================
const showHintsModal = ref(false);
const isSubmitting = ref(false);
const isInitializing = ref(false);

// ============================================
// Computed
// ============================================
const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

const warehouseOptions = computed(() =>
  warehouseStore.warehouses.map((w) => ({
    label: w.name,
    value: w.ID,
  })),
);

// Use store's computed properties directly for proper reactivity
const canSubmit = computed(() => {
  return (
    updateStore.isValid &&
    updateStore.hasChanges &&
    !updateStore.loading &&
    !isSubmitting.value
  );
});

// Use the drafts fetcher composable for automatic data fetching
const draftsFetcher = useDraftsFetcher({ immediate: false });

// ============================================
// Watchers
// ============================================
watch(
  () => props.show,
  async (newValue) => {
    if (newValue && props.autobooking && !isInitializing.value) {
      isInitializing.value = true;
      try {
        // Initialize data when dialog opens
        if (warehouseStore.warehouses.length === 0) {
          await warehouseStore.fetchWarehouses();
        }
        // Fetch drafts using the composable's unified method
        await draftsFetcher.fetchIfEmpty();
        // Load the autobooking into the store
        await updateStore.loadAutobooking(props.autobooking);
        // Validate warehouse to fetch available supply types
        await updateStore.validateWarehouse();
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
  updateStore.resetForm();
}

function handleWarehouseChange(warehouseId: number) {
  updateStore.handleWarehouseChange(warehouseId);
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  try {
    isSubmitting.value = true;
    await updateStore.updateAutobooking();
    emit('updated');
    handleClose();
  } catch (error) {
    console.error('Failed to update autobooking:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.autobooking-dialog :deep(.p-dialog-content) {
  padding: 0;
}
</style>
