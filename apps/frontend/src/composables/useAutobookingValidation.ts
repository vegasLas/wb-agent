import { computed, ref, type Ref } from 'vue';
import type { FormState } from '../stores/autobookingForm';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface UseAutobookingValidationOptions {
  form: Ref<FormState>;
}

export function useAutobookingValidation({
  form,
}: UseAutobookingValidationOptions) {
  const errors = ref<string[]>([]);

  const validate = (): ValidationResult => {
    const newErrors: string[] = [];

    if (!form.value.warehouseId) {
      newErrors.push('Необходимо выбрать склад');
    }

    if (!form.value.draftId) {
      newErrors.push('Необходимо выбрать черновик');
    }

    if (!form.value.supplyType) {
      newErrors.push('Необходимо выбрать тип поставки');
    }

    if (!form.value.dateType) {
      newErrors.push('Необходимо выбрать тип даты');
    }

    // Validate dates based on dateType
    if (form.value.dateType === 'WEEK' || form.value.dateType === 'MONTH') {
      if (!form.value.startDate) {
        newErrors.push('Необходимо выбрать дату начала');
      }
    } else if (form.value.dateType === 'CUSTOM_PERIOD') {
      if (!form.value.startDate) {
        newErrors.push('Необходимо выбрать дату начала');
      }
      if (!form.value.endDate) {
        newErrors.push('Необходимо выбрать дату окончания');
      }
    } else if (
      form.value.dateType === 'CUSTOM_DATES' ||
      form.value.dateType === 'CUSTOM_DATES_SINGLE'
    ) {
      if (!form.value.customDates || form.value.customDates.length === 0) {
        newErrors.push('Необходимо выбрать хотя бы одну дату');
      }
    }

    // Check monopallet count for MONOPALLETE
    if (
      form.value.supplyType === 'MONOPALLETE' &&
      !form.value.monopalletCount
    ) {
      newErrors.push('Необходимо указать количество монопаллет');
    }

    errors.value = newErrors;

    return {
      isValid: newErrors.length === 0,
      errors: newErrors,
    };
  };

  const isValid = computed(() => {
    const {
      warehouseId,
      draftId,
      supplyType,
      dateType,
      startDate,
      endDate,
      customDates,
      monopalletCount,
    } = form.value;

    if (!warehouseId || !draftId || !supplyType || !dateType) {
      return false;
    }

    // Validate dates based on dateType
    if (dateType === 'WEEK' || dateType === 'MONTH') {
      if (!startDate) return false;
    } else if (dateType === 'CUSTOM_PERIOD') {
      if (!startDate || !endDate) return false;
    } else if (
      dateType === 'CUSTOM_DATES' ||
      dateType === 'CUSTOM_DATES_SINGLE'
    ) {
      if (!customDates || customDates.length === 0) return false;
    }

    // Check monopallet count for MONOPALLETE
    if (supplyType === 'MONOPALLETE' && !monopalletCount) {
      return false;
    }

    return true;
  });

  const clearErrors = () => {
    errors.value = [];
  };

  return {
    errors,
    isValid,
    validate,
    clearErrors,
  };
}
