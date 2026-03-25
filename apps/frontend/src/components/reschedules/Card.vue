<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all hover:shadow-md">
    <div class="flex flex-col gap-3">
      <!-- Header with supply ID on left and supplier on right -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <!-- Warehouse section -->
          <div class="flex items-center gap-2">
            <BuildingOffice2Icon class="w-4 h-4 text-gray-500" />
            <div class="flex flex-col gap-1">
              <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 w-fit">
                {{ warehouseStore.getWarehouseName(reschedule.warehouseId) }}
              </span>
              <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 w-fit">
                Поставка: {{ reschedule.supplyId }}
              </span>
            </div>
          </div>
        </div>

        <!-- Supplier section moved to top right -->
        <div class="flex items-center gap-1 ml-2">
          <UserCircleIcon class="w-4 h-4 text-gray-500" />
          <span
            class="px-2 py-0.5 text-xs rounded-full w-fit"
            :class="isSupplierActive
              ? 'bg-blue-500 text-white'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'"
          >
            {{ getSupplierName(reschedule.supplierId) }}
          </span>
        </div>
      </div>

      <!-- Supply Type section -->
      <div class="flex items-center gap-2">
        <Squares2X2Icon class="w-4 h-4 text-gray-500" />
        <span
          class="px-2 py-0.5 text-xs rounded-full"
          :class="getSupplyTypeColorClass(reschedule.supplyType)"
        >
          {{ getSupplyTypeText(reschedule.supplyType) }}
        </span>
      </div>

      <!-- Date Information section -->
      <div class="flex items-center gap-2">
        <CalendarIcon class="w-4 h-4 text-gray-500" />
        <div class="flex flex-col gap-2">
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 w-fit">
            {{ getDateTypeLabel(reschedule.dateType) }}
          </span>
          <!-- Period Type and Date Range -->
          <div class="flex flex-col gap-2">
            <!-- Date Range Badge based on Period Type -->
            <span
              v-if="
                ['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(reschedule.dateType)
              "
              class="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200 w-fit"
            >
              {{ getDateRangeText }}
            </span>
            <div
              v-if="
                ['CUSTOM_DATES', 'CUSTOM_DATES_SINGLE'].includes(
                  reschedule.dateType,
                ) && reschedule.customDates.length > 0
              "
              class="grid grid-cols-2 gap-1"
            >
              <span
                v-for="date in reschedule.customDates"
                :key="String(date)"
                class="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200"
              >
                {{ formatDate(date) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Coefficient section -->
      <div class="flex items-center gap-2">
        <CurrencyDollarIcon class="w-4 h-4 text-gray-500" />
        <span class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          Макс. коэффициент: {{ reschedule.maxCoefficient }}
        </span>
      </div>

      <!-- Completed Dates Section -->
      <div
        v-if="reschedule.completedDates?.length"
        class="flex items-center gap-2"
      >
        <CheckCircleIcon class="w-4 h-4 text-green-500" />
        <div class="grid grid-cols-2 gap-2">
          <span
            v-for="date in reschedule.completedDates"
            :key="String(date)"
            class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
          >
            {{ formatDate(date) }}
          </span>
        </div>
      </div>

      <!-- Created Date -->
      <div class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <CalendarDaysIcon class="w-4 h-4" />
        Создан: {{ formatDate(reschedule.createdAt) }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 mt-2">
        <!-- View details button - only show if supply exists -->
        <BaseButton
          size="sm"
          variant="soft"
          @click="emit('open-details')"
        >
          <InformationCircleIcon class="w-4 h-4 mr-1" />
          детали
        </BaseButton>

        <!-- Update button - only for non-completed reschedules and existing supplies -->
        <BaseButton
          v-if="reschedule.status !== 'COMPLETED'"
          color="blue"
          variant="soft"
          size="sm"
          @click="emit('update', reschedule)"
        >
          <PencilSquareIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Archive button for active reschedules -->
        <BaseButton
          v-if="reschedule.status === 'ACTIVE'"
          color="yellow"
          variant="soft"
          size="sm"
          :loading="rescheduleStore.loading"
          @click="handleArchive"
        >
          <ArchiveBoxIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Activate button for archived items -->
        <BaseButton
          v-if="reschedule.status === 'ARCHIVED'"
          color="green"
          variant="soft"
          size="sm"
          :loading="rescheduleStore.loading"
          @click="handleActivate"
        >
          <PlayIcon class="w-4 h-4" />
        </BaseButton>

        <!-- Delete button for active and archived reschedules -->
        <BaseButton
          v-if="
            reschedule.status === 'ACTIVE' || reschedule.status === 'ARCHIVED'
          "
          color="red"
          variant="soft"
          size="sm"
          @click="emit('delete', reschedule.id)"
        >
          <TrashIcon class="w-4 h-4" />
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  BuildingOffice2Icon,
  UserCircleIcon,
  Squares2X2Icon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';
import { useRescheduleStore } from '../../stores/reschedules';
import { useWarehousesStore } from '../../stores/warehouses';
import { useUserStore } from '../../stores/user';
import { BaseButton } from '../ui';
import type { AutobookingReschedule } from '../../types';

const props = defineProps<{
  reschedule: AutobookingReschedule;
}>();

const emit = defineEmits<{
  update: [reschedule: AutobookingReschedule];
  delete: [id: string];
  'open-details': [];
}>();

const rescheduleStore = useRescheduleStore();
const warehouseStore = useWarehousesStore();
const userStore = useUserStore();

// Check if the supplier for this reschedule is still active/available
const isSupplierActive = computed(() => {
  const supplier = userStore.getSupplierById(props.reschedule.supplierId);
  return supplier !== null;
});

function getSupplierName(supplierId: string): string {
  const supplier = userStore.getSupplierById(supplierId);
  return supplier ? supplier.supplierName : 'поставщик не найден';
}

function getSupplyTypeColorClass(supplyType: string): string {
  switch (supplyType) {
    case 'BOX':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
    case 'MONOPALLETE':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
    case 'SUPERSAFE':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
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

function getDateTypeLabel(dateType: string): string {
  switch (dateType) {
    case 'WEEK':
      return 'Неделя';
    case 'MONTH':
      return 'Месяц';
    case 'CUSTOM_PERIOD':
      return 'Период';
    case 'CUSTOM_DATES_SINGLE':
      return 'Выбранные даты';
    default:
      return dateType;
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function getWeekEndDate(startDate: string | Date): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + 6);
  return date;
}

function getMonthEndDate(startDate: string | Date): Date {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + 1);
  return date;
}

const getDateRangeText = computed(() => {
  switch (props.reschedule.dateType) {
    case 'WEEK':
      return props.reschedule.startDate
        ? formatDateRange(
            props.reschedule.startDate,
            getWeekEndDate(props.reschedule.startDate),
          )
        : '';
    case 'MONTH':
      return props.reschedule.startDate
        ? formatDateRange(
            props.reschedule.startDate,
            getMonthEndDate(props.reschedule.startDate),
          )
        : '';
    case 'CUSTOM_PERIOD':
      return formatDateRange(
        props.reschedule.startDate,
        props.reschedule.endDate,
      );
    default:
      return '';
  }
});

function formatDateRange(startDate: string | Date | null, endDate: string | Date | null): string {
  if (!startDate || !endDate) return '';
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

async function handleArchive() {
  try {
    await rescheduleStore.archiveReschedule(props.reschedule.id);
  } catch (error) {
    console.error('Failed to archive reschedule:', error);
  }
}

async function handleActivate() {
  try {
    await rescheduleStore.activateReschedule(props.reschedule.id);
  } catch (error) {
    console.error('Failed to activate reschedule:', error);
  }
}
</script>

<style scoped>
.reschedule-card {
  transition: all 0.2s ease;
}

.reschedule-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
