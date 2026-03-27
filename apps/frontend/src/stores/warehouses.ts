import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { warehousesAPI } from '../api';
import { useUserStore } from './user';

export interface Warehouse {
  ID: number;
  name: string;
  address?: string;
  isActive: boolean;
}

export interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
}

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
    if (warehouses.value.length > 0) return;

    const userStore = useUserStore();
    const accountId = userStore.selectedAccount?.id;
    if (!accountId) {
      console.error('No account selected');
      return;
    }

    const data = await warehousesAPI.fetchWarehouses(accountId);
    warehouses.value = data;
    isFetched.value = true;
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
    warehouses,
    transitWarehouses,
    loading,
    transitOptions,
    isFetched,
    fetchWarehouses,
    fetchTransits,
    getWarehouseName,
  };
});
