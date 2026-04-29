import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '@/api';
import { useWarehousesStore } from '@/stores/warehouses';
import { toastHelpers } from '@/utils/ui';
import { calculateSlotCount } from '@/utils/autobooking';
import type {
  Autobooking,
  AutobookingReschedule,
  BadgeColor,
  StatusCounts,
  AutobookingsResponse,
} from './types';

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

  // Status-based cache: stores fetched data per status
  const statusCache = ref<Record<string, Autobooking[]>>({});
  // Track which statuses have been fetched
  const fetchedStatuses = ref<Set<string>>(new Set());

  const warehouseStore = useWarehousesStore();

  /**
   * Total slots consumed by ACTIVE and PENDING autobookings.
   * Searches across all cached status data and current autobookings.
   */
  const usedSlots = computed(() => {
    const allBookings: Autobooking[] = [];

    // Collect from status cache
    Object.values(statusCache.value).forEach((list) => {
      allBookings.push(...list);
    });

    // Also include current autobookings (may not be cached yet)
    allBookings.push(...autobookings.value);

    // Deduplicate by id and keep only ACTIVE / PENDING
    const seen = new Set<string>();
    const activeBookings: Autobooking[] = [];

    for (const b of allBookings) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      if (b.status === 'ACTIVE') {
        activeBookings.push(b);
      }
    }

    return activeBookings.reduce(
      (sum, b) => sum + calculateSlotCount(b.dateType, b.customDates),
      0,
    );
  });

  const filteredBookings = computed(() => {
    // Use cached data for the current status if available
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

  /**
   * Check if data for a specific status has already been fetched
   */
  function isStatusFetched(status: string): boolean {
    return fetchedStatuses.value.has(status);
  }

  /**
   * Fetch data only if not already fetched for the current status
   * Returns true if fetch was performed, false if data was already cached
   */
  async function fetchDataIfNeeded(): Promise<boolean> {
    const currentStatus = selectedStatus.value;

    // If we already have data for this status, don't fetch again
    if (
      isStatusFetched(currentStatus) &&
      statusCache.value[currentStatus]?.length > 0
    ) {
      // Use cached data for this status
      autobookings.value = statusCache.value[currentStatus];
      return false;
    }

    // Fetch new data starting from page 1
    await fetchData(1);
    return true;
  }

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

    const completedDates =
      (booking as unknown as AutobookingReschedule).completedDates || [];
    return booking.customDates.filter((date) => {
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);

      return !completedDates.some((completedDate: string | Date) => {
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
    const warehouseStore = useWarehousesStore();

    try {
      loading.value = true;
      const updated = await autobookingAPI.updateAutobooking(booking.id, {
        status: 'ACTIVE',
      });

      // Update the booking in the local list instead of fetching
      const index = autobookings.value.findIndex((a) => a.id === booking.id);
      if (index !== -1) {
        const oldStatus = autobookings.value[index].status;
        autobookings.value[index] = {
          ...autobookings.value[index],
          ...updated,
        };

        // Update status counts
        if (statusCounts.value[oldStatus] > 0) {
          statusCounts.value[oldStatus]--;
        }
        statusCounts.value['ACTIVE'] = (statusCounts.value['ACTIVE'] || 0) + 1;
      }

      // Update all status caches
      Object.keys(statusCache.value).forEach((status) => {
        const cacheIndex = statusCache.value[status].findIndex(
          (a) => a.id === booking.id,
        );
        if (cacheIndex !== -1) {
          statusCache.value[status][cacheIndex] = {
            ...statusCache.value[status][cacheIndex],
            ...updated,
          };
        }
      });

      // Show success toast
      const warehouseName = warehouseStore.getWarehouseName(
        updated.warehouseId,
      );
      toastHelpers.success(
        'Автобронирование активировано',
        `Склад: ${warehouseName}`,
      );
    } catch (err) {
      error.value = 'Failed to activate autobooking';
      toastHelpers.error(
        'Ошибка активации',
        'Не удалось активировать автобронирование',
      );
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

      // Store in status cache
      const currentStatus = selectedStatus.value;
      statusCache.value[currentStatus] = [...autobookings.value];
      fetchedStatuses.value.add(currentStatus);

      currentPage.value = data.currentPage;
      nextPage.value = data.nextPage;

      return data;
    } catch (err) {
      error.value = 'Failed to fetch autobookings';
      clearStatusCache();
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

  /**
   * Clear the status cache (useful when data might be stale)
   */
  function clearStatusCache() {
    statusCache.value = {};
    fetchedStatuses.value.clear();
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
    statusCache,
    fetchedStatuses,
    fetchData,
    usedSlots,
    fetchDataIfNeeded,
    isStatusFetched,
    clearStatusCache,
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
