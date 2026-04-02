<template>
  <div class="space-y-4">
    <AutobookingWarehouseSelection
      v-model="localForm.warehouseId"
      v-model:transit-warehouse-id="localForm.transitWarehouseId"
      v-model:use-transit="localUseTransit"
      :warehouse-options="warehouseOptions"
      :transit-options="warehouseStore.transitOptions"
      :loading="warehouseStore.loading"
      :account-id="userStore.selectedAccount?.id"
      @warehouse-change="handleWarehouseChange"
    />

    <AutobookingDraftSelection
      v-model="localForm.draftId"
      :options="draftStore.draftOptions"
      :loading="draftStore.loading"
      @view-goods="
        (draftId) => draftStore.showDraftGoods(draftId, props.supplierId)
      "
    />

    <!-- Supply Type Selection -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Тип поставки <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <Select
        :key="`supply-${availableSupplyTypes.length}-${localForm.supplyType}`"
        v-model="localForm.supplyType"
        :options="availableSupplyTypes"
        option-label="label"
        option-value="value"
        placeholder="Выберите тип поставки"
        :disabled="!canSelectSupplyType"
        :loading="props.validationLoading"
        class="w-full"
      />
    </div>

    <!-- Validation Failure Alert -->
    <Message v-if="showValidationFailureAlert" severity="error" class="w-full">
      <div class="space-y-2 text-sm">
        <p class="font-medium">Ошибка валидации склада и черновика</p>
        <p>
          К сожалению, выбранный склад не принимает товары из этого черновика.
          Это может быть связано с:
        </p>
        <ul class="ml-4 space-y-1">
          <li>• Ограничениями склада на определенные категории товаров</li>
          <li>• Изменениями в правилах приемки ВБ</li>
          <li>• Проблемами с товарами в черновике</li>
        </ul>
        <p class="font-medium">
          <strong>Рекомендация:</strong> Создайте новый черновик с актуальными
          товарами или выберите другой склад.
        </p>
      </div>
    </Message>

    <DateSelection
      v-model:date-type="localForm.dateType"
      v-model:start-date="localForm.startDate"
      v-model:end-date="localForm.endDate"
      v-model:custom-dates="localForm.customDates"
      mode="autobooking"
      @update:custom-dates="handleCustomDatesChange"
    />

    <DateSelectionAlerts
      :date-type="localForm.dateType"
      :custom-dates="localForm.customDates"
      :available-count="userStore.user.autobookingCount"
      :is-update-mode="isUpdateMode"
      :remaining-count="remainingCount"
    />

    <!-- Monopallet Count (only for MONOPALLETE supply type) -->
    <div v-if="localForm.supplyType === 'MONOPALLETE'" class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Количество монопаллет
        <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <InputNumber
        v-model="localForm.monopalletCount"
        type="number"
        placeholder="Введите количество монопаллет"
        class="w-full"
      />
    </div>

    <!-- Coefficient -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Максимальный коэффициент
        <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <div class="flex items-center gap-4">
        <Slider
          v-model="localForm.maxCoefficient"
          :min="0"
          :max="20"
          class="flex-1"
        />
        <div class="min-w-[4rem] text-center">
          <Tag :value="String(localForm.maxCoefficient)" severity="secondary" />
        </div>
      </div>
      <div
        v-if="suggestedCoefficient !== null"
        class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-200"
      >
        Рекомендуемый коэффициент:
        <Tag
          :value="String(suggestedCoefficient)"
          severity="warn"
          class="text-xs"
        />
      </div>

      <!-- Coefficient History -->
      <CoefficientHistoryAlert
        :warehouse-id="localForm.warehouseId"
        :supply-type="localForm.supplyType"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { SUPPLY_TYPES } from '../../constants';
