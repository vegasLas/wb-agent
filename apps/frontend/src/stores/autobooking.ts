import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { autobookingAPI } from '../api';
import type { Autobooking } from '../types';

export const useAutobookingStore = defineStore('autobooking', () => {
  // State
  const autobookings = ref<Autobooking[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const togglingId = ref<string | null>(null);

  // Getters
  const activeAutobookings = computed(() =>
    autobookings.value.filter((a) => a.enabled)
  );

  const inactiveAutobookings = computed(() =>
    autobookings.value.filter((a) => !a.enabled)
  );

  const autobookingCount = computed(() => autobookings.value.length);

  const getAutobookingById = computed(() => {
    return (id: string) => autobookings.value.find((a) => a.id === id);
  });

  // Actions
  async function fetchAutobookings() {
    try {
      loading.value = true;
      error.value = null;
      const data = await autobookingAPI.fetchAutobookings();
      autobookings.value = data;
      return data;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch autobookings';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAutobooking(id: string) {
    try {
      deletingId.value = id;
      await autobookingAPI.deleteAutobooking(id);
      autobookings.value = autobookings.value.filter((a) => a.id !== id);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete autobooking';
      error.value = errorMsg;
      throw err;
    } finally {
      deletingId.value = null;
    }
  }

  async function toggleAutobooking(id: string, enabled: boolean) {
    try {
      togglingId.value = id;
      await autobookingAPI.toggleAutobooking(id, enabled);
      const autobooking = autobookings.value.find((a) => a.id === id);
      if (autobooking) {
        autobooking.enabled = enabled;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle autobooking';
      error.value = errorMsg;
      throw err;
    } finally {
      togglingId.value = null;
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

    // Getters
    activeAutobookings,
    inactiveAutobookings,
    autobookingCount,
    getAutobookingById,

    // Actions
    fetchAutobookings,
    deleteAutobooking,
    toggleAutobooking,
    addAutobooking,
    updateAutobookingInList,
  };
});
