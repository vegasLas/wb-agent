import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import { useWarehousesStore } from './warehouses';
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
    currentPage,
    nextPage,
    loadNextPage,
  };
});
