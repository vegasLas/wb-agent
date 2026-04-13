import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { triggersAPI } from '@/api';
import { useWarehousesStore } from '@/stores/warehouses';
import { toastHelpers } from '@/utils/ui';
import type { SupplyTrigger, CreateTriggerRequest, BadgeColor, StatusCounts } from './types';

export const useTriggerStore = defineStore('triggers', () => {
  // State
  const triggers = ref<SupplyTrigger[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const searchQuery = ref('');
  const isCreating = ref(false);
  const selectedStatus = ref<'RELEVANT' | 'COMPLETED' | 'EXPIRED'>('RELEVANT');

  // Action states
  const isFetched = ref(false);
  const isUpdating = ref(false);
  const isDeleting = ref(false);
  const togglingId = ref<string | null>(null);

  // Status-based cache: stores fetched data per status
  const statusCache = ref<Record<string, SupplyTrigger[]>>({});
  // Track which statuses have been fetched
  const fetchedStatuses = ref<Set<string>>(new Set());

  // Getters
  const getTriggerById = computed(() => {
    return (triggerId: string) =>
      triggers.value.find((t) => t.id === triggerId);
  });

  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);

  const filteredTriggers = computed(() => {
    let filtered = triggers.value;

    // Filter by status
    filtered = filtered.filter(
      (trigger) => trigger.status === selectedStatus.value,
    );

    // Filter by search query (if provided)
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      const warehouseStore = useWarehousesStore();
      filtered = filtered.filter((trigger) =>
        trigger.warehouseIds.some((warehouseId) => {
          const name = warehouseStore.getWarehouseName(warehouseId);
          return typeof name === 'string' && name.toLowerCase().includes(query);
        }),
      );
    }

    return filtered;
  });

  const activeTriggersCount = computed(() => {
    return triggers.value.filter((trigger) => trigger.isActive).length;
  });

  const relevantTriggersCount = computed(
    () => triggers.value.filter((t) => t.status === 'RELEVANT').length,
  );

  const completedTriggersCount = computed(
    () => triggers.value.filter((t) => t.status === 'COMPLETED').length,
  );

  const expiredTriggersCount = computed(
    () => triggers.value.filter((t) => t.status === 'EXPIRED').length,
  );

  // Actions
  async function create(data: CreateTriggerRequest) {
    const warehouseStore = useWarehousesStore();

    try {
      isCreating.value = true;
      const trigger = await triggersAPI.createTrigger(data);
      if (trigger) {
        triggers.value.unshift(trigger);

        // Clear cache since data has changed
        clearStatusCache();

        // Show success toast with warehouse names
        const warehouseNames = trigger.warehouseIds
          .map((id) => warehouseStore.getWarehouseName(id))
          .filter(Boolean)
          .join(', ');
        toastHelpers.success(
          'Триггер создан',
          warehouseNames ? `Склады: ${warehouseNames}` : undefined
        );
      }
      return trigger;
    } catch (err) {
      error.value = 'Failed to create trigger';
      toastHelpers.error('Ошибка создания', 'Не удалось создать триггер');
      throw err;
    } finally {
      isCreating.value = false;
    }
  }

  async function updateTrigger(data: Partial<SupplyTrigger> & { id: string }) {
    const warehouseStore = useWarehousesStore();

    try {
      isUpdating.value = true;
      const trigger = await triggersAPI.updateTrigger(data.id, data);
      if (trigger) {
        const index = triggers.value.findIndex((t) => t.id === data.id);
        if (index !== -1) {
          triggers.value[index] = trigger;
        }

        // Clear cache since data has changed
        clearStatusCache();

        // Show success toast
        const warehouseNames = trigger.warehouseIds
          .map((id) => warehouseStore.getWarehouseName(id))
          .filter(Boolean)
          .join(', ');
        toastHelpers.success(
          'Триггер обновлен',
          warehouseNames ? `Склады: ${warehouseNames}` : undefined
        );
      }
      return trigger;
    } catch (err) {
      error.value = 'Failed to update trigger';
      toastHelpers.error('Ошибка обновления', 'Не удалось обновить триггер');
      throw err;
    } finally {
      isUpdating.value = false;
    }
  }

  async function fetchTriggers() {
    try {
      loading.value = true;
      error.value = null;
      const data = await triggersAPI.fetchTriggers();
      console.log('await triggersAPI.fetchTriggers(): ', data);
      triggers.value = data;
      
      // Store in status cache for the current status
      const currentStatus = selectedStatus.value;
      statusCache.value[currentStatus] = [...triggers.value];
      fetchedStatuses.value.add(currentStatus);
      
      return triggers.value;
    } catch (err) {
      error.value = 'Failed to fetch triggers';
      clearStatusCache();
      throw err;
    } finally {
      isFetched.value = true;
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
      triggers.value = statusCache.value[currentStatus];
      return false;
    }
    
    // Fetch new data
    await fetchTriggers();
    return true;
  }

  /**
   * Clear the status cache (useful when data might be stale)
   */
  function clearStatusCache() {
    statusCache.value = {};
    fetchedStatuses.value.clear();
  }

  async function deleteTrigger(triggerId: string) {
    const warehouseStore = useWarehousesStore();

    try {
      deletingId.value = triggerId;
      isDeleting.value = true;

      // Get trigger info before deletion for toast
      const trigger = triggers.value.find((t) => t.id === triggerId);

      await triggersAPI.deleteTrigger(triggerId);
      triggers.value = triggers.value.filter((t) => t.id !== triggerId);

      // Clear cache since data has changed
      clearStatusCache();

      // Show success toast
      const warehouseNames = trigger?.warehouseIds
        .map((id) => warehouseStore.getWarehouseName(id))
        .filter(Boolean)
        .join(', ');
      toastHelpers.success(
        'Триггер удален',
        warehouseNames ? `Склады: ${warehouseNames}` : undefined
      );
    } catch (err) {
      error.value = 'Failed to delete trigger';
      toastHelpers.error('Ошибка удаления', 'Не удалось удалить триггер');
      throw err;
    } finally {
      isDeleting.value = false;
      deletingId.value = null;
    }
  }

  async function toggleTrigger(triggerId: string): Promise<void> {
    const warehouseStore = useWarehousesStore();

    try {
      togglingId.value = triggerId;
      const updatedTrigger = await triggersAPI.toggleTrigger(triggerId);
      const index = triggers.value.findIndex((t) => t.id === triggerId);
      if (index !== -1 && updatedTrigger) {
        triggers.value[index] = updatedTrigger;

        // Clear cache since data has changed
        clearStatusCache();

        // Show success toast with activation status
        const warehouseNames = updatedTrigger.warehouseIds
          .map((id) => warehouseStore.getWarehouseName(id))
          .filter(Boolean)
          .join(', ');
        const statusText = updatedTrigger.isActive ? 'активирован' : 'деактивирован';
        toastHelpers.success(
          `Триггер ${statusText}`,
          warehouseNames ? `Склады: ${warehouseNames}` : undefined
        );
      }
    } catch (err: unknown) {
      console.error('Failed to toggle trigger:', err);
      error.value = 'Failed to toggle trigger';
      toastHelpers.error('Ошибка', 'Не удалось изменить статус триггера');
      throw err;
    } finally {
      togglingId.value = null;
    }
  }

  function setSelectedStatus(status: 'RELEVANT' | 'COMPLETED' | 'EXPIRED') {
    selectedStatus.value = status;
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  return {
    // State
    triggers,
    loading,
    deletingId,
    error,
    isCreating,
    // Action states
    isFetched,
    isUpdating,
    isDeleting,
    togglingId,
    // Status cache
    statusCache,
    fetchedStatuses,
    // Getters
    getTriggerById,
    isLoading,
    hasError,
    // Actions
    searchQuery,
    filteredTriggers,
    activeTriggersCount,
    relevantTriggersCount,
    completedTriggersCount,
    expiredTriggersCount,
    selectedStatus,
    create,
    updateTrigger,
    fetchTriggers,
    fetchDataIfNeeded,
    isStatusFetched,
    clearStatusCache,
    deleteTrigger,
    toggleTrigger,
    setSelectedStatus,
    setSearchQuery,
  };
});
