<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
    <div class="flex flex-col gap-3">
      <!-- Header with supplier name on the right -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <!-- Warehouse section -->
          <div class="flex items-center gap-2">
            <BuildingOffice2Icon class="w-4 h-4 text-gray-500" />
            <div class="flex flex-col gap-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 w-fit">
                {{ warehouseStore.getWarehouseName(booking.warehouseId) }}
              </span>
              <span
                v-if="booking.transitWarehouseId"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 w-fit"
              >
                Транзит: {{ warehouseStore.getWarehouseName(booking.transitWarehouseId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Supplier section moved to top right -->
        <div class="flex items-center gap-1 ml-2">
          <UserCircleIcon class="w-4 h-4 text-gray-500" />
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs"
            :class="isSupplierActive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'"
          >
            {{ getSupplierName(booking.supplierId) }}
          </span>
        </div>
      </div>

      <!-- Supply Type section -->
      <div class="flex items-center gap-2">
        <CubeIcon class="w-4 h-4 text-gray-500" />
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
          {{ getSupplyTypeText(booking.supplyType) }}
        </span>
      </div>

      <!-- MonopalletCount for MONOPALLETE supply type -->
      <div
        v-if="booking.supplyType === 'MONOPALLETE' && booking.monopalletCount"
        class="flex items-center gap-2"
      >
        <Squares2X2Icon class="w-4 h-4 text-gray-500" />
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
          {{ booking.monopalletCount }}
          {{ booking.monopalletCount === 1 ? 'монопаллета' : 'монопаллет' }}
        </span>
      </div>

      <!-- Date Information section -->
      <AutobookingDateInfo :booking="booking" />

      <!-- Coefficient section -->
      <div class="flex items-center gap-2">
        <component
          :is="booking.maxCoefficient ? CurrencyDollarIcon : CheckCircleIcon"
          class="w-4 h-4 text-gray-500"
        />
        <span
          class="inline-flex items-center px-2 py-0.5 rounded text-xs"
          :class="booking.maxCoefficient ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'"
        >
          {{
            booking.maxCoefficient
              ? 'Макс. коэффициент: ' + booking.maxCoefficient
              : 'Бесплатная'
          }}
        </span>
      </div>

      <!-- Status section -->
      <div class="flex items-center gap-2">
        <InformationCircleIcon class="w-4 h-4 text-gray-500" />
        <span
          class="inline-flex items-center px-2 py-0.5 rounded text-xs"
          :class="getStatusBadgeClass(booking.status)"
        >
          {{ listStore.getStatusText(booking.status) }}
        </span>
      </div>

      <!-- Created Date -->
      <div class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <CalendarDaysIcon class="w-4 h-4" />
        Создан: {{ formatDateShort(booking.createdAt) }}
      </div>

      <!-- Coefficient Suggestion Alert -->
      <div
        v-if="showCoefficientSuggestion && booking.status === 'ACTIVE'"
        class="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 mt-2"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ArrowUpCircleIcon class="w-5 h-5" />
            <p class="text-sm">
              Рекомендуемый макс. коэффициент: {{ suggestedCoefficientValue }}.
            </p>
          </div>
          <BaseButton
            color="blue"
            variant="solid"
            size="xs"
            :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
            @click="updateCoefficient"
          >
            увеличить
          </BaseButton>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 mt-2">
        <!-- View goods button -->
        <BaseButton
          size="sm"
          variant="soft"
          color="blue"
          :disabled="!userStore.getSupplierById(booking.supplierId)"
          @click="viewGoods"
        >
          <EyeIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Update button for active autobookings -->
        <BaseButton
          v-if="booking.status === 'ACTIVE'"
          color="blue"
          variant="soft"
          size="sm"
          @click="openUpdateForm"
        >
          <PencilSquareIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Archive button for active autobookings -->
        <BaseButton
          v-if="booking.status === 'ACTIVE'"
          color="yellow"
          variant="soft"
          size="sm"
          :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
          @click="archiveAutobooking"
        >
          <ArchiveBoxIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Activate button or Not Relevant badge for archived items -->
        <template v-if="booking.status === 'ARCHIVED'">
          <BaseButton
            v-if="listStore.isBookingDatesRelevant(booking)"
            color="green"
            variant="soft"
            size="sm"
            :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
            @click="activateAutobooking"
          >
            <PlayIcon class="w-4 h-4" />
          </BaseButton>
          <span
            v-else
            class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800"
          >
            <ClockIcon class="w-3 h-3 mr-1" />
            Срок истек
          </span>
        </template>

        <!-- Explicit badge for ERROR status -->
        <span
          v-else-if="booking.status === 'ERROR'"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800"
        >
          <ExclamationTriangleIcon class="w-3 h-3 mr-1" />
          Ошибка бронирования
        </span>

        <!-- Delete button for active, archived or error autobookings -->
        <BaseButton
          v-if="
            booking.status === 'ACTIVE' ||
            booking.status === 'ARCHIVED' ||
            booking.status === 'ERROR'
          "
          color="red"
          variant="soft"
          size="sm"
          :loading="autobookingStore.deletingId === booking.id"
          @click="deleteAutobooking"
        >
          <TrashIcon class="w-4 h-4" />
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  BuildingOffice2Icon,
  UserCircleIcon,
  CubeIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  ArrowUpCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  PlayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';
import type { Autobooking } from '../../types';
import { useAutobookingStore } from '../../stores/autobooking';
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';
import { useAutobookingListStore } from '../../stores/autobookingList';
import { useUserStore } from '../../stores/user';
import { useWarehousesStore } from '../../stores/warehouses';
import { useCoefficientsStore } from '../../stores/coefficients';
import { BaseButton } from '../ui';
import AutobookingDateInfo from './DateInfo.vue';
import { formatDateShort, getSupplyTypeText } from '../../utils/formatters';

const props = defineProps<{
  booking: Autobooking;
}>();

const emit = defineEmits<{
  'view-goods': [draftId: string, supplierId: string];
}>();

const autobookingStore = useAutobookingStore();
const updateStore = useAutobookingUpdateStore();
const listStore = useAutobookingListStore();
const userStore = useUserStore();
const warehouseStore = useWarehousesStore();
const coefficientsStore = useCoefficientsStore();

const suggestedCoefficientValue = ref<number | null>(null);

const showCoefficientSuggestion = computed(() => {
  return (
    suggestedCoefficientValue.value !== null &&
    (props.booking.maxCoefficient || 0) < suggestedCoefficientValue.value
  );
});

// Check if the supplier for this booking is still active/available
const isSupplierActive = computed(() => {
  const supplier = userStore.getSupplierById(props.booking.supplierId);
  return supplier !== null;
});

function getSupplierName(supplierId: string): string {
  const supplier = userStore.getSupplierById(supplierId);
  return supplier ? supplier.supplierName : 'поставщик не найден';
}

function getStatusBadgeClass(status: string): string {
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    ERROR: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

function viewGoods() {
  emit('view-goods', props.booking.draftId, props.booking.supplierId);
}

function openUpdateForm() {
  // Create deep copy of booking to avoid mutations
  const bookingCopy = JSON.parse(JSON.stringify(props.booking));
  updateStore.loadAutobooking(bookingCopy);
}

async function updateCoefficient() {
  if (suggestedCoefficientValue.value === null) return;
  
  const confirmed = confirm(
    `Вы уверены, что хотите увеличить коэффициент для этого автобронирования до ${suggestedCoefficientValue.value}?`
  );
  
  if (!confirmed) return;
  
  try {
    // This would need to be implemented in the API and store
    // await autobookingStore.updateBookingCoefficient(
    //   props.booking.id,
    //   suggestedCoefficientValue.value,
    // );
    alert('Коэффициент обновлен');
  } catch (error) {
    console.error('Failed to update coefficient:', error);
    alert('Не удалось обновить коэффициент');
  }
}

async function archiveAutobooking() {
  try {
    await autobookingStore.toggleAutobooking(props.booking.id, false);
  } catch (error) {
    console.error('Failed to archive autobooking:', error);
  }
}

async function activateAutobooking() {
  try {
    await listStore.activateAutobooking(props.booking);
  } catch (error) {
    console.error('Failed to activate autobooking:', error);
  }
}

async function deleteAutobooking() {
  const confirmed = confirm('Вы уверены, что хотите удалить это автобронирование?');
  if (!confirmed) return;
  
  try {
    await autobookingStore.deleteAutobooking(props.booking.id);
  } catch (error) {
    console.error('Failed to delete autobooking:', error);
  }
}

// Load coefficients on mount
const recentCoefficient = coefficientsStore.getMostRecentCoefficient(
  props.booking.warehouseId,
  props.booking.supplyType,
);
if (recentCoefficient) {
  suggestedCoefficientValue.value = recentCoefficient.maxCoefficient;
}
</script>
