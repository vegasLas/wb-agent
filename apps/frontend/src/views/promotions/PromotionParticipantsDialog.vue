<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :style="{ width: '95vw', maxWidth: '1400px' }"
    :modal="true"
  >
    <template #header>
      <span class="text-base md:text-lg font-semibold">{{ dialogHeader }}</span>
    </template>
    <div class="max-h-[70vh] overflow-auto">
      <!-- Loading State -->
      <div
        v-if="goodsLoading"
        class="flex flex-col items-center justify-center py-16"
      >
        <i class="pi pi-refresh animate-spin text-4xl text-orange-500 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Загрузка данных...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="goodsError" class="text-center py-12 px-4">
        <div
          class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <i class="pi pi-exclamation-circle text-red-500 text-3xl mb-2" />
          <p class="text-red-600 dark:text-red-400">
            {{ goodsError }}
          </p>
          <Button
            v-if="reportPending"
            class="mt-4"
            severity="primary"
            @click="retryFetch"
          >
            <i class="pi pi-refresh mr-2" />
            Попробовать снова
          </Button>
        </div>
      </div>

      <!-- Data Content -->
      <div v-else-if="goodsItems.length > 0">
        <!-- Cannot Edit Warning -->
        <div
          v-if="!canEdit"
          class="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        >
          <div
            class="flex items-center gap-2 text-amber-700 dark:text-amber-400"
          >
            <i class="pi pi-lock text-lg" />
            <span class="font-medium">Редактирование недоступно</span>
          </div>
          <p class="text-sm text-amber-600 dark:text-amber-300 mt-1">
            Акция уже началась. Восстановление и исключение товаров доступно
            только до начала акции.
          </p>
        </div>

        <!-- Mode Switch Buttons -->
        <div v-if="canEdit" class="mb-4 flex gap-2">
          <Button
            :disabled="props.timelineParticipatingCount === 0"
            :severity="isRecovery ? 'primary' : 'secondary'"
            size="small"
            @click="emit('switch-mode', true)"
          >
            Участвуют
            <Badge
              :value="props.timelineParticipatingCount"
              class="ml-2"
              :severity="isRecovery ? 'contrast' : 'secondary'"
            />
          </Button>
          <Button
            :disabled="props.timelineNotParticipatingCount === 0"
            :severity="!isRecovery ? 'primary' : 'secondary'"
            size="small"
            @click="emit('switch-mode', false)"
          >
            Не участвуют
            <Badge
              :value="props.timelineNotParticipatingCount"
              class="ml-2"
              :severity="!isRecovery ? 'contrast' : 'secondary'"
            />
          </Button>
        </div>

        <!-- Summary and Column Selector -->
        <PromotionParticipantsSummary
          v-model="selectedColumns"
          :can-edit="canEdit"
          :is-recovery="isRecovery"
          :total-count="goodsItems.length"
          :participating-count="participatingCount"
          :not-participating-count="notParticipatingCount"
          :available-columns="availableColumns"
        />

        <!-- Participants Table -->
        <PromotionParticipantsTable
          v-model="selectedItems"
          :goods-items="goodsItems"
          :can-edit="canEdit"
          :visible-fields="selectedColumns"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 text-gray-500 dark:text-gray-400">
        <i class="pi pi-inbox text-4xl mb-4" />
        <p>Нет данных для отображения</p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <span
            v-if="canEdit && selectedItems.length > 0"
            class="text-sm text-gray-600 dark:text-gray-400"
          >
            Выбрано: {{ selectedItems.length }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button
            label="Закрыть"
            severity="secondary"
            @click="visible = false"
          />
          <Button
            v-if="canEdit && selectedItems.length > 0"
            :label="isRecovery ? 'Исключить' : 'Восстановить'"
            :severity="isRecovery ? 'danger' : 'success'"
            :icon="isRecovery ? 'pi pi-times' : 'pi pi-check'"
            :loading="applying"
            @click="handleApply"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { useLocalStorage } from '@vueuse/core';
import { usePromotionsStore } from '@/stores/promotions';
import PromotionParticipantsSummary from '@/components/promotions/PromotionParticipantsSummary.vue';
import PromotionParticipantsTable from '@/components/promotions/PromotionParticipantsTable.vue';
import type { PromotionGoodsItem } from '../../types';

const promotionsStore = usePromotionsStore();

interface ColumnConfig {
  field: string;
  header: string;
  defaultVisible: boolean;
}

const availableColumns: ColumnConfig[] = [
  { field: 'vendorCode', header: 'Артикул', defaultVisible: true },
  { field: 'name', header: 'Наименование', defaultVisible: true },
  { field: 'brand', header: 'Бренд', defaultVisible: false },
  { field: 'subject', header: 'Предмет', defaultVisible: false },
  { field: 'nmId', header: 'ID товара', defaultVisible: false },
  { field: 'currentPrice', header: 'Тек. цена', defaultVisible: true },
  { field: 'promoPrice', header: 'Цена в акции', defaultVisible: true },
  { field: 'currentDiscount', header: 'Тек. скидка', defaultVisible: true },
  { field: 'uploadedDiscount', header: 'Загр. скидка', defaultVisible: true },
  { field: 'inPromo', header: 'В акции', defaultVisible: true },
  { field: 'wbStock', header: 'Остаток WB', defaultVisible: true },
];

interface Props {
  show: boolean;
  promotionName?: string;
  goodsItems: PromotionGoodsItem[];
  goodsLoading: boolean;
  goodsError: string | null;
  reportPending: boolean;
  isRecovery: boolean;
  canEdit: boolean;
  timelineParticipatingCount: number;
  timelineNotParticipatingCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  retry: [];
  'apply-management': [selectedItems: string[], isRecovery: boolean];
  'switch-mode': [isRecovery: boolean];
}>();

// Selected items for recovery/exclusion
const selectedItems = ref<PromotionGoodsItem[]>([]);
const applying = ref(false);

// Selected columns for display
const defaultColumns = availableColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.field);

const selectedColumns = useLocalStorage<string[]>(
  'promotions-selected-columns',
  [...defaultColumns],
);

// Reset to defaults if stored columns contain invalid fields
const validFields = availableColumns.map((col) => col.field);
if (selectedColumns.value.some((field) => !validFields.includes(field))) {
  selectedColumns.value = [...defaultColumns];
}

// Dialog visibility
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
  },
});

// Dialog header
const dialogHeader = computed(() => {
  const modeLabel = props.canEdit
    ? props.isRecovery
      ? 'Исключение'
      : 'Восстановление'
    : 'Просмотр';
  return props.promotionName
    ? `${modeLabel}: ${props.promotionName}`
    : `${modeLabel} участников`;
});

// Count participating items
const participatingCount = computed(() => {
  return props.goodsItems.filter((item) => item.inPromo === 'Да').length;
});

const notParticipatingCount = computed(() => {
  return props.goodsItems.filter((item) => item.inPromo !== 'Да').length;
});

// Retry fetch
function retryFetch() {
  emit('retry');
}

// Handle apply recovery/exclusion
async function handleApply() {
  if (selectedItems.value.length === 0) return;

  applying.value = true;
  try {
    const articleIds = selectedItems.value.map((item) => item.vendorCode);
    emit('apply-management', articleIds, props.isRecovery);
  } finally {
    applying.value = false;
  }
}

// Clean up data when dialog closes
watch(
  () => props.show,
  (newVal, oldVal) => {
    if (oldVal && !newVal) {
      selectedItems.value = [];
      applying.value = false;
      promotionsStore.clearExcelData();
    }
  },
);
</script>
