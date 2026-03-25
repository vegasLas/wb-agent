import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { triggersAPI } from '../api';
import { useTriggerStore } from './triggers';
import { useViewStore } from './view';
import type { TriggerCreateData } from '../types';

export const useTriggerFormStore = defineStore('triggerForm', () => {
  // State
  const form = ref<TriggerCreateData>({
    date: '',
    warehouseIds: [],
    maxCoefficient: 100,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isValid = computed(() => {
    return !!(form.value.date && form.value.warehouseIds.length > 0);
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  // Actions
  function resetForm() {
    form.value = {
      date: '',
      warehouseIds: [],
      maxCoefficient: 100,
    };
    error.value = null;
  }

  function setFormField<K extends keyof TriggerCreateData>(
    field: K,
    value: TriggerCreateData[K]
  ) {
    form.value[field] = value;
  }

  async function createTrigger() {
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const triggerStore = useTriggerStore();
    const viewStore = useViewStore();

    try {
      loading.value = true;
      error.value = null;

      const trigger = await triggersAPI.createTrigger(form.value);
      triggerStore.triggers.unshift(trigger);
      
      resetForm();
      viewStore.setView('triggers-main');
      
      return trigger;
    } catch (err: any) {
      error.value = err.message || 'Failed to create trigger';
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
    createTrigger,
  };
});
