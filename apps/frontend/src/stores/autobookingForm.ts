import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useViewStore } from './view';
import type { AutobookingCreateData } from '../types';

export const useAutobookingFormStore = defineStore('autobookingForm', () => {
  // State
  const form = ref<AutobookingCreateData>({
    name: '',
    dateType: 'range',
    startDate: undefined,
    endDate: undefined,
    customDates: [],
    warehouseIds: [],
    draftId: undefined,
    coefficient: 0,
    monotype: false,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isValid = computed(() => {
    if (!form.value.name) return false;
    if (form.value.warehouseIds.length === 0) return false;
    
    if (form.value.dateType === 'range') {
      return !!(form.value.startDate && form.value.endDate);
    } else if (form.value.dateType === 'custom') {
      return form.value.customDates && form.value.customDates.length > 0;
    }
    
    return true;
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  // Actions
  function resetForm() {
    form.value = {
      name: '',
      dateType: 'range',
      startDate: undefined,
      endDate: undefined,
      customDates: [],
      warehouseIds: [],
      draftId: undefined,
      coefficient: 0,
      monotype: false,
    };
    error.value = null;
  }

  function setFormField<K extends keyof AutobookingCreateData>(
    field: K,
    value: AutobookingCreateData[K]
  ) {
    form.value[field] = value;
  }

  async function createAutobooking() {
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const autobookingStore = useAutobookingStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const autobooking = await autobookingAPI.createAutobooking(form.value);
      autobookingStore.addAutobooking(autobooking);
      
      resetForm();
      viewStore.setView('autobookings-main');
      
      return autobooking;
    } catch (err: any) {
      error.value = err.message || 'Failed to create autobooking';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    form: readonly(form),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    isValid,
    canSubmit,

    // Actions
    resetForm,
    setFormField,
    createAutobooking,
  };
});
