import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '@/api';
import { useAutobookingListStore } from './list';
import { useWarehousesStore } from '@/stores/warehouses';
import { toastHelpers } from '@/utils/ui';
import type { Autobooking } from './types';

export const useAutobookingStore = defineStore('autobooking', () => {
  // State
  const autobookings = ref<Autobooking[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const togglingId = ref<string | null>(null);
  const updatingId = ref<string | null>(null);

  // Getters
  const activeAutobookings = computed(() =>
    autobookings.value.filter((a) => a.status === 'ACTIVE'),
  );

  const inactiveAutobookings = computed(() =>
    autobookings.value.filter((a) => a.status !== 'ACTIVE'),
  );

  const totalAutobookings = computed(() => autobookings.value.length);

  const getAutobookingById = computed(() => {
    return (id: string) => autobookings.value.find((a) => a.id === id);
  });

  // Actions
  async function fetchAutobookings() {
    try {
      loading.value = true;
      error.value = null;
      const data = await autobookingAPI.fetchAutobookings();
      autobookings.value = data as unknown as Autobooking[];
      return data;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch autobookings';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAutobooking(id: string) {
    const listStore = useAutobookingListStore();
    const warehouseStore = useWarehousesStore();

    try {
      deletingId.value = id;

      // Get the booking before deletion to update counts
      const booking = listStore.autobookings.find((a) => a.id === id);
      const status = booking?.status;

      await autobookingAPI.deleteAutobooking(id);

      // Update both stores
      autobookings.value = autobookings.value.filter((a) => a.id !== id);
      listStore.autobookings = listStore.autobookings.filter(
        (a) => a.id !== id,
      );

      // Update all status caches
      Object.keys(listStore.statusCache).forEach((status) => {
        listStore.statusCache[status] = listStore.statusCache[status].filter(
          (a) => a.id !== id,
        );
      });

      // Update status counts
      if (status && listStore.statusCounts[status] > 0) {
        listStore.statusCounts[status]--;
      }

      // Show success toast
      const warehouseName = booking
        ? warehouseStore.getWarehouseName(booking.warehouseId)
        : '';
      toastHelpers.success(
        'Автобронирование удалено',
        warehouseName ? `Склад: ${warehouseName}` : undefined,
      );
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to delete autobooking';
      error.value = errorMsg;
      toastHelpers.error('Ошибка удаления', errorMsg);
      throw err;
    } finally {
      deletingId.value = null;
    }
  }

  async function archiveAutobooking(id: string) {
    const listStore = useAutobookingListStore();
    const warehouseStore = useWarehousesStore();

    try {
      togglingId.value = id;
      const updated = await autobookingAPI.updateAutobooking(id, {
        status: 'ARCHIVED',
      });

      // Update autobooking store
      const index = autobookings.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        autobookings.value[index] = {
          ...autobookings.value[index],
          ...updated,
        };
      }

      // Update list store - update the booking status and status counts
      const listIndex = listStore.autobookings.findIndex((a) => a.id === id);
      if (listIndex !== -1) {
        const oldStatus = listStore.autobookings[listIndex].status;
        listStore.autobookings[listIndex] = {
          ...listStore.autobookings[listIndex],
          ...updated,
        };

        // Update status counts
        if (listStore.statusCounts[oldStatus] > 0) {
          listStore.statusCounts[oldStatus]--;
        }
        listStore.statusCounts['ARCHIVED'] =
          (listStore.statusCounts['ARCHIVED'] || 0) + 1;
      }

      // Update all status caches
      Object.keys(listStore.statusCache).forEach((status) => {
        const cacheIndex = listStore.statusCache[status].findIndex(
          (a) => a.id === id,
        );
        if (cacheIndex !== -1) {
          listStore.statusCache[status][cacheIndex] = {
            ...listStore.statusCache[status][cacheIndex],
            ...updated,
          };
        }
      });

      // Show success toast
      const warehouseName = warehouseStore.getWarehouseName(
        updated.warehouseId,
      );
      toastHelpers.success(
        'Автобронирование в архиве',
        `Склад: ${warehouseName}`,
      );

      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to archive autobooking';
      error.value = errorMsg;
      toastHelpers.error('Ошибка архивирования', errorMsg);
      throw err;
    } finally {
      togglingId.value = null;
    }
  }

  async function updateBookingCoefficient(id: string, maxCoefficient: number) {
    const warehouseStore = useWarehousesStore();

    try {
      updatingId.value = id;
      const updated = await autobookingAPI.updateBookingCoefficient(
        id,
        maxCoefficient,
      );
      const index = autobookings.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        autobookings.value[index] = {
          ...autobookings.value[index],
          ...updated,
        };
      }

      // Show success toast
      const warehouseName = warehouseStore.getWarehouseName(
        updated.warehouseId,
      );
      toastHelpers.success('Коэффициент обновлен', `Склад: ${warehouseName}`);

      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update coefficient';
      error.value = errorMsg;
      toastHelpers.error('Ошибка обновления', errorMsg);
      throw err;
    } finally {
      updatingId.value = null;
    }
  }

  function addAutobooking(autobooking: Autobooking) {
    autobookings.value.unshift(autobooking);
  }

  function updateAutobookingInList(id: string, updates: Partial<Autobooking>) {
    const index = autobookings.value.findIndex((a) => a.id === id);
    if (index !== -1) {
      autobookings.value[index] = { ...autobookings.value[index], ...updates };
    }
  }

  return {
    // State
    autobookings: readonly(autobookings),
    loading: readonly(loading),
    error: readonly(error),
    deletingId: readonly(deletingId),
    togglingId: readonly(togglingId),
    updatingId: readonly(updatingId),

    // Getters
    activeAutobookings,
    inactiveAutobookings,
    totalAutobookings,
    getAutobookingById,

    // Actions
    fetchAutobookings,
    deleteAutobooking,
    archiveAutobooking,
    updateBookingCoefficient,
    addAutobooking,
    updateAutobookingInList,
  };
});
