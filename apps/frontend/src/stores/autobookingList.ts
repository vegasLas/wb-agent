import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '../api';
import { useWarehousesStore } from './warehouses';
import { AUTOBOOKING_STATUSES } from '../constants';
import type { Autobooking } from '../types';

type BadgeColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

interface StatusCounts {
  [key: string]: number;
}

interface AutobookingsResponse {
  items: Autobooking[];
  counts: StatusCounts;
  currentPage: number;
  nextPage: number | null;
}

export const useAutobookingListStore = defineStore('autobookingList', () => {
  const searchQuery = ref('');
  const selectedStatus = ref('ACTIVE');
  const isFetched = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const autobookings = ref<Autobooking[]>([]);
  const statusCounts = ref<StatusCounts>({});
  const currentPage = ref(1);
  const nextPage = ref<number | null>(null);

  const warehouseStore = useWarehousesStore();

  const filteredBookings = computed(() => {
    let filtered = [...autobookings.value];

    // Filter by status
    if (selectedStatus.value) {
      if (selectedStatus.value === 'ARCHIVED') {
        filtered = filtered.filter(
          (booking) =>
            booking.status === 'ARCHIVED' || booking.status === 'ERROR',
        );
      } else {
        filtered = filtered.filter(
          (booking) => booking.status === selectedStatus.value,
        );
      }
    }

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter((booking) =>
        warehouseStore
          .getWarehouseName(booking.warehouseId)
          .toString()
          .toLowerCase()
          .includes(query),
      );
    }

    // Sort by createdAt date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return filtered;
  });

  function getStatusColor(status: string): BadgeColor {
    const colorMap: Record<string, BadgeColor> = {
      ACTIVE: 'yellow',
      COMPLETED: 'green',
      ARCHIVED: 'gray',
      ERROR: 'red',
    };
    return colorMap[status] || 'gray';
  }

  function getStatusText(status: string) {
    const statusMap: Record<string, string> = {
      ACTIVE: 'в ожидании',
      COMPLETED: 'забронировано',
      ARCHIVED: 'в архиве',
      ERROR: 'ошибка',
    };
    return statusMap[status] || status;
  }

  function getDateTypeText(dateType: string): string {
    const typeMap: Record<string, string> = {
      WEEK: 'Неделя',
      MONTH: 'Месяц',
      CUSTOM_PERIOD: 'Свой период',
      CUSTOM_DATES: 'Выбранные даты',
      CUSTOM_DATES_SINGLE: 'Выбранные даты (одна)',
    };
    return typeMap[dateType] || dateType;
  }

  /**
   * Get remaining dates that haven't been completed yet
   */
  function getRemainingDates(booking: Autobooking): (string | Date)[] {
    if (
      (booking.dateType !== 'CUSTOM_DATES' &&
        booking.dateType !== 'CUSTOM_DATES_SINGLE') ||
      !booking.customDates
    )
      return [];

    const completedDates = booking.completedDates || [];
    return booking.customDates.filter((date) => {
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);

      return !completedDates.some((completedDate) => {
        const completed = new Date(completedDate);
        completed.setHours(0, 0, 0, 0);
        return completed.getTime() === dateToCheck.getTime();
      });
    });
  }

  /**
   * Check if booking dates are still relevant (not in the past)
   */
  function isBookingDatesRelevant(booking: Autobooking): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (booking.dateType) {
      case 'WEEK': {
        if (!booking.startDate) return false;
        const weekEndDate = new Date(booking.startDate);
        weekEndDate.setDate(weekEndDate.getDate() + 7);
        return weekEndDate >= now;
      }

      case 'MONTH': {
        if (!booking.startDate) return false;
        const monthEndDate = new Date(booking.startDate);
        monthEndDate.setMonth(monthEndDate.getMonth() + 1);
        return monthEndDate >= now;
      }

      case 'CUSTOM_PERIOD': {
        if (!booking.endDate) return false;
        const endDate = new Date(booking.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= now;
      }

      case 'CUSTOM_DATES':
      case 'CUSTOM_DATES_SINGLE': {
        if (!booking.customDates?.length) return false;
        const remainingDates = getRemainingDates(booking);
        return remainingDates.some((date) => {
          const customDate = new Date(date);
          customDate.setHours(0, 0, 0, 0);
          return customDate >= now;
        });
      }

      default:
        return false;
    }
  }

  async function activateAutobooking(booking: Autobooking) {
    try {
      loading.value = true;
      const updated = await autobookingAPI.updateAutobooking(booking.id, { status: 'ACTIVE' });
      
      // Update the booking in the local list instead of fetching
      const index = autobookings.value.findIndex((a) => a.id === booking.id);
      if (index !== -1) {
        const oldStatus = autobookings.value[index].status;
        autobookings.value[index] = { ...autobookings.value[index], ...updated };
        
        // Update status counts
        if (statusCounts.value[oldStatus] > 0) {
          statusCounts.value[oldStatus]--;
        }
        statusCounts.value['ACTIVE'] = (statusCounts.value['ACTIVE'] || 0) + 1;
      }
    } catch (err) {
      error.value = 'Failed to activate autobooking';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchData(page?: number): Promise<AutobookingsResponse> {
    try {
      loading.value = true;
      if (warehouseStore.warehouses.length === 0) {
        await warehouseStore.fetchWarehouses();
      }
      const data = await autobookingAPI.fetchAutobookings(
        page || currentPage.value,
      );

      // Update the counts and autobookings
      statusCounts.value = data.counts;

      // If it's the first page, reset the array, otherwise append
      if (page === 1 || !page) {
        autobookings.value = data.items;
      } else {
        autobookings.value = [...autobookings.value, ...data.items];
      }

      currentPage.value = data.currentPage;
      nextPage.value = data.nextPage;

      return data;
    } catch (err) {
      error.value = 'Failed to fetch autobookings';
      throw err;
    } finally {
      loading.value = false;
      isFetched.value = true;
    }
  }

  async function loadNextPage() {
    if (!nextPage.value) return;
    await fetchData(nextPage.value);
  }

  return {
    searchQuery,
    selectedStatus,
    filteredBookings,
    isFetched,
    loading,
    error,
    autobookings,
    statusCounts,
    fetchData,
    getStatusColor,
    getStatusText,
    getDateTypeText,
    getRemainingDates,
    isBookingDatesRelevant,
    activateAutobooking,
    currentPage,
    nextPage,
    loadNextPage,
  };
});
