import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useViewStore } from './view';
import { useUserStore } from './user';
import { useWarehousesStore } from './warehouses';
import type { AutobookingCreateData } from '../types';

interface FormState {
  draftId: string;
  warehouseId: number | null;
  transitWarehouseId: number | null;
  transitWarehouseName: string | null;
  supplyType: string;
  dateType: string;
  startDate: string;
  endDate: string;
  customDates: (string | Date)[];
  maxCoefficient: number;
  monopalletCount: number | null;
}

export const useAutobookingFormStore = defineStore('autobookingForm', () => {
  // State
  const form = ref<FormState>({
    draftId: '',
    warehouseId: null,
    transitWarehouseId: null,
    transitWarehouseName: null,
    supplyType: '',
    dateType: 'WEEK',
    startDate: '',
    endDate: '',
    customDates: [],
    maxCoefficient: 0,
    monopalletCount: null,
  });

  const useTransit = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const validationLoading = ref(false);
  const validationResult = ref<{
    result: {
      metaInfo: {
        monoMixQuantity: number;
        palletQuantity: number;
        supersafeQuantity: number;
      };
    };
  } | null>(null);
  const suggestedCoefficient = ref<number | null>(null);

  const warehouseStore = useWarehousesStore();
  const userStore = useUserStore();

  // Getters
  const isValid = computed(() => {
    if (!form.value.warehouseId) return false;
    if (!form.value.draftId) return false;
    if (!form.value.supplyType) return false;
    if (!form.value.dateType) return false;

    // Validate dates based on dateType
    if (form.value.dateType === 'WEEK' || form.value.dateType === 'MONTH') {
      return !!form.value.startDate;
    } else if (form.value.dateType === 'CUSTOM_PERIOD') {
      return !!(form.value.startDate && form.value.endDate);
    } else if (form.value.dateType === 'CUSTOM_DATES' || form.value.dateType === 'CUSTOM_DATES_SINGLE') {
      return form.value.customDates && form.value.customDates.length > 0;
    }

    // Check monopallet count for MONOPALLETE
    if (form.value.supplyType === 'MONOPALLETE' && !form.value.monopalletCount) {
      return false;
    }

    return true;
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  const validate = computed(() => isValid.value);

  const isSubmitting = computed(() => loading.value);

  const isCreating = computed(() => loading.value);

  const draftStore = computed(() => {
    // Import dynamically to avoid circular dependency
    const { useDraftStore } = require('./draft');
    return useDraftStore();
  });

  // Actions
  function resetForm() {
    form.value = {
      draftId: '',
      warehouseId: null,
      transitWarehouseId: null,
      transitWarehouseName: null,
      supplyType: '',
      dateType: 'WEEK',
      startDate: '',
      endDate: '',
      customDates: [],
      maxCoefficient: 0,
      monopalletCount: null,
    };
    useTransit.value = false;
    error.value = null;
    validationResult.value = null;
  }

  async function initialize() {
    // Initialize form - fetch necessary data
    if (warehouseStore.warehouses.length === 0) {
      await warehouseStore.fetchWarehouses();
    }
    await draftStore.value.fetchDrafts();
  }

  function handleWarehouseChange(warehouseId: number) {
    form.value.warehouseId = warehouseId;
    // Fetch transit options for this warehouse
    warehouseStore.fetchTransits(warehouseId);
  }

  async function validateWarehouse() {
    if (!form.value.warehouseId || !form.value.draftId) return;

    try {
      validationLoading.value = true;
      // Call API to validate warehouse and draft compatibility
      // This is a placeholder - actual implementation depends on backend API
      const { api } = require('../api');
      const response = await api.post('/autobookings/validate', {
        warehouseId: form.value.warehouseId,
        transitWarehouseId: form.value.transitWarehouseId,
        draftId: form.value.draftId,
      });
      validationResult.value = response.data;
    } catch (err) {
      console.error('Validation failed:', err);
      validationResult.value = null;
    } finally {
      validationLoading.value = false;
    }
  }

  async function submitForm(): Promise<boolean> {
    if (!isValid.value) {
      error.value = 'Форма заполнена неверно';
      return false;
    }

    const autobookingStore = useAutobookingStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const createData: AutobookingCreateData = {
        draftId: form.value.draftId,
        warehouseId: form.value.warehouseId,
        transitWarehouseId: form.value.transitWarehouseId,
        transitWarehouseName: form.value.transitWarehouseName,
        supplyType: form.value.supplyType,
        dateType: form.value.dateType,
        startDate: form.value.startDate || null,
        endDate: form.value.endDate || null,
        customDates: form.value.customDates,
        maxCoefficient: form.value.maxCoefficient,
        monopalletCount: form.value.monopalletCount,
      };

      const autobooking = await autobookingAPI.createAutobooking(createData);
      autobookingStore.addAutobooking(autobooking);

      // Decrease user's autobooking count
      userStore.decreaseAutobookingCount();

      resetForm();
      viewStore.setView('autobookings-main');

      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create autobooking';
      error.value = errorMsg;
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    form: readonly(form),
    useTransit,
    loading: readonly(loading),
    error: readonly(error),
    validationLoading: readonly(validationLoading),
    validationResult: readonly(validationResult),
    suggestedCoefficient: readonly(suggestedCoefficient),

    // Getters
    isValid,
    canSubmit,
    validate,
    isSubmitting,
    isCreating,
    draftStore: draftStore.value,
    warehouseStore,

    // Actions
    resetForm,
    initialize,
    handleWarehouseChange,
    validateWarehouse,
    submitForm,
  };
});
