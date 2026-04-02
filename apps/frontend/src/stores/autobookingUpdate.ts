import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI, warehousesAPI } from '../api';
import { useAutobookingStore } from './autobooking';
import { useUserStore } from './user';
import { useWarehousesStore } from './warehouses';
import { useDraftStore } from './draft';
import type { ValidationResult } from './autobookingForm';
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

export const useAutobookingUpdateStore = defineStore(
  'autobookingUpdate',
  () => {
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
    const validationError = ref<string | null>(null);
    const validationResult = ref<ValidationResult | null>(null);
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
      } else if (
        form.value.dateType === 'CUSTOM_DATES_SINGLE' &&
        form.value.customDates
      ) {
        currentFormCount = 1; // CUSTOM_DATES_SINGLE uses only 1 credit
      } else if (
        (form.value.dateType === 'WEEK' || form.value.dateType === 'MONTH') &&
        form.value.startDate
      ) {
        // For week/month, uses 1 credit
        currentFormCount = 1;
      } else if (
        form.value.dateType === 'CUSTOM_PERIOD' &&
        form.value.startDate &&
        form.value.endDate
      ) {
        // For custom period, uses 1 credit
        currentFormCount = 1;
      }

      // Get the original count from the autobooking
      let originalCount = 0;
      if (
        currentAutobooking.value.dateType === 'CUSTOM_DATES' &&
        currentAutobooking.value.customDates
      ) {
        originalCount = currentAutobooking.value.customDates.length;
      } else if (
        currentAutobooking.value.dateType === 'CUSTOM_DATES_SINGLE' &&
        currentAutobooking.value.customDates
      ) {
        originalCount = 1;
      } else if (
        (currentAutobooking.value.dateType === 'WEEK' ||
          currentAutobooking.value.dateType === 'MONTH') &&
        currentAutobooking.value.startDate
      ) {
        originalCount = 1;
      } else if (
        currentAutobooking.value.dateType === 'CUSTOM_PERIOD' &&
        currentAutobooking.value.startDate &&
        currentAutobooking.value.endDate
      ) {
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

      // Coefficient is required (must be > 0)
      if (!form.value.maxCoefficient || form.value.maxCoefficient <= 0) {
        return false;
      }

      // Validate dates based on dateType
      if (form.value.dateType === 'WEEK' || form.value.dateType === 'MONTH') {
        return !!form.value.startDate;
      } else if (form.value.dateType === 'CUSTOM_PERIOD') {
        return !!(form.value.startDate && form.value.endDate);
      } else if (
        form.value.dateType === 'CUSTOM_DATES' ||
        form.value.dateType === 'CUSTOM_DATES_SINGLE'
      ) {
        return form.value.customDates && form.value.customDates.length > 0;
      }

      // Check monopallet count for MONOPALLETE
      if (
        form.value.supplyType === 'MONOPALLETE' &&
        !form.value.monopalletCount
      ) {
        return false;
      }

      return true;
    });

    const canSubmit = computed(() => isValid.value && !loading.value);

    const hasChanges = computed(() => {
      if (!currentAutobooking.value) return false;

      const fields: (keyof FormState)[] = [
        'draftId',
        'warehouseId',
        'transitWarehouseId',
        'transitWarehouseName',
        'supplyType',
        'dateType',
        'startDate',
        'endDate',
        'customDates',
        'maxCoefficient',
        'monopalletCount',
      ];

      return fields.some((field) => {
        const original = currentAutobooking.value?.[field as keyof Autobooking];
        const current = form.value[field];
        return JSON.stringify(original) !== JSON.stringify(current);
      });
    });

    // Actions
    /**
     * Helper function to normalize date to YYYY-MM-DD format
     */
    function normalizeDate(date: Date | string | null | undefined): string {
      if (!date) return '';
      if (typeof date === 'string') {
        // Handle ISO string format (2026-04-01T00:00:00.000Z)
        if (date.includes('T')) {
          return date.split('T')[0];
        }
        return date; // Already in YYYY-MM-DD format
      }
      // Handle Date object
      return date.toISOString().split('T')[0];
    }

    /**
     * Helper function to normalize custom dates array
     * Converts Date objects or ISO strings to YYYY-MM-DD format
     */
    function normalizeCustomDates(
      dates: (Date | string)[] | null | undefined,
    ): string[] {
      if (!dates || !Array.isArray(dates)) return [];
      return dates.map((date) => {
        if (date instanceof Date) {
          // Handle Date object - convert to YYYY-MM-DD
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        if (typeof date === 'string') {
          // Handle ISO string format (2026-04-01T00:00:00.000Z)
          if (date.includes('T')) {
            return date.split('T')[0];
          }
          return date; // Already in YYYY-MM-DD format
        }
        return String(date);
      });
    }

    function openUpdate(autobooking: Autobooking) {
      currentAutobooking.value = autobooking;
      form.value = {
        draftId: autobooking.draftId,
        warehouseId: autobooking.warehouseId,
        transitWarehouseId: autobooking.transitWarehouseId,
        transitWarehouseName: autobooking.transitWarehouseName,
        supplyType: autobooking.supplyType,
        dateType: autobooking.dateType,
        startDate: normalizeDate(autobooking.startDate),
        endDate: normalizeDate(autobooking.endDate),
        customDates: normalizeCustomDates(autobooking.customDates),
        maxCoefficient: autobooking.maxCoefficient,
        monopalletCount: autobooking.monopalletCount,
      };
      useTransit.value = !!autobooking.transitWarehouseId;
      isFetched.value = true;
    }

    async function loadAutobooking(autobooking: Autobooking) {
      openUpdate(autobooking);
      // Trigger validation to fetch available supply types
      // This is needed when loading from localStorage (page reload)
      if (autobooking.warehouseId && autobooking.draftId) {
        await validateWarehouse();
      }
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

    /**
     * Validates warehouse goods for selected draft
     * Checks if warehouse can accept goods from the draft
     */
    async function validateWarehouse(): Promise<boolean> {
      const draftStore = useDraftStore();

      if (!form.value.draftId || !form.value.warehouseId) {
        validationError.value = 'Выберите черновик и склад для валидации';
        return false;
      }
      const accountId = userStore.selectedAccount?.id;
      if (!accountId) {
        validationError.value = 'Не выбран аккаунт';
        return false;
      }

      // Get supplierId from selected draft or current autobooking
      const draft = draftStore.drafts.find((d) => d.id === form.value.draftId);
      const supplierId =
        draft?.supplierId ?? currentAutobooking.value?.supplierId;

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
      } catch (err: any) {
        console.error('Validation failed:', err);

        // Handle inactive warehouse error specifically
        if (
          err?.response?.data?.message === 'Inactive warehouse' ||
          err?.message?.includes('Inactive warehouse')
        ) {
          form.value.warehouseId = null;
          error.value = 'Выбранный склад неактивен';
          alert('Ошибка валидации: Выбранный склад неактивен');
        }

        const errorMsg =
          err instanceof Error ? err.message : 'Ошибка при валидации склада';
        validationError.value = errorMsg;
        validationResult.value = null;
        return false;
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
          updateData,
        );

        autobookingStore.updateAutobookingInList(autobooking.id, autobooking);

        resetForm();

        return autobooking;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to update autobooking';
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
      useTransit: readonly(useTransit),
      loading: readonly(loading),
      error: readonly(error),
      isFetched: readonly(isFetched),
      validationLoading: readonly(validationLoading),
      validationError: readonly(validationError),
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

      // Exposed for v-model binding (internal mutations allowed)
      _form: form,
      _useTransit: useTransit,
    };
  },
);