import { useDraftStore } from '../../stores/draft';
import { useUserStore } from '../../stores/user';
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';
import { useWarehousesStore } from '../../stores/warehouses';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import DateSelection from '../common/DateSelection.vue';
import DateSelectionAlerts from '../common/DateSelectionAlerts.vue';
import AutobookingWarehouseSelection from './WarehouseSelection.vue';
import AutobookingDraftSelection from './DraftSelection.vue';
import CoefficientHistoryAlert from './CoefficientHistoryAlert.vue';
interface FormData {
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

interface ValidationResult {
  result: {
    metaInfo: {
      monoMixQuantity: number;
      palletQuantity: number;
      supersafeQuantity: number;
    };
    errors?: Array<{ message: string }>;
  };
}

interface Props {
  form: FormData;
  useTransit: boolean;
  schema?: object;
  warehouseOptions: Array<{ label: string; value: number }>;
  validationLoading?: boolean;
  validationResult?: ValidationResult | null;
  suggestedCoefficient?: number | null;
  accountId?: string;
}

const props = defineProps<Props>();

// Use the draft store directly
const draftStore = useDraftStore();
const userStore = useUserStore();
const updateStore = useAutobookingUpdateStore();
const warehouseStore = useWarehousesStore();

// Check if we're in update mode
const isUpdateMode = computed(() => !!updateStore.currentAutobooking);

// Calculate available autobooking count considering update mode
const availableCount = computed(() => {
  if (isUpdateMode.value) {
    return updateStore.remainingAutobookingCount;
  }
  return userStore.user.autobookingCount;
});

// Calculate remaining count after selecting dates
const remainingCount = computed(() => {
  if (isUpdateMode.value) {
    return updateStore.remainingAutobookingCount;
  } else {
    const requiredCount = localForm.value.customDates?.length || 0;
    return availableCount.value - requiredCount;
  }
});

const emit = defineEmits<{
  'warehouse-change': [warehouseId: number];
  'validate-warehouse': [];
  'update:form': [form: FormData];
  'update:useTransit': [useTransit: boolean];
}>();

// Create internal reactive refs that sync with props
const localForm = ref<FormData>({ ...props.form });
const localUseTransit = ref(props.useTransit);

// Flag to prevent recursive updates
const isUpdatingFromParent = ref(false);

// Sync local state with props when they change from parent
watch(
  () => props.form,
  (newForm) => {
    isUpdatingFromParent.value = true;
    localForm.value = { ...newForm };
    isUpdatingFromParent.value = false;
  },
  { deep: true, immediate: true },
);

watch(
  () => props.useTransit,
  (newUseTransit) => {
    isUpdatingFromParent.value = true;
    localUseTransit.value = newUseTransit;
    isUpdatingFromParent.value = false;
  },
  { immediate: true },
);

// Emit updates when local state changes (only if not updating from parent)
watch(
  localForm,
  (newForm) => {
    if (!isUpdatingFromParent.value) {
      emit('update:form', { ...newForm });
    }
  },
  { deep: true },
);

watch(localUseTransit, (newUseTransit) => {
  if (!isUpdatingFromParent.value) {
    emit('update:useTransit', newUseTransit);
  }
});

// Base supply type options
const supplyTypeOptions = [
  { label: 'Короба', value: SUPPLY_TYPES.BOX, metaKey: 'monoMixQuantity' },
  {
    label: 'Суперсейф',
    value: SUPPLY_TYPES.SUPERSAFE,
    metaKey: 'supersafeQuantity',
  },
  {
    label: 'Монопаллета',
    value: SUPPLY_TYPES.MONOPALLETE,
    metaKey: 'palletQuantity',
  },
];

// Computed property to check if supply type can be selected
const canSelectSupplyType = computed(() =>
  Boolean(localForm.value.warehouseId && localForm.value.draftId),
);

// Filter available supply types based on validation result
const availableSupplyTypes = computed(() => {
  if (!props.validationResult?.result?.metaInfo) {
    return [];
  }

  const metaInfo = props.validationResult.result.metaInfo;

  return supplyTypeOptions
    .filter(
      (option) => (metaInfo as Record<string, number>)[option.metaKey] > 0,
    )
    .map((o) => ({ label: o.label, value: o.value }));
});

// Computed property to show validation failure alert
const showValidationFailureAlert = computed(() => {
  return Boolean(
    localForm.value.warehouseId &&
      localForm.value.draftId &&
      !props.validationLoading &&
      props.validationResult?.result &&
      (!props.validationResult.result.metaInfo ||
        availableSupplyTypes.value.length === 0),
  );
});

function handleWarehouseChange(warehouseId: number) {
  emit('warehouse-change', warehouseId);
}

// Watch for changes in warehouse or draft selection
watch(
  [
    () => localForm.value.warehouseId,
    () => localForm.value.draftId,
    () => localForm.value.transitWarehouseId,
  ],
  async (
    [newWarehouseId, newDraftId, newTransitWarehouseId],
    [oldWarehouseId, oldDraftId, oldTransitWarehouseId],
  ) => {
    // Reset supply type when warehouse or draft changes
    if (newWarehouseId !== oldWarehouseId || newDraftId !== oldDraftId) {
      localForm.value.supplyType = '';
    }
    // Only validate if both values are present and either has changed
    if (
      newWarehouseId &&
      newDraftId &&
      (newWarehouseId !== oldWarehouseId ||
        newDraftId !== oldDraftId ||
        newTransitWarehouseId !== oldTransitWarehouseId)
    ) {
      emit('validate-warehouse');
    }
  },
);

// Watch for dateType changes to clean related fields
watch(
  () => localForm.value.dateType,
  (newDateType, oldDateType) => {
    if (newDateType !== oldDateType) {
      // Clear startDate and endDate when switching to custom dates
      localForm.value.startDate = '';
      localForm.value.endDate = '';
      // Clear customDates when switching away from custom dates
      localForm.value.customDates = [];

      // Clear endDate for WEEK and MONTH types
      localForm.value.endDate = '';
    }
  },
);

// Watch for suggested coefficient changes to auto-set maxCoefficient
watch(
  () => props.suggestedCoefficient,
  (newSuggestedCoefficient) => {
    if (
      newSuggestedCoefficient !== null &&
      newSuggestedCoefficient !== undefined
    ) {
      localForm.value.maxCoefficient = newSuggestedCoefficient;
    }
  },
  { immediate: true },
);

// Watch for supply type changes to reset monopallet count when not MONOPALLETE
watch(
  () => localForm.value.supplyType,
  (newSupplyType) => {
    if (newSupplyType !== 'MONOPALLETE') {
      localForm.value.monopalletCount = null;
    }
  },
);

// Watch for useTransit changes to fetch transits when enabled
watch(
  () => localUseTransit.value,
  async (newValue) => {
    if (newValue && localForm.value.warehouseId) {
      await warehouseStore.fetchTransits(localForm.value.warehouseId);
    } else {
      localForm.value.transitWarehouseId = null;
    }
  },
);

// Handle custom dates changes with validation
function handleCustomDatesChange(newDates: (string | Date)[]) {
  const requiredCount =
    localForm.value.dateType === 'CUSTOM_DATES_SINGLE' ? 1 : newDates.length;

  // In update mode, check against remaining count after adjustment
  const checkCount = isUpdateMode.value
    ? updateStore.remainingAutobookingCount -
      (requiredCount - (localForm.value.customDates?.length || 0))
    : availableCount.value;

  if (checkCount < 0) {
    alert(
      'Недостаточно кредитов. Выберите меньше дат или приобретите больше кредитов.',
    );
    return;
  }

  // Update the dates
  localForm.value.customDates = newDates;
}
</script>
