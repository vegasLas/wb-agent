import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import { useWarehousesStore } from './warehouses';
import { AUTOBOOKING_STATUSES } from '../constants';
import type { Autobooking } from '../types';

type BadgeColor = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';

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
    let filtered = autobookings.value;

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
      'WEEK': 'Неделя',
      'MONTH': 'Месяц',
      'CUSTOM_PERIOD': 'Свой период',
      'CUSTOM_DATES': 'Выбранные даты',
      'CUSTOM_DATES_SINGLE': 'Выбранные даты (одна)',
    };
    return typeMap[dateType] || dateType;
  }

  /**
   * Check if booking dates are still relevant (not in the past)
   */
  function isBookingDatesRelevant(booking: Autobooking): boolean {
    const now = new Date();
    
    if (booking.dateType === 'WEEK' || booking.dateType === 'MONTH') {
      if (!booking.startDate) return false;
      const startDate = new Date(booking.startDate);
      // Add buffer period based on date type
      const bufferDays = booking.dateType === 'WEEK' ? 6 : 30;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + bufferDays);
      return endDate >= now;
    }
    
    if (booking.dateType === 'CUSTOM_PERIOD') {
      if (!booking.endDate) return false;
      const endDate = new Date(booking.endDate);
      return endDate >= now;
    }
    
    if (booking.dateType === 'CUSTOM_DATES' || booking.dateType === 'CUSTOM_DATES_SINGLE') {
      if (!booking.customDates || booking.customDates.length === 0) return false;
      // Check if any date is in the future
      return booking.customDates.some(date => new Date(date) >= now);
    }
    
    return true;
  }

  async function activateAutobooking(booking: Autobooking) {
    try {
      loading.value = true;
      await api.post(`/autobookings/${booking.id}/activate`);
      // Refresh the list to get updated status
      await fetchData(1);
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

      const response = await api.get('/autobookings', {
        params: { page: page || currentPage.value },
      });

      const data = response.data as AutobookingsResponse;

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
    isBookingDatesRelevant,
    activateAutobooking,
    currentPage,
    nextPage,
    loadNextPage,
  };
});
