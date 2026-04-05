<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    header="Детали поставки"
    :style="{ width: '90vw', maxWidth: '800px' }"
    :modal="true"
  >
    <div class="max-h-[60vh] overflow-auto">
      <!-- Supply Removal Alert -->
      <div
        v-if="supplyRemoved"
        class="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-start gap-3">
          <i
            class="pi pi-exclamation-circle text-blue-500 dark:text-blue-400 mt-0.5"
          />
          <div class="text-sm space-y-2 flex-1">
            <p class="text-blue-800 dark:text-blue-200">
              <strong>Эта поставка была удалена</strong> из системы WB и больше
              не существует.
            </p>
            <template v-if="!isRescheduleCompleted">
              <p class="text-blue-700 dark:text-blue-300">
                <strong>Рекомендуется удалить</strong> это перепланирование, так
                как оно больше не может быть выполнено.
              </p>
              <p class="font-medium text-blue-800 dark:text-blue-200">
                Перепланирование для несуществующей поставки не будет работать!
              </p>
            </template>
          </div>
          <Button
            v-if="!isRescheduleCompleted"
            severity="secondary"
            outlined
            size="small"
            :loading="rescheduleStore.loading"
            @click="handleDelete"
          >
            <i class="pi pi-trash mr-1" />
            Удалить
          </Button>
        </div>
      </div>

      <template v-else>
        <!-- Supply Information Section -->
        <div
          v-if="supplyDetails"
          class="mb-6"
        >
          <div
            class="grid grid-cols-1 gap-3 p-4 rounded-lg text-sm bg-gray-50 dark:bg-gray-700"
          >
            <div
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <i class="pi pi-building text-gray-500 dark:text-gray-400" />
              {{ supplyDetails.warehouseName }}
            </div>
            <div
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <i class="pi pi-box text-gray-500 dark:text-gray-400" />
              {{ getSupplyTypeLabel(supplyDetails.boxTypeName || '') }}
            </div>
            <div
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <i class="pi pi-calendar text-gray-500 dark:text-gray-400" />
              {{ formatSupplyDate(supplyDetails.supplyDate) }}
            </div>
            <div
              v-if="supplyDetails.statusId"
              class="flex items-center gap-2"
            >
              <i class="pi pi-info-circle text-gray-500 dark:text-gray-400" />
              <Tag
                :value="getStatusName(supplyDetails.statusId)"
                :severity="getStatusSeverity(supplyDetails.statusId)"
              />
            </div>
          </div>
        </div>

        <!-- Goods Header -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ goodsHeaderText }}
          </h4>
        </div>

        <!-- Goods DataTable (when data exists) -->
        <DataTable
          v-if="supplyGoods.length"
          :value="supplyGoods"
          size="small"
          class="p-datatable-sm"
        >
          <Column
            header=""
            style="width: 4rem"
          >
            <template #body="slotProps">
              <img
                v-if="slotProps.data.imgSrc"
                :src="slotProps.data.imgSrc"
                class="w-10 h-10 rounded object-cover"
                :alt="slotProps.data.imtName"
              >
            </template>
          </Column>
          <Column
            field="imtName"
            header="Название"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-900 dark:text-gray-100">{{
                slotProps.data.imtName
              }}</span>
            </template>
          </Column>
          <Column
            field="quantity"
            header="Количество"
          >
            <template #body="slotProps">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ slotProps.data.quantity }} шт.</span>
            </template>
          </Column>
          <Column
            field="brandName"
            header="Бренд"
          >
            <template #body="slotProps">
              <span
                v-if="slotProps.data.brandName"
                class="text-xs text-gray-600 dark:text-gray-400 font-medium"
              >
                {{ slotProps.data.brandName }}
              </span>
            </template>
          </Column>
        </DataTable>

        <!-- Loading State -->
        <div
          v-else-if="loadingSupplyDetails"
          class="flex justify-center items-center py-12"
        >
          <i class="pi pi-refresh animate-spin text-4xl text-gray-400" />
        </div>

        <!-- Error State -->
        <div
          v-else-if="supplyGoodsError"
          class="text-center py-12 text-red-500 dark:text-red-400"
        >
          {{ supplyGoodsError }}
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="text-center py-12 text-gray-500 dark:text-gray-400"
        >
          Товары не найдены
        </div>
      </template>
    </div>
    <template #footer>
      <Button
        label="Закрыть"
        @click="visible = false"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useRescheduleStore } from '../../stores/reschedules';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const rescheduleStore = useRescheduleStore();
