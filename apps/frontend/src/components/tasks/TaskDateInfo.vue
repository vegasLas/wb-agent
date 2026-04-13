<template>
  <div class="flex items-center gap-2">
    <i class="pi pi-calendar text-gray-500 dark:text-gray-400 text-sm" />
    <div class="flex flex-col gap-2">
      <Tag
        :value="listStore.getDateTypeText(booking.dateType)"
        severity="secondary"
        class="w-fit"
      />
      <!-- Period Type and Date Range -->
      <div class="flex flex-col gap-2">
        <!-- Date Range Badge based on Period Type -->
        <Tag
          v-if="['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(booking.dateType)"
          :value="getDateRangeText"
          severity="warn"
          class="w-fit"
        />
        <div
          v-if="
            ['CUSTOM_DATES', 'CUSTOM_DATES_SINGLE'].includes(booking.dateType)
          "
          class="grid grid-cols-2 gap-1"
        >
          <Tag
            v-for="date in booking.customDates"
            :key="String(date)"
            :value="formatDateShort(date)"
            severity="warn"
          />
        </div>
      </div>
    </div>
  </div>
  <!-- Completed Dates Section -->
  <div
    v-if="booking.completedDates?.length"
    class="flex items-center gap-2"
  >
    <i class="pi pi-check-circle text-gray-500 dark:text-gray-400 text-sm" />
    <div class="grid grid-cols-2 gap-2">
      <Tag
        v-for="date in booking.completedDates"
        :key="String(date)"
        :value="formatDateShort(date)"
        severity="success"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';
import type { Autobooking } from '../../types';
import { useAutobookingListStore } from '@/stores/autobooking';
import {
  formatDateShort,
  getWeekEndDate,
  getMonthEndDate,
  formatDateRange,
} from '../../utils/formatters';

const props = defineProps<{
  booking: Autobooking;
}>();

const listStore = useAutobookingListStore();

const getDateRangeText = computed(() => {
  switch (props.booking.dateType) {
    case 'WEEK':
      return props.booking.startDate
        ? formatDateRange(
            props.booking.startDate,
            getWeekEndDate(props.booking.startDate),
          )
        : '';
    case 'MONTH':
      return props.booking.startDate
        ? formatDateRange(
            props.booking.startDate,
            getMonthEndDate(props.booking.startDate),
          )
        : '';
    case 'CUSTOM_PERIOD':
      return formatDateRange(
        props.booking.startDate || '',
        props.booking.endDate || '',
      );
    default:
      return '';
  }
});
</script>
