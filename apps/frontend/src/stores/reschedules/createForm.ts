import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { useRescheduleStore } from './index';
import { useUserStore } from '../user';
import type { CreateAutobookingRescheduleRequest, Supply } from '../../types';

export interface RescheduleFormData {
  warehouseId: number | null;
  dateType: string;
  startDate: string | null;
  endDate: string | null;
  customDates: string[];
  maxCoefficient: number;
  supplyType: string;
  supplyId: string | null;
  currentDate: string | null;
}

export const useRescheduleCreateFormStore = defineStore(
  'rescheduleCreateForm',
  () => {
    const userStore = useUserStore();
    const rescheduleStore = useRescheduleStore();

    // Form state
    const form = ref<RescheduleFormData>({
      warehouseId: null,
      dateType: 'CUSTOM_DATES_SINGLE',
      startDate: null,
      endDate: null,
      customDates: [],
      maxCoefficient: 0,
      supplyType: 'BOX',
      supplyId: null,
      currentDate: null,
    });

    const formErrors = ref<Record<string, string>>({});
    const isSubmitting = ref(false);

    // UI State
    const showHintsModal = ref(false);
    const selectedSupplyId = ref<number | undefined>(undefined);
    const selectedDateType = ref('');
    const startDateInput = ref('');
    const endDateInput = ref('');
    const customDates = ref<(string | Date)[]>([]);
    const maxCoefficientInput = ref(0);

    // Simple validation (replace with yup if needed)
    const validate = computed(() => {
      const errors: string[] = [];
      
      if (!form.value.supplyId) errors.push('Выберите поставку');
      if (!form.value.warehouseId) errors.push('Склад обязателен');
      if (!form.value.supplyType) errors.push('Тип поставки обязателен');
      if (!form.value.dateType) errors.push('Выберите тип периода');
      if (form.value.maxCoefficient < 0 || form.value.maxCoefficient > 20) {
        errors.push('Коэффициент должен быть от 0 до 20');
      }
      
      // Date validation based on dateType
      if (['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(form.value.dateType) && !form.value.startDate) {
        errors.push('Выберите дату начала');
      }
      if (form.value.dateType === 'CUSTOM_PERIOD' && !form.value.endDate) {
        errors.push('Выберите дату окончания');
      }
      if (form.value.dateType === 'CUSTOM_DATES_SINGLE' && form.value.customDates.length === 0) {
        errors.push('Выберите хотя бы одну дату');
      }
      
      return errors.length === 0;
    });

    const validationErrors = computed(() => {
      const errors: Record<string, string> = {};
      
      if (!form.value.supplyId) errors.supplyId = 'Выберите поставку';
      if (!form.value.warehouseId) errors.warehouseId = 'Склад обязателен';
      if (!form.value.supplyType) errors.supplyType = 'Тип поставки обязателен';
      if (!form.value.dateType) errors.dateType = 'Выберите тип периода';
      
      return errors;
    });

    // Validate form
    function validateForm(): boolean {
      formErrors.value = validationErrors.value;
      return validate.value;
    }

    // Update form field
    function updateField<K extends keyof RescheduleFormData>(
      field: K,
      value: RescheduleFormData[K],
    ) {
      form.value[field] = value;
      formErrors.value = validationErrors.value;
    }

    // Reset form
    function resetForm() {
      form.value = {
        warehouseId: null,
        dateType: 'CUSTOM_DATES_SINGLE',
        startDate: null,
        endDate: null,
        customDates: [],
        maxCoefficient: 0,
        supplyType: 'BOX',
        supplyId: null,
        currentDate: null,
      };
      formErrors.value = {};

      // Reset UI state
      selectedSupplyId.value = undefined;
      selectedDateType.value = '';
      startDateInput.value = '';
      endDateInput.value = '';
      customDates.value = [];
      maxCoefficientInput.value = 0;
    }

    // Convert form data to API format
    function toApiFormat(): CreateAutobookingRescheduleRequest {
      return {
        warehouseId: form.value.warehouseId!,
        dateType: form.value.dateType,
        startDate: form.value.startDate || undefined,
        endDate: form.value.endDate || undefined,
        customDates: form.value.customDates,
        maxCoefficient: form.value.maxCoefficient,
        supplyType: form.value.supplyType,
        supplyId: form.value.supplyId as string,
        currentDate: form.value.currentDate as string,
      };
    }

    // Computed properties
    const formState = computed(() => ({
      supplyId: String(selectedSupplyId.value) || null,
      warehouseId: form.value.warehouseId,
      supplyType: form.value.supplyType,
      dateType: selectedDateType.value,
      startDate: startDateInput.value || null,
      endDate: endDateInput.value || null,
      customDates: customDates.value,
      maxCoefficient: maxCoefficientInput.value,
    }));

    const supplyOptions = computed(() => {
      return rescheduleStore.availableSupplies.map((supply: Supply) => ({
        ...supply,
        displayName: `${supply.supplyId} - ${supply.warehouseName} (${supply.statusName})`,
      }));
    });

    const selectedSupply = computed(() => {
      if (!selectedSupplyId.value) return null;
      return (
        rescheduleStore.availableSupplies.find(
          (supply: Supply) => supply.supplyId === selectedSupplyId.value,
        ) || null
      );
    });

    // Initialize form
    async function initialize() {
      resetForm();
      selectedDateType.value = 'WEEK';
      updateField('dateType', 'WEEK');
    }

    // Handle supply change
    function handleSupplyChange(value: number | undefined) {
      selectedSupplyId.value = value;
      updateField('supplyId', String(value) || null);

      // Auto-fill warehouse and supply type from selected supply
      if (value && selectedSupply.value) {
        const supply = selectedSupply.value;
        updateField('warehouseId', supply.warehouseId);
        updateField('supplyType', mapBoxTypeToSupplyType(supply.boxTypeName || ''));

        // Auto-populate currentDate from supply date
        if (supply.supplyDate) {
          let currentDate: string;
          if (typeof supply.supplyDate === 'string') {
            // If it's already a date string (YYYY-MM-DD format), use it directly
            if (supply.supplyDate.includes('T')) {
              // Full datetime string - extract date part
              currentDate = supply.supplyDate.split('T')[0];
            } else {
              // Date-only string
              currentDate = supply.supplyDate;
            }
          } else {
            // Date object - convert to UTC date string
            const date = new Date(supply.supplyDate);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            currentDate = `${year}-${month}-${day}`;
          }
          updateField('currentDate', currentDate);
        }
      } else {
        // Clear auto-filled values when no supply selected
        updateField('warehouseId', null);
        updateField('supplyType', '');
        updateField('currentDate', null);
      }
    }

    // Handle date type changes
    function handleDateTypeChange(value: string) {
      selectedDateType.value = value;
      updateField('dateType', value);
      // Clear date fields when type changes
      startDateInput.value = '';
      endDateInput.value = '';
      customDates.value = [];
      updateField('startDate', null);
      updateField('endDate', null);
      updateField('customDates', []);
    }

    // Handle date input changes
    function handleStartDateChange(value: string) {
      startDateInput.value = value;
      updateField('startDate', value || null);
    }

    function handleEndDateChange(value: string) {
      endDateInput.value = value;
      updateField('endDate', value || null);
    }

    function formatDateToYYYYMMDD(date: Date): string {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function handleCustomDatesChange(value: (string | Date)[]) {
      customDates.value = value;
      // Convert Date objects to strings for form store
      // Use local date components to avoid timezone issues
      const stringDates = value.map((date) =>
        date instanceof Date ? formatDateToYYYYMMDD(date) : date,
      );
      updateField('customDates', stringDates);
    }

    function handleMaxCoefficientChange(value: number) {
      maxCoefficientInput.value = value;
      updateField('maxCoefficient', value);
    }

    // Helper functions
    function mapBoxTypeToSupplyType(boxTypeName: string): string {
      const normalized = boxTypeName?.toUpperCase() || '';
      if (normalized.includes('КОРОБ') || normalized.includes('BOX')) {
        return 'BOX';
      }
      if (
        normalized.includes('МОНОПАЛЛЕТ') ||
        normalized.includes('MONOPALLETE')
      ) {
        return 'MONOPALLETE';
      }
      if (
        normalized.includes('СУПЕРСЕЙФ') ||
        normalized.includes('SUPERSAFE')
      ) {
        return 'SUPERSAFE';
      }
      return 'BOX'; // Default fallback
    }

    // Submit form
    async function submit() {
      if (validateForm()) {
        try {
          isSubmitting.value = true;
          const apiData = toApiFormat();
          await rescheduleStore.createReschedule(apiData);
          return true;
        } catch (error) {
          console.error('Failed to create reschedule:', error);
          return false;
        } finally {
          isSubmitting.value = false;
        }
      }
      return false;
    }

    // Refresh supplies
    async function refreshSupplies() {
      try {
        await rescheduleStore.fetchSupplies(
          userStore.selectedAccount?.selectedSupplierId,
        );
      } catch (error) {
        console.error('Failed to refresh supplies:', error);
      }
    }

    return {
      // State
      form: readonly(form),
      formErrors: readonly(formErrors),
      isSubmitting: readonly(isSubmitting),
      showHintsModal,
      selectedSupplyId,
      selectedDateType,
      startDateInput,
      endDateInput,
      customDates,
      maxCoefficientInput,

      // Computed
      formState,
      supplyOptions,
      selectedSupply,
      validate,
      validationErrors,

      // Actions
      initialize,
      validateForm,
      updateField,
      resetForm,
      toApiFormat,
      handleSupplyChange,
      handleDateTypeChange,
      handleStartDateChange,
      handleEndDateChange,
      handleCustomDatesChange,
      handleMaxCoefficientChange,
      submit,
      refreshSupplies,
    };
  },
);