const supplyDetailsStore = useSupplyDetailsStore();

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
  },
});

// Get supply details and goods from store
const supplyDetails = computed(() => supplyDetailsStore.supplyDetails);
const supplyGoods = computed(() => supplyDetailsStore.supplyGoods);
const supplyRemoved = computed(() => supplyDetailsStore.supplyRemoved);
const loadingSupplyDetails = computed(
  () => supplyDetailsStore.loadingSupplyDetails,
);
const supplyGoodsError = computed(() => supplyDetailsStore.supplyGoodsError);

// Get reschedule by supplyId from supplyDetails
const currentReschedule = computed(() => {
  const supplyId = supplyDetailsStore.selectedSupplyId;
  if (!supplyId) return null;
  return supplyDetailsStore.getRescheduleBySupplyId(supplyId?.toString());
});

const isRescheduleCompleted = computed(() => {
  return currentReschedule.value?.status === 'COMPLETED';
});

// Handle delete action
async function handleDelete() {
  if (!currentReschedule.value?.id) return;

  try {
    const result = await rescheduleStore.deleteReschedule(
      currentReschedule.value.id,
    );
    // Only close modal if deletion was successful (not cancelled)
    if (result === true) {
      emit('update:show', false);
    }
  } catch (error) {
    console.error('Failed to delete reschedule:', error);
  }
}

// Supply goods totals
const totalGoodsCount = computed(() => supplyGoods.value.length);
const totalQuantity = computed(() =>
  supplyGoods.value.reduce(
    (sum: number, good) => sum + (good.quantity || 0),
    0,
  ),
);

const goodsHeaderText = computed(() => {
  if (totalGoodsCount.value === 0) return 'Товары в поставке:';
  return `Товары в поставке (${totalGoodsCount.value} товаров, общее количество: ${totalQuantity.value} шт.):`;
});

// Helper functions
function getSupplyTypeLabel(boxTypeName: string): string {
  const normalized = boxTypeName?.toUpperCase() || '';
  if (normalized.includes('КОРОБ') || normalized.includes('BOX')) {
    return 'короб';
  }
  if (normalized.includes('МОНОПАЛЛЕТ') || normalized.includes('MONOPALLETE')) {
    return 'монопаллет';
  }
  if (normalized.includes('СУПЕРСЕЙФ') || normalized.includes('SUPERSAFE')) {
    return 'суперсейф';
  }
  return 'короб'; // Default fallback
}

function formatSupplyDate(dateString: string | undefined): string {
  if (!dateString) return 'Не указана';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Status mapping based on provided WB API response
const statusMap: Record<number, string> = {
  1: 'Запланировано',
  3: 'Отгрузка разрешена',
  4: 'Идёт приёмка',
  7: 'Принято',
  9: 'Виртуальная',
  10: 'Отгружено на воротах',
};

function getStatusName(statusId: number): string {
  return statusMap[statusId] || `Статус ${statusId}`;
}

function getStatusSeverity(statusId: number): string {
  switch (statusId) {
    case 1:
      return 'info'; // Запланировано
    case 3:
      return 'success'; // Отгрузка разрешена
    case 4:
      return 'warn'; // Идёт приёмка
    case 7:
      return 'secondary'; // Принято
    case 9:
      return 'secondary'; // Виртуальная
    case 10:
      return 'secondary'; // Отгружено на воротах
    default:
      return 'secondary';
  }
}
</script>
