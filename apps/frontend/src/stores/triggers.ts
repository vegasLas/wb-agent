import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import { useViewStore } from './view';
import { useWarehousesStore } from './warehouses';
import type { SupplyTrigger, CreateTriggerRequest } from '../types';

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
    try {
      isCreating.value = true;
      const response = await api.post('/triggers', data);
      const trigger = response.data as SupplyTrigger;
      if (trigger) {
        triggers.value.unshift(trigger);
      }
      useViewStore().setView('triggers-main');
      return trigger;
    } catch (err) {
      error.value = 'Failed to create trigger';
      throw err;
    } finally {
      isCreating.value = false;
    }
  }

  async function updateTrigger(data: Partial<SupplyTrigger> & { id: string }) {
    try {
      isUpdating.value = true;
      const response = await api.put(`/triggers/${data.id}`, data);
      const trigger = response.data as SupplyTrigger;
      if (trigger) {
        const index = triggers.value.findIndex((t) => t.id === data.id);
        if (index !== -1) {
          triggers.value[index] = trigger;
        }
      }
      return trigger;
    } catch (err) {
      error.value = 'Failed to update trigger';
      throw err;
    } finally {
      isUpdating.value = false;
    }
  }

  async function fetchTriggers() {
    try {
      loading.value = true;
      error.value = null;
      const response = await api.get('/triggers');
      if (response.data) {
        triggers.value = response.data.data || response.data;
      }
      return triggers.value;
    } catch (err) {
      error.value = 'Failed to fetch triggers';
      throw err;
    } finally {
      isFetched.value = true;
      loading.value = false;
    }
  }

  async function deleteTrigger(triggerId: string) {
    try {
      deletingId.value = triggerId;
      isDeleting.value = true;

      await api.delete(`/triggers/${triggerId}`);
      triggers.value = triggers.value.filter((t) => t.id !== triggerId);
    } catch (err) {
      error.value = 'Failed to delete trigger';
      throw err;
    } finally {
      isDeleting.value = false;
      deletingId.value = null;
    }
  }

  async function toggleTrigger(triggerId: string): Promise<void> {
    try {
      togglingId.value = triggerId;
      const response = await api.patch(`/triggers/${triggerId}/toggle`);
      const updatedTrigger = response.data as SupplyTrigger;
      const index = triggers.value.findIndex((t) => t.id === triggerId);
      if (index !== -1 && updatedTrigger) {
        triggers.value[index] = updatedTrigger;
      }
    } catch (err: unknown) {
      console.error('Failed to toggle trigger:', err);
      error.value = 'Failed to toggle trigger';
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
    deleteTrigger,
    toggleTrigger,
    setSelectedStatus,
    setSearchQuery,
  };
});
