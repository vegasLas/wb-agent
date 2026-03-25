import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reschedulesAPI } from '../../api';
import type { Reschedule } from '../../types';

export const useReschedulesStore = defineStore('reschedules', () => {
  // State
  const reschedules = ref<Reschedule[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deletingId = ref<string | null>(null);

  // Getters
  const pendingReschedules = computed(() =>
    reschedules.value.filter((r) => r.status === 'pending')
  );

  const completedReschedules = computed(() =>
    reschedules.value.filter((r) => r.status === 'completed')
  );

  const failedReschedules = computed(() =>
    reschedules.value.filter((r) => r.status === 'failed')
  );

  const rescheduleCount = computed(() => reschedules.value.length);

  const getRescheduleById = computed(() => {
    return (id: string) => reschedules.value.find((r) => r.id === id);
  });

  // Actions
  async function fetchReschedules() {
    try {
      loading.value = true;
      error.value = null;
      const data = await reschedulesAPI.fetchReschedules();
      reschedules.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch reschedules';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteReschedule(id: string) {
    try {
      deletingId.value = id;
      await reschedulesAPI.deleteReschedule(id);
      reschedules.value = reschedules.value.filter((r) => r.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete reschedule';
      throw err;
    } finally {
      deletingId.value = null;
    }
  }

  function addReschedule(reschedule: Reschedule) {
    reschedules.value.unshift(reschedule);
  }

  function updateRescheduleInList(id: string, updates: Partial<Reschedule>) {
    const index = reschedules.value.findIndex((r) => r.id === id);
    if (index !== -1) {
      reschedules.value[index] = { ...reschedules.value[index], ...updates };
    }
  }

  return {
    // State
    reschedules: readonly(reschedules),
    loading: readonly(loading),
    error: readonly(error),
    deletingId: readonly(deletingId),

    // Getters
    pendingReschedules,
    completedReschedules,
    failedReschedules,
    rescheduleCount,
    getRescheduleById,

    // Actions
    fetchReschedules,
    deleteReschedule,
    addReschedule,
    updateRescheduleInList,
  };
});
