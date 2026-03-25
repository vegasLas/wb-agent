import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { supplierAPI } from '../api';
import type { SupplierInfo } from '../types';

export const useSupplierStore = defineStore('supplier', () => {
  // State
  const supplierInfo = ref<SupplierInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  const hasSupplier = computed(() => !!supplierInfo.value);

  const supplierName = computed(() => supplierInfo.value?.name || '');

  // Actions
  async function fetchSupplierInfo() {
    try {
      loading.value = true;
      error.value = null;
      const data = await supplierAPI.fetchSupplierInfo();
      supplierInfo.value = data;
      isFetched.value = true;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch supplier info';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearSupplierInfo() {
    supplierInfo.value = null;
    isFetched.value = false;
    error.value = null;
  }

  return {
    // State
    supplierInfo: readonly(supplierInfo),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),

    // Getters
    hasSupplier,
    supplierName,

    // Actions
    fetchSupplierInfo,
    clearSupplierInfo,
  };
});
