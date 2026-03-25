import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { supplyDetailsAPI } from '../api';
import type { SupplyDetails } from '../types';

export const useSupplyDetailsStore = defineStore('supplyDetails', () => {
  // State
  const supplyDetails = ref<Map<string, SupplyDetails>>(new Map());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentSupplyId = ref<string | null>(null);

  // Getters
  const currentDetails = computed(() =>
    currentSupplyId.value ? supplyDetails.value.get(currentSupplyId.value) : null
  );

  const getDetailsById = computed(() => {
    return (id: string) => supplyDetails.value.get(id);
  });

  const isCached = computed(() => {
    return (id: string) => supplyDetails.value.has(id);
  });

  // Actions
  async function fetchSupplyDetails(supplyId: string) {
    // Return cached data if available
    if (supplyDetails.value.has(supplyId)) {
      currentSupplyId.value = supplyId;
      return supplyDetails.value.get(supplyId);
    }

    try {
      loading.value = true;
      error.value = null;
      const data = await supplyDetailsAPI.fetchSupplyDetails(supplyId);
      supplyDetails.value.set(supplyId, data);
      currentSupplyId.value = supplyId;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch supply details';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function setCurrentSupplyId(supplyId: string | null) {
    currentSupplyId.value = supplyId;
  }

  function clearCache() {
    supplyDetails.value.clear();
    currentSupplyId.value = null;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    loading: readonly(loading),
    error: readonly(error),
    currentSupplyId: readonly(currentSupplyId),

    // Getters
    currentDetails,
    getDetailsById,
    isCached,

    // Actions
    fetchSupplyDetails,
    setCurrentSupplyId,
    clearCache,
    clearError,
  };
});
