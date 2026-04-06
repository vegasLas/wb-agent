<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :style="{ width: '95vw', maxWidth: '1400px' }"
    :modal="true"
    :maximizable="true"
  >
    <template #header>
      <span class="text-base md:text-lg font-semibold">{{ dialogHeader }}</span>
    </template>
    <div class="max-h-[70vh] overflow-auto">
      <!-- Loading State -->
      <div
        v-if="excelLoading"
        class="flex flex-col items-center justify-center py-16"
      >
        <i class="pi pi-refresh animate-spin text-4xl text-orange-500 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">
          Загрузка данных...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="excelError"
        class="text-center py-12 px-4"
      >
        <div
          class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <i class="pi pi-exclamation-circle text-red-500 text-3xl mb-2" />
          <p class="text-red-600 dark:text-red-400">
            {{ excelError }}
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

      <!-- Data Content (shown when data is available) -->
      <div v-else-if="excelItems.length > 0">
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

        <!-- Data Table -->
        <!-- Summary Info and Column Selector -->
        <div
          class="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap gap-6 text-sm">
              <div v-if="canEdit">
                <span class="text-gray-500 dark:text-gray-400">Режим:</span>
                <span
                  :class="[
                    'ml-1 font-medium',
                    isRecovery
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400',
                  ]"
                >
                  {{ isRecovery ? 'Восстановление' : 'Исключение' }}
                </span>
              </div>
              <div v-else>
                <span class="text-gray-500 dark:text-gray-400">Режим:</span>
                <span class="ml-1 font-medium text-gray-600 dark:text-gray-400">
                  Просмотр
                </span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Всего товаров:</span>
                <span
                  class="ml-1 font-medium text-gray-900 dark:text-gray-100"
                >{{ excelItems.length }}</span>
              </div>
              <div v-if="participatingCount > 0">
                <span class="text-gray-500 dark:text-gray-400">Участвует:</span>
                <span
                  class="ml-1 font-medium text-green-600 dark:text-green-400"
                >{{ participatingCount }}</span>
              </div>
              <div v-if="notParticipatingCount > 0">
                <span class="text-gray-500 dark:text-gray-400">Не участвует:</span>
                <span
                  class="ml-1 font-medium text-gray-600 dark:text-gray-400"
                >{{ notParticipatingCount }}</span>
              </div>
            </div>
            <div class="min-w-[200px]">
              <MultiSelect
                v-model="selectedColumns"
                :options="availableColumns"
                option-label="header"
                option-value="field"
                placeholder="Выберите колонки"
                class="w-full text-sm"
                display="chip"
                :max-selected-labels="3"
                :selected-items-label="'{0} колонок выбрано'"
              />
            </div>
          </div>
        </div>

        <!-- Participants Table -->
        <DataTable
          v-model:selection="selectedItems"
          :value="excelItems"
          size="small"
          class="p-datatable-sm"
          scrollable
          scroll-height="flex"
          :paginator="excelItems.length > 10"
          :rows="10"
          :rows-per-page-options="[10, 25, 50, 100]"
          striped-rows
          removable-sort
          :selection-mode="canEdit ? 'multiple' : undefined"
          data-key="Артикул поставщика"
        >
          <!-- Selection Checkbox -->
          <Column
            v-if="canEdit"
            selection-mode="multiple"
            header-style="width: 3rem"
          />

          <!-- Vendor Code -->
          <Column
            v-if="isColumnVisible('Артикул поставщика')"
            field="Артикул поставщика"
            header="Артикул"
            sortable
            style="min-width: 130px"
          >
            <template #body="slotProps">
              <span
                class="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {{ slotProps.data['Артикул поставщика'] }}
              </span>
            </template>
          </Column>

          <!-- Product Name -->
          <Column
            v-if="isColumnVisible('Наименование')"
            field="Наименование"
            header="Наименование"
            sortable
            style="min-width: 250px"
          >
            <template #body="slotProps">
              <span
                class="text-sm text-gray-900 dark:text-gray-100 line-clamp-2"
              >
                {{ slotProps.data['Наименование'] }}
              </span>
            </template>
          </Column>

          <!-- Brand -->
          <Column
            v-if="isColumnVisible('Бренд')"
            field="Бренд"
            header="Бренд"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ slotProps.data['Бренд'] }}
              </span>
            </template>
          </Column>

          <!-- Subject -->
          <Column
            v-if="isColumnVisible('Предмет')"
            field="Предмет"
            header="Предмет"
            sortable
            style="min-width: 120px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ slotProps.data['Предмет'] }}
              </span>
            </template>
          </Column>

          <!-- WB Article -->
          <Column
            v-if="isColumnVisible('Артикул WB')"
            field="Артикул WB"
            header="Арт. WB"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {{ slotProps.data['Артикул WB'] }}
              </span>
            </template>
          </Column>

          <!-- Current Price -->
          <Column
            v-if="isColumnVisible('Текущая розничная цена')"
            field="Текущая розничная цена"
            header="Тек. цена"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-900 dark:text-gray-100">
                {{ formatPrice(slotProps.data['Текущая розничная цена']) }}
              </span>
            </template>
          </Column>

          <!-- Promo Price -->
          <Column
            v-if="isColumnVisible('Плановая цена для акции')"
            field="Плановая цена для акции"
            header="Цена в акции"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span
                class="text-sm font-medium text-orange-600 dark:text-orange-400"
              >
                {{ formatPrice(slotProps.data['Плановая цена для акции']) }}
              </span>
            </template>
          </Column>

          <!-- Current Discount -->
          <Column
            v-if="isColumnVisible('Текущая скидка на сайте, %')"
            field="Текущая скидка на сайте, %"
            header="Тек. скидка"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ slotProps.data['Текущая скидка на сайте, %'] }}%
              </span>
            </template>
          </Column>

          <!-- Uploaded Discount -->
          <Column
            v-if="isColumnVisible('Загружаемая скидка для участия в акции')"
            field="Загружаемая скидка для участия в акции"
            header="Загр. скидка"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span
                class="text-sm font-medium"
                :class="getDiscountClass(slotProps.data)"
              >
                {{ slotProps.data['Загружаемая скидка для участия в акции'] }}%
              </span>
            </template>
          </Column>

          <!-- Already Participating -->
          <Column
            v-if="isColumnVisible('Товар уже участвует в акции')"
            field="Товар уже участвует в акции"
            header="В акции"
            sortable
            style="min-width: 90px"
          >
            <template #body="slotProps">
              <span
                class="text-sm"
                :class="
                  slotProps.data['Товар уже участвует в акции'] === 'Да'
                    ? 'text-green-600 dark:text-green-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                "
              >
                {{ slotProps.data['Товар уже участвует в акции'] }}
              </span>
            </template>
          </Column>

          <!-- Stock WB -->
          <Column
            v-if="isColumnVisible('Остаток товара на складах Wb (шт.)')"
            field="Остаток товара на складах Wb (шт.)"
            header="Остаток WB"
            sortable
            style="min-width: 100px"
          >
            <template #body="slotProps">
              <span
                class="text-sm"
                :class="
                  getStockClass(
                    slotProps.data['Остаток товара на складах Wb (шт.)'],
                  )
                "
              >
                {{ slotProps.data['Остаток товара на складах Wb (шт.)'] }}
              </span>
            </template>
          </Column>

          <!-- Stock Seller -->
          <Column
            v-if="isColumnVisible('Остаток товара на складе продавца Wb (шт.)')"
            field="Остаток товара на складе продавца Wb (шт.)"
            header="Остаток продавца"
            sortable
            style="min-width: 120px"
          >
            <template #body="slotProps">
              <span
                class="text-sm"
                :class="
                  getStockClass(
                    slotProps.data[
                      'Остаток товара на складе продавца Wb (шт.)'
                    ],
                  )
                "
              >
                {{
                  slotProps.data['Остаток товара на складе продавца Wb (шт.)']
                }}
              </span>
            </template>
          </Column>

          <!-- Turnover -->
          <Column
            v-if="isColumnVisible('Оборачиваемость')"
            field="Оборачиваемость"
            header="Оборачиваемость"
            sortable
            style="min-width: 120px"
          >
            <template #body="slotProps">
              <span
                class="text-sm"
                :class="getTurnoverClass(slotProps.data['Оборачиваемость'])"
              >
                {{ Math.round(slotProps.data['Оборачиваемость']) }} дн.
              </span>
            </template>
          </Column>

          <!-- Days on Site -->
          <Column
            v-if="isColumnVisible('Количество дней на сайте')"
            field="Количество дней на сайте"
            header="Дней на сайте"
            sortable
            style="min-width: 110px"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ Math.round(slotProps.data['Количество дней на сайте']) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Empty State (only shown when not loading, no error, and no data) -->
      <div
        v-else
        class="text-center py-16 text-gray-500 dark:text-gray-400"
      >
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
            :label="isRecovery ? 'Восстановить' : 'Исключить'"
            :severity="isRecovery ? 'success' : 'danger'"
            :icon="isRecovery ? 'pi pi-check' : 'pi pi-times'"
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
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import { useLocalStorage } from '@vueuse/core';
import { usePromotionsStore } from '../../stores/promotions';
import type { PromotionExcelItem } from '../../types';

