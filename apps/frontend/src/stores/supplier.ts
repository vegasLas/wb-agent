import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { supplierAPI, type GoodBalance } from '../api';
import type { SupplierInfo } from '../types';

export const useSupplierStore = defineStore('supplier', () => {
  // State
  const supplierInfo = ref<SupplierInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  
  // Warehouse balances state
  const warehouseBalances = ref<GoodBalance[]>([]);
  const loadingBalances = ref(false);
  const balancesError = ref<string | null>(null);

  // Getters
  const hasSupplier = computed(() => !!supplierInfo.value);

  const supplierName = computed(() => supplierInfo.value?.name || '');
  
  const getBalancesForWarehouse = computed(() => {
    return (warehouseId: number) => {
      return warehouseBalances.value;
    };
  });

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

  async function fetchWarehouseBalances(supplierId?: string) {
    try {
      loadingBalances.value = true;
      balancesError.value = null;
      const data = await supplierAPI.fetchWarehouseBalances(supplierId);
      warehouseBalances.value = data;
      return data;
    } catch (err: any) {
      balancesError.value = err.message || 'Failed to fetch warehouse balances';
      throw err;
    } finally {
      loadingBalances.value = false;
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
    warehouseBalances: readonly(warehouseBalances),
    loadingBalances: readonly(loadingBalances),
    balancesError: readonly(balancesError),

    // Getters
    hasSupplier,
    supplierName,
    getBalancesForWarehouse,

    // Actions
    fetchSupplierInfo,
    fetchWarehouseBalances,
    clearSupplierInfo,
  };
});
