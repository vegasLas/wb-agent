import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { warehousesAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type { Warehouse, TransitItem } from './types';

export const useWarehousesStore = defineStore('warehouses', () => {
  const warehouses = ref<Warehouse[]>([]);
  const transitWarehouses = ref<TransitItem[]>([]);
  const loading = ref(false);
  const isFetched = ref(false);

  function getWarehouseName(warehouseId: number) {
    return (
      warehouses.value.find((w) => w.ID === warehouseId)?.name ??
      String(warehouseId)
    );
  }

  async function fetchWarehouses() {
    if (warehouses.value.length > 0 || loading.value) return;

    loading.value = true;
    try {
      const data = await warehousesAPI.fetchWarehouses();
      warehouses.value = data;
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      // Don't throw - allow app to continue even if warehouses fail to load
    } finally {
      isFetched.value = true;
      loading.value = false;
    }
  }

  async function fetchTransits(warehouseId: number) {
    loading.value = true;
    try {
      const userStore = useUserStore();
      const accountId = userStore.selectedAccount?.id;
      if (!accountId) {
        console.error('No account selected');
        transitWarehouses.value = [];
        return;
      }

      const data = await warehousesAPI.fetchTransits(accountId, warehouseId);
      transitWarehouses.value = data;
    } catch (error) {
      console.error('Failed to fetch transits:', error);
      transitWarehouses.value = [];
    } finally {
      loading.value = false;
    }
  }

  const transitOptions = computed(() =>
    transitWarehouses.value.map((transit) => ({
      label: `${transit.transitWarehouseName}`,
      value: transit.transitWarehouseId,
      disabled:
        !transit.storeBox && !transit.storePallet && !transit.storeSupersafe,
    })),
  );

  return {
    warehouses: readonly(warehouses),
    transitWarehouses: readonly(transitWarehouses),
    loading: readonly(loading),
    transitOptions,
    isFetched: readonly(isFetched),
    fetchWarehouses,
    fetchTransits,
    getWarehouseName,
  };
});
