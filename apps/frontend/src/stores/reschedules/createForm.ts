import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reschedulesAPI } from '../../api';
import { useReschedulesStore } from './index';
import { useViewStore } from '../view';
import type { RescheduleCreateData } from '../../types';

export const useRescheduleCreateFormStore = defineStore('rescheduleCreateForm', () => {
  // State
  const form = ref<RescheduleCreateData>({
    supplyId: '',
    targetDate: '',
    monotype: false,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isValid = computed(() => {
    return !!(form.value.supplyId && form.value.targetDate);
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  // Actions
  function resetForm() {
    form.value = {
      supplyId: '',
      targetDate: '',
      monotype: false,
    };
    error.value = null;
  }

  function setFormField<K extends keyof RescheduleCreateData>(
    field: K,
    value: RescheduleCreateData[K]
  ) {
    form.value[field] = value;
  }

  async function createReschedule() {
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const reschedulesStore = useReschedulesStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const reschedule = await reschedulesAPI.createReschedule(form.value);
      reschedulesStore.addReschedule(reschedule);
      
      resetForm();
      viewStore.setView('reschedules-main');
      
      return reschedule;
    } catch (err: any) {
      error.value = err.message || 'Failed to create reschedule';
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
    createReschedule,
  };
});
