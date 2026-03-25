import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useViewStore } from './view';
import { useUserStore } from './user';
import type { Autobooking, AutobookingUpdateData } from '../types';

export const useAutobookingUpdateStore = defineStore('autobookingUpdate', () => {
  // State
  const currentAutobooking = ref<Autobooking | null>(null);
  const form = ref<AutobookingUpdateData>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  // Calculate remaining autobooking count for update mode
  const remainingAutobookingCount = computed(() => {
    const userStore = useUserStore();
    const availableCount = userStore.user.autobookingCount;
    
    if (!currentAutobooking.value) return availableCount;
    
    // Get the count of dates in the current form
    let currentFormCount = 0;
    if (form.value.dateType === 'CUSTOM_DATES' && form.value.customDates) {
      currentFormCount = form.value.customDates.length;
    } else if (form.value.dateType === 'CUSTOM_DATES_SINGLE' && form.value.customDates) {
      currentFormCount = 1; // CUSTOM_DATES_SINGLE uses only 1 credit
    } else if (form.value.dateType === 'range' && form.value.startDate && form.value.endDate) {
      // For range, count the number of days
      const start = new Date(form.value.startDate);
      const end = new Date(form.value.endDate);
      currentFormCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    // Get the original count from the autobooking
    let originalCount = 0;
    if (currentAutobooking.value.dateType === 'CUSTOM_DATES' && currentAutobooking.value.customDates) {
      originalCount = currentAutobooking.value.customDates.length;
    } else if (currentAutobooking.value.dateType === 'CUSTOM_DATES_SINGLE' && currentAutobooking.value.customDates) {
      originalCount = 1;
    } else if (currentAutobooking.value.dateType === 'range' && currentAutobooking.value.startDate && currentAutobooking.value.endDate) {
      const start = new Date(currentAutobooking.value.startDate);
      const end = new Date(currentAutobooking.value.endDate);
      originalCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    // The adjustment: original uses X credits, new uses Y credits
    // Available = available + original - new
    return availableCount + originalCount - currentFormCount;
  });

  const isValid = computed(() => {
    if (!form.value.name) return false;
    if (!form.value.warehouseIds || form.value.warehouseIds.length === 0) return false;
    
    if (form.value.dateType === 'range') {
      return !!(form.value.startDate && form.value.endDate);
    } else if (form.value.dateType === 'custom') {
      return form.value.customDates && form.value.customDates.length > 0;
    }
    
    return true;
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  const hasChanges = computed(() => {
    if (!currentAutobooking.value) return false;
    
    const fields: (keyof AutobookingUpdateData)[] = [
      'name', 'dateType', 'startDate', 'endDate', 'customDates',
      'warehouseIds', 'draftId', 'coefficient', 'monotype'
    ];
    
    return fields.some(field => {
      const original = currentAutobooking.value?.[field as keyof Autobooking];
      const current = form.value[field];
      return JSON.stringify(original) !== JSON.stringify(current);
    });
  });

  // Actions
  function loadAutobooking(autobooking: Autobooking) {
    currentAutobooking.value = autobooking;
    form.value = {
      name: autobooking.name,
      dateType: autobooking.dateType,
      startDate: autobooking.startDate,
      endDate: autobooking.endDate,
      customDates: autobooking.customDates,
      warehouseIds: autobooking.warehouseIds,
      draftId: autobooking.draftId,
      coefficient: autobooking.coefficient,
      monotype: autobooking.monotype,
    };
    isFetched.value = true;
  }

  function resetForm() {
    currentAutobooking.value = null;
    form.value = {};
    error.value = null;
    isFetched.value = false;
  }

  function setFormField<K extends keyof AutobookingUpdateData>(
    field: K,
    value: AutobookingUpdateData[K]
  ) {
    form.value[field] = value;
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

      const autobooking = await autobookingAPI.updateAutobooking(
        currentAutobooking.value.id,
        form.value
      );
      
      autobookingStore.updateAutobookingInList(autobooking.id, autobooking);
      
      resetForm();
      viewStore.setView('autobookings-main');
      
      return autobooking;
    } catch (err: any) {
      error.value = err.message || 'Failed to update autobooking';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    currentAutobooking: readonly(currentAutobooking),
    form: readonly(form),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),

    // Getters
    isValid,
    canSubmit,
    hasChanges,
    remainingAutobookingCount,

    // Actions
    loadAutobooking,
    resetForm,
    setFormField,
    updateAutobooking,
  };
});