const promotionsStore = usePromotionsStore();

// Available columns configuration
interface ColumnConfig {
  field: string;
  header: string;
  defaultVisible: boolean;
}

const availableColumns: ColumnConfig[] = [
  { field: 'Артикул поставщика', header: 'Артикул', defaultVisible: true },
  { field: 'Наименование', header: 'Наименование', defaultVisible: true },
  { field: 'Бренд', header: 'Бренд', defaultVisible: false },
  { field: 'Предмет', header: 'Предмет', defaultVisible: false },
  { field: 'Артикул WB', header: 'Арт. WB', defaultVisible: true },
  {
    field: 'Текущая розничная цена',
    header: 'Тек. цена',
    defaultVisible: true,
  },
  {
    field: 'Плановая цена для акции',
    header: 'Цена в акции',
    defaultVisible: true,
  },
  {
    field: 'Текущая скидка на сайте, %',
    header: 'Тек. скидка',
    defaultVisible: true,
  },
  {
    field: 'Загружаемая скидка для участия в акции',
    header: 'Загр. скидка',
    defaultVisible: true,
  },
  {
    field: 'Товар уже участвует в акции',
    header: 'В акции',
    defaultVisible: true,
  },
  {
    field: 'Остаток товара на складах Wb (шт.)',
    header: 'Остаток WB',
    defaultVisible: true,
  },
  {
    field: 'Остаток товара на складе продавца Wb (шт.)',
    header: 'Остаток продавца',
    defaultVisible: false,
  },
  {
    field: 'Оборачиваемость',
    header: 'Оборачиваемость',
    defaultVisible: false,
  },
  {
    field: 'Количество дней на сайте',
    header: 'Дней на сайте',
    defaultVisible: false,
  },
  { field: 'Валюта', header: 'Валюта', defaultVisible: false },
];

