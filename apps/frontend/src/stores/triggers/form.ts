import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { triggersAPI } from '@/api';
import { useTriggerStore } from './list';
import { useWarehousesStore } from '@/stores/warehouses';
import { SUPPLY_TYPES } from '@/constants';
import type { CreateTriggerRequest, SearchMode } from '@/types';

export const useTriggerFormStore = defineStore('triggerForm', () => {
  // Dependencies
  const warehouseStore = useWarehousesStore();
  const useCheckPeriod = ref(false);

  // Form state
  const form = ref<CreateTriggerRequest>({
    warehouseIds: [],
    supplyTypes: [],
    checkInterval: 180,
    maxCoefficient: 0,
    searchMode: 'TODAY',
    startDate: null,
    endDate: null,
    selectedDates: [],
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Options for selects
  const searchModeOptions = [
    { label: 'Сегодня', value: 'TODAY' as SearchMode },
    { label: 'Завтра', value: 'TOMORROW' as SearchMode },
    { label: 'Неделя (включая текущий день)', value: 'WEEK' as SearchMode },
    { label: 'Искать до нахождения', value: 'UNTIL_FOUND' as SearchMode },
    { label: 'Выбрать даты', value: 'CUSTOM_DATES' as SearchMode },
    { label: 'Диапазон', value: 'RANGE' as SearchMode },
  ];

  const supplyTypesOptions = [
    { label: 'Короба', value: SUPPLY_TYPES.BOX },
    { label: 'Суперсейф', value: SUPPLY_TYPES.SUPERSAFE },
    { label: 'Монопаллеты', value: SUPPLY_TYPES.MONOPALLETE },
  ];

  const warehouseOptions = computed(() => {
    return warehouseStore.warehouses.map((warehouse) => ({
      label: warehouse.name,
      value: warehouse.ID,
    }));
  });

  // Computed
  const showDatePicker = computed(
    () => form.value.searchMode === 'CUSTOM_DATES',
  );
  const showRangePicker = computed(() => form.value.searchMode === 'WEEK');

  const isValid = computed(() => {
    return (
      form.value.warehouseIds.length > 0 &&
      form.value.supplyTypes.length > 0 &&
      (form.value.checkInterval ?? 0) > 0 &&
      form.value.searchMode !== undefined
    );
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  // Actions
  function resetForm() {
    form.value = {
      warehouseIds: [],
      supplyTypes: [],
      checkInterval: 180,
      maxCoefficient: 0,
      searchMode: 'TODAY',
      startDate: null,
      endDate: null,
      selectedDates: [],
    };
    useCheckPeriod.value = false;
    error.value = null;
  }

  function setFormField<K extends keyof CreateTriggerRequest>(
    field: K,
    value: CreateTriggerRequest[K],
  ) {
    form.value[field] = value;
  }

  async function initializeWarehouses() {
    if (warehouseStore.warehouses.length === 0) {
      await warehouseStore.fetchWarehouses();
    }
  }

  async function createTrigger() {
    if (!isValid.value) {
      throw new Error('Form is not valid');
    }

    const triggerStore = useTriggerStore();

    try {
      loading.value = true;
      error.value = null;

      const trigger = await triggersAPI.createTrigger(form.value);
      triggerStore.triggers.unshift(
        trigger as unknown as (typeof triggerStore.triggers)[0],
      );

      resetForm();

      return trigger;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create trigger';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function submitForm() {
    return createTrigger();
  }

  return {
    // State
    form: readonly(form),
    loading: readonly(loading),
    error: readonly(error),
    useCheckPeriod,

    // Options
    searchModeOptions,
    supplyTypesOptions,
    warehouseOptions,

    // Computed
    isValid,
    canSubmit,
    showDatePicker,
    showRangePicker,

    // Actions
    resetForm,
    setFormField,
    initializeWarehouses,
    createTrigger,
    submitForm,

    // Exposed for v-model binding (internal mutations allowed)
    _form: form,
  };
});
