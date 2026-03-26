<template>
  <div class="space-y-4">
    <!-- No Autobooking Count Alert -->
    <Message
      v-if="userStore.user.autobookingCount === 0"
      severity="error"
      class="w-full"
    >
      <div class="flex flex-col gap-2">
        <div class="font-semibold">Недостаточно кредитов</div>
        <div>Приобретите пакет кредитов, чтобы создать автобронирование.</div>
        <div class="mt-2">
          <Button
            variant="outlined"
            severity="primary"
            @click="viewStore.setView('store-bookings')"
          >
            Купить кредиты
          </Button>
        </div>
      </div>
    </Message>

    <div class="flex items-center justify-end mb-6">
      <h3 class="text-xl text-center font-semibold flex-1">
        Создание автобронирования
      </h3>
      <Button
        variant="outlined"
        severity="warn"
        @click="showHintsModal = true"
      >
        <i class="pi pi-question-circle"></i>
      </Button>
    </div>

    <!-- Template Selection -->
    <AutobookingFormFields
      v-model:form="form"
      v-model:use-transit="useTransit"
      :warehouse-options="warehouseOptions"
      :supplier-id="userStore.activeSupplier?.supplierId"
      @warehouse-change="store.handleWarehouseChange"
    />
  </div>

  <!-- Telegram Main Button -->
  <MainButton
    v-if="canSubmit && userStore.user.autobookingCount > 0"
    :disabled="store.loading"
    :progress="store.loading"
    text="Создать"
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
import { useAutobookingFormStore } from '../../stores/autobookingForm';
import { useUserStore } from '../../stores/user';
import { useViewStore } from '../../stores/view';
import { useDraftStore } from '../../stores/draft';
import { useWarehousesStore } from '../../stores/warehouses';
import Button from 'primevue/button';
import Message from 'primevue/message';
import AutobookingFormFields from './FormFields.vue';
import AutobookingDraftGoodsModal from './DraftGoodsModal.vue';
import AutobookingHints from './Hints.vue';

const store = useAutobookingFormStore();
const userStore = useUserStore();
const viewStore = useViewStore();
const draftStore = useDraftStore();
const warehouseStore = useWarehousesStore();

const showHintsModal = ref(false);

const form = computed({
  get: () => store.form,
  set: (value) => {
    Object.assign(store.form, value);
  },
});

const useTransit = computed({
  get: () => store.useTransit,
  set: (value) => {
    store.useTransit = value;
  },
});

const warehouseOptions = computed(() =>
  warehouseStore.warehouses.map((w) => ({
    label: w.name,
    value: w.ID,
  }))
);

const canSubmit = computed(() => {
  return store.isValid && !store.loading && userStore.user.autobookingCount > 0;
});

const emit = defineEmits(['back']);

// Handle form submission with auto-close on success
async function handleSubmit() {
  try {
    const success = await store.submitForm();
    if (success) {
      emit('back');
    }
  } catch (error) {
    console.error('Failed to create autobooking:', error);
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
