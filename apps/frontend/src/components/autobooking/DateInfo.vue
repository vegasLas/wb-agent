<template>
  <div class="flex items-center gap-2">
    <CalendarIcon class="w-4 h-4 text-gray-500" />
    <div class="flex flex-col gap-2">
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 w-fit">
        {{ listStore.getDateTypeText(booking.dateType) }}
      </span>
      <!-- Period Type and Date Range -->
      <div class="flex flex-col gap-2">
        <!-- Date Range Badge based on Period Type -->
        <span
          v-if="['WEEK', 'MONTH', 'CUSTOM_PERIOD'].includes(booking.dateType)"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 w-fit"
        >
          {{ getDateRangeText }}
        </span>
        <div
          v-if="
            ['CUSTOM_DATES', 'CUSTOM_DATES_SINGLE'].includes(booking.dateType)
          "
          class="grid grid-cols-2 gap-1"
        >
          <span
            v-for="date in booking.customDates"
            :key="String(date)"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800"
          >
            {{ formatDateShort(date) }}
          </span>
        </div>
      </div>
    </div>
  </div>
  <!-- Completed Dates Section -->
  <div v-if="booking.completedDates?.length" class="flex items-center gap-2">
    <CheckCircleIcon class="w-4 h-4 text-gray-500" />
    <div class="grid grid-cols-2 gap-2">
      <span
        v-for="date in booking.completedDates"
        :key="String(date)"
        class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800"
      >
        {{ formatDateShort(date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import type { Autobooking } from '../../types';
import { useAutobookingListStore } from '../../stores/autobookingList';
import { formatDateShort, getWeekEndDate, getMonthEndDate, formatDateRange } from '../../utils/formatters';

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
      return formatDateRange(props.booking.startDate || '', props.booking.endDate || '');
    default:
      return '';
  }
});
</script>
