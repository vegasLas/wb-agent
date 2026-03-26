<template>
  <Card class="transition-all hover:shadow-md">
    <template #content>
      <div class="flex flex-col gap-3">
        <!-- Header with supply ID on left and supplier on right -->
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Warehouse section -->
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-gray-500" />
              <div class="flex flex-col gap-1">
                <Tag severity="secondary" class="w-fit">
                  {{ warehouseStore.getWarehouseName(reschedule.warehouseId) }}
                </Tag>
                <Tag severity="info" class="w-fit">
                  Поставка: {{ reschedule.supplyId }}
                </Tag>
              </div>
            </div>
          </div>

          <!-- Supplier section moved to top right -->
          <div class="flex items-center gap-1 ml-2">
            <i class="pi pi-user text-gray-500" />
            <Tag
              :severity="isSupplierActive ? 'info' : 'danger'"
              :class="isSupplierActive ? 'bg-blue-500 text-white' : ''"
            >
              {{ getSupplierName(reschedule.supplierId) }}
            </Tag>
          </div>
        </div>

        <!-- Supply Type section -->
        <div class="flex items-center gap-2">
          <i class="pi pi-th-large text-gray-500" />
          <Tag :severity="getSupplyTypeSeverity(reschedule.supplyType)">
            {{ getSupplyTypeText(reschedule.supplyType) }}
          </Tag>
        </div>

        <!-- Date Information section -->
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar text-gray-500" />
          <div class="flex flex-col gap-2">
            <Tag severity="secondary" class="w-fit">
              {{ getDateTypeLabel(reschedule.dateType) }}
            </Tag>
            <!-- Period Type and Date Range -->
            <div class="flex flex-col gap-2">
              <!-- Date Range Badge based on Period Type -->
              <Tag
                v-if="
                  ['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(reschedule.dateType)
                "
                severity="warn"
                class="w-fit"
              >
                {{ getDateRangeText }}
              </Tag>
              <div
                v-if="
                  ['CUSTOM_DATES', 'CUSTOM_DATES_SINGLE'].includes(
                    reschedule.dateType,
                  ) && reschedule.customDates.length > 0
                "
                class="grid grid-cols-2 gap-1"
              >
                <Tag
                  v-for="date in reschedule.customDates"
                  :key="String(date)"
                  severity="warn"
                >
                  {{ formatDate(date) }}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Coefficient section -->
        <div class="flex items-center gap-2">
          <i class="pi pi-dollar text-gray-500" />
          <Tag severity="warn">
            Макс. коэффициент: {{ reschedule.maxCoefficient }}
          </Tag>
        </div>

        <!-- Completed Dates Section -->
        <div
          v-if="reschedule.completedDates?.length"
          class="flex items-center gap-2"
        >
          <i class="pi pi-check-circle text-green-500" />
          <div class="grid grid-cols-2 gap-2">
            <Tag
              v-for="date in reschedule.completedDates"
              :key="String(date)"
              severity="success"
            >
              {{ formatDate(date) }}
            </Tag>
          </div>
        </div>

        <!-- Created Date -->
        <div class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <i class="pi pi-calendar-plus" />
          Создан: {{ formatDate(reschedule.createdAt) }}
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 mt-2">
          <!-- View details button - only show if supply exists -->
          <Button
            size="small"
            variant="outlined"
            @click="emit('open-details')"
          >
            <i class="pi pi-info-circle mr-1" />
            детали
          </Button>

          <!-- Update button - only for non-completed reschedules and existing supplies -->
          <Button
            v-if="reschedule.status !== 'COMPLETED'"
            severity="info"
            variant="outlined"
            size="small"
            @click="emit('update', reschedule)"
          >
            <i class="pi pi-pencil" />
          </Button>

          <!-- Archive button for active reschedules -->
          <Button
            v-if="reschedule.status === 'ACTIVE'"
            severity="warn"
            variant="outlined"
            size="small"
            :loading="rescheduleStore.loading"
            @click="handleArchive"
          >
            <i class="pi pi-folder-open" />
          </Button>

          <!-- Activate button for archived items -->
          <Button
            v-if="reschedule.status === 'ARCHIVED'"
            severity="success"
            variant="outlined"
            size="small"
            :loading="rescheduleStore.loading"
            @click="handleActivate"
          >
            <i class="pi pi-play" />
          </Button>

          <!-- Delete button for active and archived reschedules -->
          <Button
            v-if="
              reschedule.status === 'ACTIVE' || reschedule.status === 'ARCHIVED'
            "
            severity="danger"
            variant="outlined"
            size="small"
            @click="emit('delete', reschedule.id)"
          >
            <i class="pi pi-trash" />
          </Button>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useRescheduleStore } from '../../stores/reschedules';
import { useWarehousesStore } from '../../stores/warehouses';
import { useUserStore } from '../../stores/user';
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

function getSupplyTypeSeverity(supplyType: string): string {
  switch (supplyType) {
    case 'BOX':
      return 'info';
    case 'MONOPALLETE':
      return 'secondary';
    case 'SUPERSAFE':
      return 'warn';
    default:
      return 'secondary';
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