interface Props {
  show: boolean;
  promotionName?: string;
  excelItems: PromotionExcelItem[];
  excelLoading: boolean;
  excelError: string | null;
  reportPending: boolean;
  isRecovery: boolean; // true = recover mode, false = exclude mode
  canEdit: boolean; // true = can recover/exclude items (promotion hasn't started)
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  retry: [];
  'apply-recovery': [selectedItems: string[], isRecovery: boolean];
}>();

// Selected items for recovery/exclusion
const selectedItems = ref<PromotionExcelItem[]>([]);
const applying = ref(false);

// Selected columns for display (default to columns with defaultVisible: true)
const defaultColumns = availableColumns
  .filter((col) => col.defaultVisible)
  .map((col) => col.field);

// Persist selected columns to localStorage
const selectedColumns = useLocalStorage<string[]>(
  'promotions-selected-columns',
  [...defaultColumns],
);

// Reset to defaults if stored columns contain invalid fields
const validFields = availableColumns.map((col) => col.field);
if (selectedColumns.value.some((field) => !validFields.includes(field))) {
  selectedColumns.value = [...defaultColumns];
}

// Check if a column should be visible
function isColumnVisible(field: string): boolean {
  return selectedColumns.value.includes(field);
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
      ? 'Восстановление'
      : 'Исключение'
    : 'Просмотр';
  return props.promotionName
    ? `${modeLabel}: ${props.promotionName}`
    : `${modeLabel} участников`;
});

