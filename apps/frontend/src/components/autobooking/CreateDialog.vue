<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :modal="true"
    :draggable="false"
    header="Создание автобронирования"
    class="autobooking-dialog"
    :style="{ width: '95%', maxWidth: '700px' }"
    @hide="handleClose"
  >
    <div class="max-h-[60vh] overflow-auto p-2">
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

    <template #footer>
      <div class="flex flex-col gap-2 p-2">
        <Message
          v-if="formStore.slotError"
          severity="error"
          class="w-full"
        >
          {{ formStore.slotError }}
        </Message>
        <div class="flex gap-2">
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
          :loading="formStore.loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          Создать
        </Button>
      </div>
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
import Message from 'primevue/message';
import { useAutobookingFormStore } from '@/stores/autobooking';
import { useUserStore } from '@/stores/user';
import { useDraftStore } from '@/stores/drafts';
import { useWarehousesStore } from '@/stores/warehouses';
import { useDraftsFetcher } from '../../composables/autobooking';
import AutobookingFormFields from './FormFields.vue';
import AutobookingDraftGoodsModal from './DraftGoodsModal.vue';
import AutobookingHints from './Hints.vue';

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
const formStore = useAutobookingFormStore();
const userStore = useUserStore();
const draftStore = useDraftStore();
const warehouseStore = useWarehousesStore();

// ============================================
// Local State
// ============================================
const showHintsModal = ref(false);
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

// Use store's canSubmit directly for proper reactivity
const canSubmit = computed(() => {
  return formStore.canSubmit;
});

// Use the drafts fetcher composable for automatic data fetching
const draftsFetcher = useDraftsFetcher({ immediate: false });

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
        formStore.resetForm();
        // Initialize data when dialog opens
        if (warehouseStore.warehouses.length === 0) {
          await warehouseStore.fetchWarehouses();
        }
        // Fetch drafts using the composable's unified method
        await draftsFetcher.fetchIfEmpty();
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
  formStore.resetForm();
}

function handleWarehouseChange(warehouseId: number) {
  formStore.setWarehouse(warehouseId);

  if (warehouseId) {
    warehouseStore.fetchTransits(warehouseId);
  }
}

async function handleSubmit() {
  if (!formStore.canSubmit) {
    return;
  }

  try {
    const success = await formStore.submitForm();
    if (success) {
      emit('created');
      handleClose();
    }
  } catch (error) {
    console.error('Failed to create autobooking:', error);
  }
}
</script>

<style scoped>
.autobooking-dialog :deep(.p-dialog-content) {
  padding: 0;
}
</style>
