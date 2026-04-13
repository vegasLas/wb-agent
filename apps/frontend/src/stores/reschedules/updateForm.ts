import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useRescheduleStore } from './store';
import { useWarehousesStore } from '../warehouses';

export interface RescheduleUpdateFormData {
  selectedDateType: string;
  startDateInput: string | Date;
  endDateInput: string | Date;
  customDates: (string | Date)[];
  maxCoefficientInput: number;
}

export interface OriginalRescheduleData {
  dateType: string;
  startDate: string;
  endDate: string;
  customDates: string[];
  maxCoefficient: number;
}

/**
 * Helper function to format Date to YYYY-MM-DD using local date components
 * Avoids timezone issues caused by toISOString() UTC conversion
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useRescheduleUpdateFormStore = defineStore(
  'rescheduleUpdateForm',
  () => {
    const rescheduleStore = useRescheduleStore();
    const warehouseStore = useWarehousesStore();

    // Form state
    const formData = ref<RescheduleUpdateFormData>({
      selectedDateType: '',
      startDateInput: '',
      endDateInput: '',
      customDates: [],
      maxCoefficientInput: 0,
    });

    // Get the selected reschedule from the reschedule store
    const reschedule = computed(() => {
      return rescheduleStore.selectedReschedule;
    });

    // Track original reschedule data for change detection
    const originalData = computed((): OriginalRescheduleData | null => {
      if (!reschedule.value) return null;
      return {
        dateType: reschedule.value.dateType,
        startDate: reschedule.value.startDate
          ? typeof reschedule.value.startDate === 'string'
            ? reschedule.value.startDate.split('T')[0]
            : formatDateToYYYYMMDD(reschedule.value.startDate)
          : '',
        endDate: reschedule.value.endDate
          ? typeof reschedule.value.endDate === 'string'
            ? reschedule.value.endDate.split('T')[0]
            : formatDateToYYYYMMDD(reschedule.value.endDate)
          : '',
        customDates: [...(reschedule.value.customDates || [])].map((date) =>
          typeof date === 'string'
            ? date.split('T')[0]
            : formatDateToYYYYMMDD(date),
        ),
        maxCoefficient: reschedule.value.maxCoefficient,
      };
    });

    // Form data for validation
    const validationFormData = computed(() => ({
      dateType: formData.value.selectedDateType,
      startDate:
        typeof formData.value.startDateInput === 'string'
          ? formData.value.startDateInput
          : formData.value.startDateInput
            ? formatDateToYYYYMMDD(formData.value.startDateInput)
            : '',
      endDate:
        typeof formData.value.endDateInput === 'string'
          ? formData.value.endDateInput
          : formData.value.endDateInput
            ? formatDateToYYYYMMDD(formData.value.endDateInput)
            : '',
      customDates: formData.value.customDates.map((date) =>
        typeof date === 'string' ? date : formatDateToYYYYMMDD(date),
      ),
      maxCoefficient: formData.value.maxCoefficientInput,
    }));

    // Supply information data
    const selectedSupply = computed(() => {
      if (!reschedule.value) return null;
      return {
        warehouseName: `Склад ID: ${reschedule.value.warehouseId}`,
        boxTypeName: reschedule.value.supplyType,
        supplyDate: reschedule.value.createdAt,
      };
    });

    // Detect if form has changes compared to original data
    const hasChanges = computed(() => {
      if (!originalData.value) return false;

      const current = {
        dateType: formData.value.selectedDateType,
        startDate:
          typeof formData.value.startDateInput === 'string'
            ? formData.value.startDateInput
            : formData.value.startDateInput
              ? formatDateToYYYYMMDD(formData.value.startDateInput)
              : '',
        endDate:
          typeof formData.value.endDateInput === 'string'
            ? formData.value.endDateInput
            : formData.value.endDateInput
              ? formatDateToYYYYMMDD(formData.value.endDateInput)
              : '',
        customDates: formData.value.customDates
          .map((date) =>
            typeof date === 'string' ? date : formatDateToYYYYMMDD(date),
          )
          .sort(),
        maxCoefficient: formData.value.maxCoefficientInput,
      };

      // Field-by-field comparison
      if (current.dateType !== originalData.value.dateType) return true;
      if (current.startDate !== originalData.value.startDate) return true;
      if (current.endDate !== originalData.value.endDate) return true;
      if (current.maxCoefficient !== originalData.value.maxCoefficient)
        return true;

      // Compare arrays
      const originalSorted = [...originalData.value.customDates].sort();
      if (current.customDates.length !== originalSorted.length) return true;
      const customDatesChanged = current.customDates.some(
        (date, index) => date !== originalSorted[index],
      );
      if (customDatesChanged) return true;

      return false;
    });

    const isFormValid = computed(() => {
      // Simple validation
      if (!formData.value.selectedDateType) return false;

      const dateType = formData.value.selectedDateType;
      if (['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(dateType)) {
        if (!formData.value.startDateInput) return false;
      }
      if (dateType === 'CUSTOM_PERIOD') {
        if (!formData.value.endDateInput) return false;
      }
      if (dateType === 'CUSTOM_DATES_SINGLE') {
        if (formData.value.customDates.length === 0) return false;
      }

      const coef = formData.value.maxCoefficientInput;
      if (coef < 0 || coef > 20) return false;

      return true;
    });

    // Detect and return only the fields that have changed
    function getChangedFields() {
      if (!originalData.value) return {};

      const current = {
        dateType: formData.value.selectedDateType,
        startDate:
          typeof formData.value.startDateInput === 'string'
            ? formData.value.startDateInput
            : formData.value.startDateInput
              ? formatDateToYYYYMMDD(formData.value.startDateInput)
              : '',
        endDate:
          typeof formData.value.endDateInput === 'string'
            ? formData.value.endDateInput
            : formData.value.endDateInput
              ? formatDateToYYYYMMDD(formData.value.endDateInput)
              : '',
        customDates: formData.value.customDates.map((date) =>
          typeof date === 'string' ? date : formatDateToYYYYMMDD(date),
        ),
        maxCoefficient: formData.value.maxCoefficientInput,
      };

      const changes: Record<string, unknown> = {};

      // Compare each field and only include if changed
      if (current.dateType !== originalData.value.dateType) {
        changes.dateType = current.dateType;
      }

      // Only include startDate if it's relevant for the date type and changed
      if (
        ['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(current.dateType) &&
        current.startDate !== originalData.value.startDate
      ) {
        changes.startDate = current.startDate || undefined;
      }

      // Only include endDate if it's CUSTOM_PERIOD and changed
      if (
        current.dateType === 'CUSTOM_PERIOD' &&
        current.endDate !== originalData.value.endDate
      ) {
        changes.endDate = current.endDate || undefined;
      }

      // Only include customDates if it's a custom date type and changed
      if (['CUSTOM_DATES', 'CUSTOM_DATES_SINGLE'].includes(current.dateType)) {
        const currentSorted = [...current.customDates].sort();
        const originalSorted = [...originalData.value.customDates].sort();

        if (
          currentSorted.length !== originalSorted.length ||
          currentSorted.some((date, index) => date !== originalSorted[index])
        ) {
          changes.customDates = current.customDates;
        }
      }

      if (current.maxCoefficient !== originalData.value.maxCoefficient) {
        changes.maxCoefficient = current.maxCoefficient;
      }

      return changes;
    }

    // Actions
    function initialize() {
      if (reschedule.value) {
        formData.value.maxCoefficientInput = reschedule.value.maxCoefficient;

        // Populate date fields with UTC format conversion
        formData.value.selectedDateType = reschedule.value.dateType;
        if (reschedule.value.startDate) {
          formData.value.startDateInput =
            typeof reschedule.value.startDate === 'string'
              ? reschedule.value.startDate.split('T')[0]
              : formatDateToYYYYMMDD(reschedule.value.startDate);
        }
        if (reschedule.value.endDate) {
          formData.value.endDateInput =
            typeof reschedule.value.endDate === 'string'
              ? reschedule.value.endDate.split('T')[0]
              : formatDateToYYYYMMDD(reschedule.value.endDate);
        }
        if (
          reschedule.value.customDates &&
          reschedule.value.customDates.length > 0
        ) {
          formData.value.customDates = reschedule.value.customDates.map(
            (date) =>
              typeof date === 'string'
                ? date.split('T')[0]
                : formatDateToYYYYMMDD(date),
          );
        }
      }
    }

    async function submit() {
      if (reschedule.value && isFormValid.value && hasChanges.value) {
        const changedFields = getChangedFields();

        // Only include ID (required for identification) and changed fields
        const updateData = {
          id: reschedule.value.id,
          ...changedFields,
        };

        await rescheduleStore.updateReschedule(updateData);
      }
    }

    // Helper functions
    function formatDate(date: Date | string) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'UTC',
      });
    }

    function getWarehouseName(warehouseId: number): string {
      return warehouseStore.getWarehouseName(warehouseId);
    }

    function getSupplyTypeText(supplyType: string): string {
      switch (supplyType) {
        case 'BOX':
          return 'Короба';
        case 'MONOPALLETE':
          return 'Монопаллеты';
        case 'SUPERSAFE':
          return 'Суперсейф';
        default:
          return supplyType;
      }
    }

    return {
      // State
      formData,

      // Computed
      reschedule,
      originalData,
      validationFormData,
      selectedSupply,
      hasChanges,
      isFormValid,

      // Actions
      initialize,
      submit,
      getChangedFields,
      formatDate,
      getWarehouseName,
      getSupplyTypeText,
    };
  },
);
