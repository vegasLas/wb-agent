import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import { useViewStore } from './view';
import type { Trigger } from '../types';

export const useTriggerStore = defineStore('triggers', () => {
  // state
  const triggers = ref<Trigger[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const searchQuery = ref('');
  const isCreating = ref(false);
  const selectedStatus = ref<'RELEVANT' | 'COMPLETED' | 'EXPIRED'>('RELEVANT');

  // action states
  const isFetched = ref(false);
  const isUpdating = ref(false);
  const isDeleting = ref(false);
  const togglingId = ref<string | null>(null);

  // getters
  const getTriggerById = computed(() => {
    return (triggerId: string) =>
      triggers.value.find((t) => t.id === Number(triggerId));
  });

  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);

  const filteredTriggers = computed(() => {
    let filtered = triggers.value;

    // Filter by status
    filtered = filtered.filter(
      (trigger) => trigger.status === selectedStatus.value,
    );

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

  // actions
  async function create(data: Omit<Trigger, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      isCreating.value = true;
      const response = await api.post('/triggers', data);
      const trigger = response.data as Trigger;
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

  async function updateTrigger(data: Partial<Trigger> & { id: number }) {
    try {
      isUpdating.value = true;
      const response = await api.put(`/triggers/${data.id}`, data);
      const trigger = response.data as Trigger;
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
      const response = await api.get('/triggers');
      if (response.data) {
        triggers.value = response.data;
      }
      return response.data;
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
      triggers.value = triggers.value.filter((t) => t.id !== Number(triggerId));
    } catch (err) {
      error.value = 'Failed to delete trigger';
      throw err;
    } finally {
      loading.value = false;
      isDeleting.value = false;
      deletingId.value = null;
    }
  }

  async function toggleTrigger(triggerId: string): Promise<void> {
    try {
      loading.value = true;
      togglingId.value = triggerId;
      const response = await api.patch(`/triggers/${triggerId}/toggle`);
      const updatedTrigger = response.data as Trigger;
      const index = triggers.value.findIndex((t) => t.id === Number(triggerId));
      if (index !== -1 && updatedTrigger) {
        triggers.value[index] = updatedTrigger;
      }
    } catch (err: any) {
      error.value = 'Failed to toggle trigger';
      throw err;
    } finally {
      loading.value = false;
      togglingId.value = null;
    }
  }

  function setSelectedStatus(status: 'RELEVANT' | 'COMPLETED' | 'EXPIRED') {
    selectedStatus.value = status;
  }

  return {
    // state
    triggers,
    loading,
    deletingId,
    error,
    isCreating,
    // action states
    isFetched,
    isUpdating,
    isDeleting,
    togglingId,
    // getters
    getTriggerById,
    isLoading,
    hasError,
    // actions
    searchQuery,
    filteredTriggers,
    activeTriggersCount,
    selectedStatus,
    relevantTriggersCount,
    completedTriggersCount,
    expiredTriggersCount,
    create,
    updateTrigger,
    fetchTriggers,
    deleteTrigger,
    toggleTrigger,
    setSelectedStatus,
  };
});
