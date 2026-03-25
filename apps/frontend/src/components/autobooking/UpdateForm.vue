<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Редактирование автобронирования
      </h3>
      <BaseButton
        variant="soft"
        color="yellow"
        @click="showHintsModal = true"
      >
        <QuestionMarkCircleIcon class="w-5 h-5" />
      </BaseButton>
    </div>

    <AutobookingFormFields
      v-model:form="form"
      v-model:use-transit="useTransit"
      :warehouse-options="warehouseOptions"
      :validation-loading="store.validationLoading"
      :validation-result="store.validationResult"
      :suggested-coefficient="store.suggestedCoefficient"
      :supplier-id="store.currentAutobooking?.supplierId"
      @warehouse-change="store.handleWarehouseChange"
      @validate-warehouse="store.validateWarehouse"
    />
  </div>

  <MainButton
    v-if="canSubmit && !loading"
    :disabled="!canSubmit"
    :progress="isSubmitting || loading"
    text="Обновить"
    @click="handleSubmit"
  />

  <AutobookingDraftGoodsModal
    v-model:show="draftStore.showGoodsModal"
    :goods="draftStore.draftGoods"
    :loading="draftStore.loadingGoods"
  />

  <AutobookingHints
    v-model:show="showHintsModal"
  />
  <BackButton @click="$emit('back')" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { BackButton, MainButton } from 'vue-tg';
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline';
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';
import { useWarehousesStore } from '../../stores/warehouses';
import { useDraftStore } from '../../stores/draft';
import { BaseButton } from '../ui';
import AutobookingFormFields from './FormFields.vue';
import AutobookingDraftGoodsModal from './DraftGoodsModal.vue';
import AutobookingHints from './Hints.vue';

const store = useAutobookingUpdateStore();
const warehouseStore = useWarehousesStore();
const draftStore = useDraftStore();

const showHintsModal = ref(false);
const isSubmitting = ref(false);

const form = computed({
  get: () => store.form,
  set: (value) => {
    // Update form fields in store
    Object.assign(store.form, value);
  },
});

const useTransit = computed({
  get: () => store.useTransit,
  set: (value) => {
    store.useTransit = value;
  },
});

const loading = computed(() => store.loading);

const warehouseOptions = computed(() =>
  warehouseStore.warehouses.map((w) => ({
    label: w.name,
    value: w.ID,
  }))
);

const canSubmit = computed(
  () => store.isValid && !loading.value && !isSubmitting.value,
);

const emit = defineEmits(['back']);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return;

  try {
    isSubmitting.value = true;
    await store.updateAutobooking();
    emit('back');
  } catch (error) {
    console.error('Failed to update autobooking:', error);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await store.initialize();
  if (warehouseStore.warehouses.length === 0) {
    await warehouseStore.fetchWarehouses();
  }
  if (draftStore.drafts.length === 0) {
    await draftStore.fetchDrafts();
  }
});
</script>

<style scoped>
/* Custom styles for form elements if needed */
</style>
