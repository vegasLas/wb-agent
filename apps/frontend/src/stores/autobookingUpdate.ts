import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI, warehousesAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useViewStore } from './view';
import { useUserStore } from './user';
import { useWarehousesStore } from './warehouses';
import type { Autobooking, AutobookingUpdateData } from '../types';

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

export const useAutobookingUpdateStore = defineStore('autobookingUpdate', () => {
  // State
  const currentAutobooking = ref<Autobooking | null>(null);
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
  const isFetched = ref(false);
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

  const userStore = useUserStore();
  const warehouseStore = useWarehousesStore();

  // Getters
  // Calculate remaining autobooking count for update mode
  const remainingAutobookingCount = computed(() => {
    const availableCount = userStore.user.autobookingCount;
    
    if (!currentAutobooking.value) return availableCount;
    
    // Get the count of dates in the current form
    let currentFormCount = 0;
    if (form.value.dateType === 'CUSTOM_DATES' && form.value.customDates) {
      currentFormCount = form.value.customDates.length;
    } else if (form.value.dateType === 'CUSTOM_DATES_SINGLE' && form.value.customDates) {
      currentFormCount = 1; // CUSTOM_DATES_SINGLE uses only 1 credit
    } else if ((form.value.dateType === 'WEEK' || form.value.dateType === 'MONTH') && form.value.startDate) {
      // For week/month, uses 1 credit
      currentFormCount = 1;
    } else if (form.value.dateType === 'CUSTOM_PERIOD' && form.value.startDate && form.value.endDate) {
      // For custom period, uses 1 credit
      currentFormCount = 1;
    }
    
    // Get the original count from the autobooking
    let originalCount = 0;
    if (currentAutobooking.value.dateType === 'CUSTOM_DATES' && currentAutobooking.value.customDates) {
      originalCount = currentAutobooking.value.customDates.length;
    } else if (currentAutobooking.value.dateType === 'CUSTOM_DATES_SINGLE' && currentAutobooking.value.customDates) {
      originalCount = 1;
    } else if ((currentAutobooking.value.dateType === 'WEEK' || currentAutobooking.value.dateType === 'MONTH') && currentAutobooking.value.startDate) {
      originalCount = 1;
    } else if (currentAutobooking.value.dateType === 'CUSTOM_PERIOD' && currentAutobooking.value.startDate && currentAutobooking.value.endDate) {
      originalCount = 1;
    }
    
    // The adjustment: original uses X credits, new uses Y credits
    // Available = available + original - new
    return availableCount + originalCount - currentFormCount;
  });

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

  const hasChanges = computed(() => {
    if (!currentAutobooking.value) return false;
    
    const fields: (keyof FormState)[] = [
      'draftId', 'warehouseId', 'transitWarehouseId', 'transitWarehouseName',
      'supplyType', 'dateType', 'startDate', 'endDate', 'customDates',
      'maxCoefficient', 'monopalletCount'
    ];
    
    return fields.some(field => {
      const original = currentAutobooking.value?.[field as keyof Autobooking];
      const current = form.value[field];
      return JSON.stringify(original) !== JSON.stringify(current);
    });
  });

  // Actions
  function openUpdate(autobooking: Autobooking) {
    currentAutobooking.value = autobooking;
    form.value = {
      draftId: autobooking.draftId,
      warehouseId: autobooking.warehouseId,
      transitWarehouseId: autobooking.transitWarehouseId,
      transitWarehouseName: autobooking.transitWarehouseName,
      supplyType: autobooking.supplyType,
      dateType: autobooking.dateType,
      startDate: autobooking.startDate || '',
      endDate: autobooking.endDate || '',
      customDates: autobooking.customDates || [],
      maxCoefficient: autobooking.maxCoefficient,
      monopalletCount: autobooking.monopalletCount,
    };
    useTransit.value = !!autobooking.transitWarehouseId;
    isFetched.value = true;
  }

  function loadAutobooking(autobooking: Autobooking) {
    openUpdate(autobooking);
  }

  function resetForm() {
    currentAutobooking.value = null;
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
    isFetched.value = false;
    validationResult.value = null;
  }

  async function initialize() {
    // Initialize form - fetch necessary data
    if (warehouseStore.warehouses.length === 0) {
      await warehouseStore.fetchWarehouses();
    }
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
      const accountId = userStore.selectedAccount?.id;

      const response = await warehousesAPI.validateWarehouse({
        accountId,
        draftID: form.value.draftId,
        warehouseId: form.value.warehouseId,
        transitWarehouseId: form.value.transitWarehouseId,
      });

      if (response.success && response.data) {
        validationResult.value = response.data as unknown as typeof validationResult.value;
      } else {
        validationResult.value = null;
      }
    } catch (err) {
      console.error('Validation failed:', err);
      validationResult.value = null;
    } finally {
      validationLoading.value = false;
    }
  }

  async function updateAutobooking() {
    if (!currentAutobooking.value) {
      throw new Error('No autobooking loaded');
    }
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const autobookingStore = useAutobookingStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const updateData: AutobookingUpdateData = {
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

      const autobooking = await autobookingAPI.updateAutobooking(
        currentAutobooking.value.id,
        updateData
      );
      
      autobookingStore.updateAutobookingInList(autobooking.id, autobooking);
      
      resetForm();
      viewStore.setView('autobookings-main');
      
      return autobooking;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update autobooking';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    currentAutobooking: readonly(currentAutobooking),
    form: readonly(form),
    useTransit,
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),
    validationLoading: readonly(validationLoading),
    validationResult: readonly(validationResult),
    suggestedCoefficient: readonly(suggestedCoefficient),

    // Getters
    isValid,
    canSubmit,
    hasChanges,
    remainingAutobookingCount,

    // Actions
    openUpdate,
    loadAutobooking,
    resetForm,
    initialize,
    handleWarehouseChange,
    validateWarehouse,
    updateAutobooking,
  };
});
