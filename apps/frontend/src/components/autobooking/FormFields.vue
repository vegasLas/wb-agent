<template>
  <div class="space-y-4">
    <AutobookingWarehouseSelection
      :model-value="props.form.warehouseId"
      :transit-warehouse-id="props.form.transitWarehouseId"
      :use-transit="props.useTransit"
      :warehouse-options="warehouseOptions"
      :transit-options="warehouseStore.transitOptions"
      :loading="warehouseStore.loading"
      :account-id="userStore.selectedAccount?.id"
      @update:model-value="updateField('warehouseId', $event)"
      @update:transit-warehouse-id="updateField('transitWarehouseId', $event)"
      @update:use-transit="emit('update:useTransit', $event)"
      @warehouse-change="handleWarehouseChange"
    />

    <AutobookingDraftSelection
      :model-value="props.form.draftId"
      :options="draftStore.draftOptions"
      :loading="draftStore.loading"
      @update:model-value="updateField('draftId', $event)"
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
        :key="`supply-${availableSupplyTypes.length}-${props.form.supplyType}`"
        :model-value="props.form.supplyType"
        :options="availableSupplyTypes"
        option-label="label"
        option-value="value"
        placeholder="Выберите тип поставки"
        :disabled="!canSelectSupplyType"
        :loading="props.validationLoading"
        class="w-full"
        @update:model-value="updateField('supplyType', $event)"
      />
    </div>

    <!-- Validation Failure Alert -->
    <Message
      v-if="showValidationFailureAlert"
      severity="error"
      class="w-full"
    >
      <div class="space-y-2 text-sm">
        <p class="font-medium">
          Ошибка валидации склада и черновика
        </p>
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
      :date-type="props.form.dateType"
      :start-date="props.form.startDate"
      :end-date="props.form.endDate"
      :custom-dates="props.form.customDates"
      mode="autobooking"
      @update:date-type="updateField('dateType', $event)"
      @update:start-date="updateField('startDate', $event)"
      @update:end-date="updateField('endDate', $event)"
      @update:custom-dates="handleCustomDatesChange"
    />

    <DateSelectionAlerts
      :date-type="props.form.dateType"
      :custom-dates="props.form.customDates"
      :used-slots="usedSlots"
      :max-slots="maxSlots"
    />

    <!-- Monopallet Count (only for MONOPALLETE supply type) -->
    <div
      v-if="props.form.supplyType === 'MONOPALLETE'"
      class="space-y-2"
    >
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Количество монопаллет
        <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <InputNumber
        :model-value="props.form.monopalletCount"
        type="number"
        placeholder="Введите количество монопаллет"
        class="w-full"
        @update:model-value="updateField('monopalletCount', $event)"
      />
    </div>

    <!-- Coefficient -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Максимальный коэффициент
        <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <div class="flex items-center gap-4 px-4 pb-2">
        <Slider
          :model-value="props.form.maxCoefficient"
          :min="0"
          :max="20"
          class="flex-1"
          @update:model-value="updateField('maxCoefficient', $event)"
        />
        <div class="min-w-[4rem] text-center">
          <Tag
            :value="String(props.form.maxCoefficient)"
            severity="secondary"
          />
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
        :warehouse-id="props.form.warehouseId"
        :supply-type="props.form.supplyType"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { SUPPLY_TYPES } from '../../constants';
import { useDraftStore } from '@/stores/drafts';
import { useUserStore } from '@/stores/user';
import { useAutobookingUpdateStore, useAutobookingListStore } from '@/stores/autobooking';
import { useWarehousesStore } from '@/stores/warehouses';
import { AUTOBOOKING_SLOTS } from '@/constants';
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
  supplierId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'warehouse-change': [warehouseId: number];
  'validate-warehouse': [];
  'update:form': [form: FormData];
  'update:useTransit': [useTransit: boolean];
}>();

// Use stores directly
const draftStore = useDraftStore();
const userStore = useUserStore();
const updateStore = useAutobookingUpdateStore();
const warehouseStore = useWarehousesStore();
const listStore = useAutobookingListStore();

// Slot info for date selection alerts
const usedSlots = computed(() => listStore.usedSlots);
const maxSlots = computed(() => AUTOBOOKING_SLOTS[userStore.subscriptionTier as 'FREE' | 'LITE' | 'PRO' | 'MAX'] || 1);

