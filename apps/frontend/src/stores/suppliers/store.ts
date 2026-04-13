import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { suppliersAPI, type WarehouseBalance } from '@/api';
import { useUserStore } from '@/stores/user';
import type { SupplierInfo } from './types';

export const useSupplierStore = defineStore('supplier', () => {
  // State
  const supplierInfo = ref<SupplierInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Warehouse balances state (array of warehouse balances)
  const warehouseBalances = ref<WarehouseBalance[]>([]);
  const loadingBalances = ref(false);
  const balancesError = ref<string | null>(null);

  // Getters
  const hasSupplier = computed(() => !!supplierInfo.value);

  const supplierName = computed(() => supplierInfo.value?.name || '');

  const getBalancesForWarehouse = computed(() => {
    return (warehouseId: number) => {
      const warehouseBalance = warehouseBalances.value.find(
        (wb) => wb.warehouseId === warehouseId,
      );
      return warehouseBalance?.goods || [];
    };
  });

  // Actions
  async function fetchSupplierInfo() {
    try {
      loading.value = true;
      error.value = null;
      const data = await suppliersAPI.fetchSupplierInfo();
      supplierInfo.value = data;
      isFetched.value = true;
      return data;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch supplier info';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchWarehouseBalances(accountId?: string) {
    try {
      loadingBalances.value = true;
      balancesError.value = null;

      // If no accountId provided, use the current user's selected account
      const userStore = useUserStore();
      const effectiveAccountId = accountId ?? userStore.selectedAccount?.id;

      const data = await suppliersAPI.fetchWarehouseBalances(effectiveAccountId);
      warehouseBalances.value = data || [];
      return data;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to fetch warehouse balances';
      balancesError.value = errorMsg;
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
