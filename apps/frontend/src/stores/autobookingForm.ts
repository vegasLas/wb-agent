import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI, warehousesAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useUserStore } from './user';
import { useDraftStore } from './draft';
import type { AutobookingCreateData } from '../types';

// Form field types
export type DateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_PERIOD'
  | 'CUSTOM_DATES'
  | 'CUSTOM_DATES_SINGLE';
export type SupplyType = 'SUPPLY' | 'MONOPALLETE' | 'QR_SUPPLY' | '';

// Validation result type
export interface ValidationResult {
  result: {
    metaInfo: {
      monoMixQuantity: number;
      palletQuantity: number;
      supersafeQuantity: number;
    };
    errors?: Array<{ message: string }>;
  };
}

// Individual form fields for better reactivity and type safety
const createDefaultFormState = () => ({
  draftId: '',
  warehouseId: null as number | null,
  transitWarehouseId: null as number | null,
  transitWarehouseName: null as string | null,
  supplyType: '' as SupplyType,
  dateType: 'WEEK' as DateType,
  startDate: '',
  endDate: '',
  customDates: [] as (string | Date)[],
  maxCoefficient: 0,
  monopalletCount: null as number | null,
});

export type FormState = ReturnType<typeof createDefaultFormState>;

export const useAutobookingFormStore = defineStore('autobookingForm', () => {
  // ============================================
  // State
  // ============================================
  const form = ref<FormState>(createDefaultFormState());
  const useTransit = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const suggestedCoefficient = ref<number | null>(null);

  // Validation state
  const validationLoading = ref(false);
  const validationError = ref<string | null>(null);
  const validationResult = ref<ValidationResult | null>(null);

  // ============================================
  // Getters
  // ============================================

  /**
   * Validates the form state
   * Checks all required fields based on dateType and supplyType
   */
  const isValid = computed((): boolean => {
    const {
      warehouseId,
      draftId,
      supplyType,
      dateType,
      startDate,
      endDate,
      customDates,
      monopalletCount,
      transitWarehouseId,
      maxCoefficient,
    } = form.value;

    // Required fields for all types
    if (!warehouseId || !draftId || !supplyType || !dateType) {
      return false;
    }

    // Coefficient is required (must be > 0)
    if (!maxCoefficient || maxCoefficient <= 0) {
      return false;
    }

    // Transit warehouse validation (required when useTransit is true)
    if (useTransit.value && !transitWarehouseId) {
      return false;
    }

    // Date validation based on dateType
    switch (dateType) {
      case 'WEEK':
      case 'MONTH':
        if (!startDate) return false;
        break;
      case 'CUSTOM_PERIOD':
        if (!startDate || !endDate) return false;
        break;
      case 'CUSTOM_DATES':
      case 'CUSTOM_DATES_SINGLE':
        if (!customDates || customDates.length === 0) return false;
        break;
      default:
        return false;
    }

    // Supply type specific validation
    if (
      supplyType === 'MONOPALLETE' &&
      (!monopalletCount || monopalletCount <= 0)
    ) {
      return false;
    }

    return true;
  });

  const canSubmit = computed(() => isValid.value && !loading.value);

  // ============================================
  // Actions
  // ============================================

  /**
   * Resets the form to its default state
   */
  function resetForm() {
    form.value = createDefaultFormState();
    useTransit.value = false;
    error.value = null;
  }

  /**
   * Updates a specific form field
   */
  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    form.value[field] = value;
  }

  /**
   * Updates multiple form fields at once
   */
  function updateFields(updates: Partial<FormState>) {
    Object.assign(form.value, updates);
  }

  /**
   * Sets the warehouse and resets transit-related fields
   */
  function setWarehouse(warehouseId: number | null) {
    form.value.warehouseId = warehouseId;
    if (!warehouseId) {
      form.value.transitWarehouseId = null;
      form.value.transitWarehouseName = null;
      useTransit.value = false;
    }
  }

  /**
   * Sets the transit warehouse
   */
  function setTransitWarehouse(
    transitWarehouseId: number | null,
    transitWarehouseName: string | null = null,
  ) {
    form.value.transitWarehouseId = transitWarehouseId;
    form.value.transitWarehouseName = transitWarehouseName;
  }

  /**
   * Submits the form to create a new autobooking
   * Returns true on success, false on failure
   */
  async function submitForm(): Promise<boolean> {
    if (!isValid.value) {
      error.value = 'Форма заполнена неверно';
      return false;
    }

    const autobookingStore = useAutobookingStore();
    const userStore = useUserStore();

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

      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create autobooking';
      error.value = errorMsg;
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Validates warehouse goods for selected draft
   * Checks if warehouse can accept goods from the draft
   */
  async function validateWarehouse(): Promise<boolean> {
    const draftStore = useDraftStore();
    const userStore = useUserStore();

    if (!form.value.draftId || !form.value.warehouseId) {
      validationError.value = 'Выберите черновик и склад для валидации';
      return false;
    }
    const accountId = userStore.selectedAccount?.id;
    if (!accountId) {
      validationError.value = 'Не выбран аккаунт';
      return false;
    }

    // Get supplierId from selected draft
    const draft = draftStore.drafts.find((d) => d.id === form.value.draftId);
    const supplierId = draft?.supplierId;

    if (!supplierId) {
      validationError.value = 'Не найден поставщик для черновика';
      return false;
    }

    try {
      validationLoading.value = true;
      validationError.value = null;

      const response = await warehousesAPI.validateWarehouse({
        accountId,
        supplierId,
        draftID: form.value.draftId,
        warehouseId: form.value.warehouseId,
        transitWarehouseId: form.value.transitWarehouseId,
      });

      if (response.data?.result) {
        validationResult.value = response.data as ValidationResult;
        return true;
      } else {
        validationResult.value = null;
        return false;
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Ошибка при валидации склада';
      validationError.value = errorMsg;
      validationResult.value = null;
      return false;
    } finally {
      validationLoading.value = false;
    }
  }

  return {
    // State (readonly to prevent direct mutation from outside)
    form: readonly(form),
    useTransit: readonly(useTransit),
    loading: readonly(loading),
    error: readonly(error),
    suggestedCoefficient: readonly(suggestedCoefficient),

    // Getters
    isValid,
    canSubmit,

    // Actions
    resetForm,
    updateField,
    updateFields,
    setWarehouse,
    setTransitWarehouse,
    submitForm,
    validateWarehouse,

    // Validation
    validationLoading,
    validationError,
    validationResult,

    // Exposed for v-model binding (internal mutations allowed)
    _useTransit: useTransit,
    _form: form,
  };
});
