import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reschedulesAPI } from '../../api';
import { useReschedulesStore } from './index';
import { useViewStore } from '../view';
import type { Reschedule, RescheduleUpdateData } from '../../types';

export const useRescheduleUpdateFormStore = defineStore('rescheduleUpdateForm', () => {
  // State
  const currentReschedule = ref<Reschedule | null>(null);
  const form = ref<RescheduleUpdateData>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  const isValid = computed(() => {
    return !!(form.value.targetDate);
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  const hasChanges = computed(() => {
    if (!currentReschedule.value) return false;
    
    return (
      form.value.targetDate !== currentReschedule.value.targetDate ||
      form.value.monotype !== currentReschedule.value.monotype
    );
  });

  // Actions
  function loadReschedule(reschedule: Reschedule) {
    currentReschedule.value = reschedule;
    form.value = {
      targetDate: reschedule.targetDate,
      monotype: reschedule.monotype,
    };
    isFetched.value = true;
  }

  function resetForm() {
    currentReschedule.value = null;
    form.value = {};
    error.value = null;
    isFetched.value = false;
  }

  function setFormField<K extends keyof RescheduleUpdateData>(
    field: K,
    value: RescheduleUpdateData[K]
  ) {
    form.value[field] = value;
  }

  async function updateReschedule() {
    if (!currentReschedule.value) {
      throw new Error('No reschedule loaded');
    }
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const reschedulesStore = useReschedulesStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const reschedule = await reschedulesAPI.updateReschedule(
        currentReschedule.value.id,
        form.value
      );
      
      reschedulesStore.updateRescheduleInList(reschedule.id, reschedule);
      
      resetForm();
      viewStore.setView('reschedules-main');
      
      return reschedule;
    } catch (err: any) {
      error.value = err.message || 'Failed to update reschedule';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    currentReschedule: readonly(currentReschedule),
    form: readonly(form),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),

    // Getters
    isValid,
    canSubmit,
    hasChanges,

    // Actions
    loadReschedule,
    resetForm,
    setFormField,
    updateReschedule,
  };
});