// Count participating items (Товар уже участвует в акции === 'Да')
const participatingCount = computed(() => {
  return props.excelItems.filter(
    (item) => item['Товар уже участвует в акции'] === 'Да',
  ).length;
});

// Count not participating items
const notParticipatingCount = computed(() => {
  return props.excelItems.filter(
    (item) => item['Товар уже участвует в акции'] !== 'Да',
  ).length;
});

// Format price with currency
function formatPrice(price: number): string {
  if (!price && price !== 0) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Get short status for display
function getShortStatus(status: string): string {
  if (!status) return 'Неизвестно';
  if (status.includes('Участвует: добавлен')) return 'Участвует';
  if (status.includes('Не участвует')) return 'Не участвует';
  if (status.includes('Ожидает')) return 'Ожидает';
  if (status.length > 30) return status.substring(0, 30) + '...';
  return status;
}

// Get severity for status tag
function getStatusSeverity(status: string): string {
  if (!status) return 'secondary';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('участвует')) {
    return 'success';
  }
  if (lowerStatus.includes('ожидает')) {
    return 'warn';
  }
  if (
    lowerStatus.includes('не участвует') ||
    lowerStatus.includes('отклонено')
  ) {
    return 'secondary';
  }
  return 'info';
}

// Get discount class based on comparison
function getDiscountClass(item: PromotionExcelItem): string {
  const current = Number(item['Текущая скидка на сайте, %']) || 0;
  const uploaded = Number(item['Загружаемая скидка для участия в акции']) || 0;

  if (uploaded > current) {
    return 'text-green-600 dark:text-green-400';
  } else if (uploaded < current) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-gray-600 dark:text-gray-400';
}

// Get stock class
function getStockClass(stock: number): string {
  if (stock === 0) return 'text-red-500 dark:text-red-400 font-medium';
  if (stock < 10) return 'text-orange-500 dark:text-orange-400';
  return 'text-gray-600 dark:text-gray-400';
}

// Get turnover class
function getTurnoverClass(turnover: number): string {
  if (turnover <= 30) return 'text-green-600 dark:text-green-400';
  if (turnover <= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

// Retry fetch
function retryFetch() {
  emit('retry');
}

// Handle apply recovery/exclusion
async function handleApply() {
  if (selectedItems.value.length === 0) return;

  applying.value = true;
  try {
    // Extract supplier article IDs (Артикул поставщика)
    const articleIds = selectedItems.value.map(
      (item) => item['Артикул поставщика'],
    );
    emit('apply-recovery', articleIds, props.isRecovery);
  } finally {
    applying.value = false;
  }
}

// Clean up data when dialog closes
watch(
  () => props.show,
  (newVal, oldVal) => {
    if (oldVal && !newVal) {
      // Dialog was open and now closed - clean up
      selectedItems.value = [];
      applying.value = false;
      promotionsStore.clearExcelData();
    }
  },
);
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