// Track previous values for change detection
const prevWarehouseId = ref<number | null>(props.form.warehouseId);
const prevDraftId = ref<string>(props.form.draftId);
const prevTransitWarehouseId = ref<number | null>(
  props.form.transitWarehouseId,
);

// Slot-based model: server-side enforces the limit. Client-side just shows info.

// Emit individual field update - avoids circular updates
function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
  // Only emit if value actually changed
  if (props.form[field] === value) {
    return;
  }
  emit('update:form', { ...props.form, [field]: value });
}

// Emit full form update for complex changes
function updateForm(updates: Partial<FormData>) {
  // Only include changed values
  const changedUpdates: Partial<FormData> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (props.form[key as keyof FormData] !== value) {
      (changedUpdates as Record<string, unknown>)[key] = value;
    }
  }
  // Only emit if there are actual changes
  if (Object.keys(changedUpdates).length === 0) {
    return;
  }
  emit('update:form', { ...props.form, ...changedUpdates });
}

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
  Boolean(props.form.warehouseId && props.form.draftId),
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
    props.form.warehouseId &&
      props.form.draftId &&
      !props.validationLoading &&
      props.validationResult?.result &&
      (!props.validationResult.result.metaInfo ||
        availableSupplyTypes.value.length === 0),
  );
});

function handleWarehouseChange(warehouseId: number) {
  emit('warehouse-change', warehouseId);
}

// Watch for changes in warehouse or draft selection - validate and reset supply type
watch(
  () =>
    [
      props.form.warehouseId,
      props.form.draftId,
      props.form.transitWarehouseId,
    ] as const,
  async (
    [newWarehouseId, newDraftId, newTransitWarehouseId],
    [oldWarehouseId, oldDraftId, oldTransitWarehouseId],
  ) => {
    // Skip if values haven't actually changed (prevents recursion)
    if (
      newWarehouseId === oldWarehouseId &&
      newDraftId === oldDraftId &&
      newTransitWarehouseId === oldTransitWarehouseId
    ) {
      return;
    }

    // Reset supply type when warehouse or draft changes
    if (
      newWarehouseId !== prevWarehouseId.value ||
      newDraftId !== prevDraftId.value
    ) {
      // Only reset if supplyType is not already empty
      if (props.form.supplyType !== '') {
        updateField('supplyType', '');
      }
    }

    // Only validate if both values are present and either has changed
    if (
      newWarehouseId &&
      newDraftId &&
      (newWarehouseId !== prevWarehouseId.value ||
        newDraftId !== prevDraftId.value ||
        newTransitWarehouseId !== prevTransitWarehouseId.value)
    ) {
      // Update previous values before emitting
      prevWarehouseId.value = newWarehouseId;
      prevDraftId.value = newDraftId;
      prevTransitWarehouseId.value = newTransitWarehouseId;
      emit('validate-warehouse');
    } else {
      // Just update previous values
      prevWarehouseId.value = newWarehouseId;
      prevDraftId.value = newDraftId;
      prevTransitWarehouseId.value = newTransitWarehouseId;
    }
  },
  { immediate: false },
);

// Watch for dateType changes to clean related fields
watch(
  () => props.form.dateType,
  (newDateType, oldDateType) => {
    if (newDateType !== oldDateType) {
      updateForm({
        startDate: '',
        endDate: '',
        customDates: [],
      });
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
      updateField('maxCoefficient', newSuggestedCoefficient);
    }
  },
  { immediate: true },
);

// Watch for supply type changes to reset monopallet count when not MONOPALLETE
watch(
  () => props.form.supplyType,
  (newSupplyType) => {
    if (newSupplyType !== 'MONOPALLETE') {
      updateField('monopalletCount', null);
    }
  },
);

// Watch for useTransit changes to fetch transits when enabled
watch(
  () => props.useTransit,
  async (newValue) => {
    if (newValue && props.form.warehouseId) {
      await warehouseStore.fetchTransits(props.form.warehouseId);
    } else {
      updateField('transitWarehouseId', null);
    }
  },
);

// Handle custom dates changes with validation
function handleCustomDatesChange(newDates: (string | Date)[]) {
  const requiredCount =
    props.form.dateType === 'CUSTOM_DATES_SINGLE' ? 1 : newDates.length;

  // Slot limits are enforced both client-side (canSubmit) and server-side.

  // Update the dates
  updateField('customDates', newDates);
}
</script>
