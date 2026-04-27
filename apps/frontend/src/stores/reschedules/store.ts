import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reschedulesAPI } from '../../api';
import { useUserStore } from '../user';
import { useWarehousesStore } from '../warehouses';
import { toastHelpers } from '../../utils/ui';
import { confirmPromise } from '../../utils/ui';

import type {
  AutobookingReschedule,
  CreateAutobookingRescheduleRequest,
  UpdateAutobookingRescheduleRequest,
  Supply,
} from '../../types';

export const useRescheduleStore = defineStore('reschedule', () => {
  const userStore = useUserStore();

  // State
  const reschedules = ref<AutobookingReschedule[]>([]);
  const counts = ref<Record<string, number>>({});
  const currentPage = ref(1);
  const hasNextPage = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Selected reschedule for update form
  const selectedReschedule = ref<AutobookingReschedule | null>(null);

  // Supplies state (moved from form store)
  const supplies = ref<Supply[]>([]);
  const loadingSupplies = ref(false);
  const suppliesError = ref<string | null>(null);

  // Status-based cache: stores fetched data per status
  const statusCache = ref<Record<string, AutobookingReschedule[]>>({});
  // Track which statuses have been fetched
  const fetchedStatuses = ref<Set<string>>(new Set());
  // Current selected status for caching
  const selectedStatus = ref<string>('ACTIVE');

  // Computed
  const activeReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ACTIVE'),
  );

  const completedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'COMPLETED'),
  );

  const archivedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ARCHIVED'),
  );

  // Available supplies filtered for rescheduling (statusId 1 and 3 only)
  const availableSupplies = computed(() =>
    supplies.value.filter(
      (supply) => supply.statusId === 1 || supply.statusId === 3,
    ),
  );

  // Actions
  async function fetchReschedules(page = 1) {
    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.fetchReschedules(page);
      if (response.success) {
        reschedules.value = response.items || [];
        counts.value = response.counts || {};
        currentPage.value = response.currentPage || 1;
        hasNextPage.value = !!response.nextPage;
        
        // Store in status cache for the current status
        const currentStatus = selectedStatus.value;
        statusCache.value[currentStatus] = [...reschedules.value];
        fetchedStatuses.value.add(currentStatus);
      } else {
        console.warn('[RescheduleStore] API returned success: false');
        error.value = 'API returned unsuccessful response';
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch reschedules';
      error.value = errorMessage;
      clearStatusCache();

      console.error(
        'Ошибка загрузки: Не удалось загрузить перепланирования. Попробуйте обновить страницу.',
      );
    } finally {
      loading.value = false;
    }
  }

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
    if (isStatusFetched(currentStatus) && statusCache.value[currentStatus]?.length > 0) {
      // Use cached data for this status
      reschedules.value = statusCache.value[currentStatus];
      return false;
    }
    
    // Fetch new data
    await fetchReschedules();
    return true;
  }

  /**
   * Clear the status cache (useful when data might be stale)
   */
  function clearStatusCache() {
    statusCache.value = {};
    fetchedStatuses.value.clear();
  }

  async function createReschedule(data: CreateAutobookingRescheduleRequest) {
    const warehouseStore = useWarehousesStore();

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.createReschedule(data);
      if (response) {
        // Clear cache since data has changed
        clearStatusCache();
        await fetchReschedules(currentPage.value); // Refresh list
        // Show success toast
        const warehouseName = warehouseStore.getWarehouseName(response.warehouseId);
        toastHelpers.success(
          'Перепланирование создано',
          `Склад: ${warehouseName}`
        );

        return response;
      }
      throw new Error('Failed to create reschedule');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create reschedule';
      error.value = errorMsg;
      toastHelpers.error('Ошибка создания', errorMsg);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateReschedule(data: UpdateAutobookingRescheduleRequest) {
    const warehouseStore = useWarehousesStore();

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule(data);
      if (response) {
        // Clear cache since data has changed
        clearStatusCache();
        await fetchReschedules(currentPage.value); // Refresh list

        // Show success toast
        const warehouseName = warehouseStore.getWarehouseName(response.warehouseId);
        toastHelpers.success(
          'Перепланирование обновлено',
          `Склад: ${warehouseName}`
        );

        return response;
      }
      throw new Error('Failed to update reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to update reschedule';
      toastHelpers.error('Ошибка обновления', err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteReschedule(id: string) {
    const warehouseStore = useWarehousesStore();

    // Show confirmation dialog
    const confirmed = await confirmPromise({
      header: 'Удаление перепланирования',
      message: 'Вы уверены, что хотите удалить это перепланирование?',
      acceptLabel: 'Удалить',
    });
    if (!confirmed) {
      return false;
    }

    // Get reschedule info before deletion for toast
    const reschedule = reschedules.value.find((r) => r.id === id);

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.deleteReschedule(id);
      if (response.success) {
        // Clear cache since data has changed
        clearStatusCache();
        await fetchReschedules(currentPage.value); // Refresh list
        // Show success toast
        const warehouseName = reschedule
          ? warehouseStore.getWarehouseName(reschedule.warehouseId)
          : '';
        toastHelpers.success(
          'Перепланирование удалено',
          warehouseName ? `Склад: ${warehouseName}` : undefined
        );

        return true;
      }
      throw new Error('Failed to delete reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to delete reschedule';
      toastHelpers.error('Ошибка удаления', err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function archiveReschedule(id: string) {
    const warehouseStore = useWarehousesStore();

    // Show confirmation dialog
    const confirmed = await confirmPromise({
      header: 'Архивирование перепланирования',
      message: 'Вы уверены, что хотите архивировать это перепланирование?',
      acceptLabel: 'Архивировать',
    });
    if (!confirmed) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule({
        id,
        status: 'ARCHIVED',
      });
      if (response) {
        // Clear cache since data has changed
        clearStatusCache();
        await fetchReschedules(currentPage.value); // Refresh list

        // Show success toast
        const warehouseName = warehouseStore.getWarehouseName(response.warehouseId);
        toastHelpers.success(
          'Перепланирование в архиве',
          `Склад: ${warehouseName}`
        );

        return response;
      }
      throw new Error('Failed to archive reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to archive reschedule';
      toastHelpers.error('Ошибка архивирования', err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function activateReschedule(id: string) {
    const warehouseStore = useWarehousesStore();

    // Show confirmation dialog
    const confirmed = await confirmPromise({
      header: 'Активация перепланирования',
      message: 'Вы уверены, что хотите активировать это перепланирование?',
      acceptLabel: 'Активировать',
    });
    if (!confirmed) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule({
        id,
        status: 'ACTIVE',
      });
      if (response) {
        // Clear cache since data has changed
        clearStatusCache();
        await fetchReschedules(currentPage.value); // Refresh list

        // Show success toast
        const warehouseName = warehouseStore.getWarehouseName(response.warehouseId);
        toastHelpers.success(
          'Перепланирование активировано',
          `Склад: ${warehouseName}`
        );

        return response;
      }
      throw new Error('Failed to activate reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to activate reschedule';
      toastHelpers.error('Ошибка активации', err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadNextPage() {
    if (hasNextPage.value && !loading.value) {
      await fetchReschedules(currentPage.value + 1);
    }
  }

  async function refresh() {
    await fetchReschedules(currentPage.value);
  }

  function getRescheduleById(id: string) {
    return reschedules.value.find((reschedule) => reschedule.id === id);
  }

  async function fetchSupplies(supplierId?: string) {
    loadingSupplies.value = true;
    suppliesError.value = null;

    try {
      // Using suppliers API endpoint to fetch supplies
      const response = await apiClient.get('/suppliers/supplies', {
        params: { supplierId },
      });

      if (response.data.success) {
        supplies.value = (response.data.data as Supply[]) || [];
      } else {
        throw new Error('Failed to fetch supplies');
      }
    } catch (err: any) {
      suppliesError.value = err.message || 'Failed to fetch supplies';
      console.error('Failed to fetch supplies:', err);
      supplies.value = [];
    } finally {
      loadingSupplies.value = false;
    }
  }

  function setSelectedReschedule(reschedule: AutobookingReschedule) {
    selectedReschedule.value = reschedule;
  }

  return {
    // State
    reschedules: readonly(reschedules),
    counts: readonly(counts),
    currentPage: readonly(currentPage),
    hasNextPage: readonly(hasNextPage),
    loading: readonly(loading),
    error: readonly(error),
    selectedReschedule: readonly(selectedReschedule),
    selectedStatus,
    
    // Status cache
    statusCache,
    fetchedStatuses,

    // Computed
    activeReschedules,
    completedReschedules,
    archivedReschedules,
    availableSupplies,

    // Actions
    fetchReschedules,
    fetchDataIfNeeded,
    isStatusFetched,
    clearStatusCache,
    createReschedule,
    updateReschedule,
    deleteReschedule,
    archiveReschedule,
    activateReschedule,
    loadNextPage,
    refresh,
    getRescheduleById,
    setSelectedReschedule,
    supplies: readonly(supplies),
    loadingSupplies: readonly(loadingSupplies),
    suppliesError: readonly(suppliesError),
    fetchSupplies,
  };
});

// Import apiClient here to avoid circular dependency
import apiClient from '../../api/client';
