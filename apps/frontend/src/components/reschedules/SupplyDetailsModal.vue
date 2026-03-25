<template>
  <BaseModal
    :model-value="show"
    title="Детали поставки"
    @update:model-value="(value) => $emit('update:show', value)"
  >
    <div class="max-h-[60vh] overflow-auto">
      <!-- Supply Removal Alert -->
      <BaseAlert
        v-if="supplyRemoved"
        icon="warning"
        color="blue"
        class="mb-4"
      >
        <div class="text-sm space-y-2">
          <p>
            <strong>Эта поставка была удалена</strong> из системы WB и
            больше не существует.
          </p>
          <template v-if="!isRescheduleCompleted">
            <p>
              <strong>Рекомендуется удалить</strong> это перепланирование,
              так как оно больше не может быть выполнено.
            </p>
            <p class="font-medium">
              Перепланирование для несуществующей поставки не будет
              работать!
            </p>
          </template>
        </div>

        <template #actions v-if="!isRescheduleCompleted">
          <BaseButton
            color="gray"
            variant="outline"
            size="sm"
            :loading="rescheduleStore.loading"
            @click="handleDelete"
          >
            <TrashIcon class="w-4 h-4 mr-1" />
            Удалить
          </BaseButton>
        </template>
      </BaseAlert>

      <template v-else>
        <!-- Supply Information Section -->
        <div v-if="supplyDetails" class="mb-6">
          <div class="grid grid-cols-1 gap-3 p-4 rounded-lg text-sm bg-gray-50 dark:bg-gray-700">
            <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <BuildingStorefrontIcon class="w-4 h-4 text-gray-500" />
              {{ supplyDetails.warehouseName }}
            </div>
            <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <CubeIcon class="w-4 h-4 text-gray-500" />
              {{ getSupplyTypeLabel(supplyDetails.boxTypeName || '') }}
            </div>
            <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <CalendarDaysIcon class="w-4 h-4 text-gray-500" />
              {{ formatSupplyDate(supplyDetails.supplyDate) }}
            </div>
            <div
              v-if="supplyDetails.statusId"
              class="flex items-center gap-2"
            >
              <InformationCircleIcon class="w-4 h-4 text-gray-500" />
              <span
                class="px-2 py-0.5 text-xs rounded-full"
                :class="getStatusColorClass(supplyDetails.statusId)"
              >
                {{ getStatusName(supplyDetails.statusId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Goods Header -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ goodsHeaderText }}
          </h4>
        </div>

        <!-- Goods Table (when data exists) -->
        <div v-if="supplyGoods.length" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16"></th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Название</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Количество</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Бренд</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="row in supplyGoods" :key="row.barcode || row.id">
                <td class="px-3 py-2 whitespace-nowrap">
                  <img
                    v-if="row.imgSrc"
                    :src="row.imgSrc"
                    class="w-10 h-10 rounded object-cover"
                    :alt="row.imtName"
                  />
                </td>
                <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{{ row.imtName }}</td>
                <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{{ row.quantity }} шт.</td>
                <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  <div v-if="row.brandName" class="font-medium">
                    {{ row.brandName }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div
          v-else-if="loadingSupplyDetails"
          class="flex justify-center items-center py-12"
        >
          <ArrowPathIcon class="animate-spin h-8 w-8 text-gray-400" />
        </div>

        <!-- Error State -->
        <div
          v-else-if="supplyGoodsError"
          class="text-center py-12 text-red-500"
        >
          {{ supplyGoodsError }}
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12 text-gray-500">
          Товары не найдены
        </div>
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  BuildingStorefrontIcon,
  CubeIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';
import { useRescheduleStore } from '../../stores/reschedules';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import { BaseModal, BaseAlert, BaseButton } from '../ui';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const rescheduleStore = useRescheduleStore();
const supplyDetailsStore = useSupplyDetailsStore();

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

function getStatusColorClass(statusId: number): string {
  switch (statusId) {
    case 1:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'; // Запланировано
    case 3:
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'; // Отгрузка разрешена
    case 4:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'; // Идёт приёмка
    case 7:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // Принято
    case 9:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'; // Виртуальная
    case 10:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // Отгружено на воротах
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}
</script>
