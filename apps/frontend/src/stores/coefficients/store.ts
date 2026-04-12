import { ref, readonly } from 'vue';
import { defineStore } from 'pinia';
import { coefficientsAPI } from '@/api';
import type { Coefficient, WarehouseCoefficient } from './types';

// Map WB API coefficient types to our internal supply types
const BOX_TYPE_MAP: Record<number, string> = {
  2: 'BOX',
  3: 'MONOPALLETE',
  4: 'SUPERSAFE',
};

export const useCoefficientsStore = defineStore('coefficients', () => {
  const coefficients = ref<WarehouseCoefficient[]>([]);
  const loading = ref(false);

  async function loadCoefficients(warehouseIDs?: number[]) {
    if (loading.value) return;

    try {
      loading.value = true;
      const data = await coefficientsAPI.fetchCoefficients(warehouseIDs);

      // Transform WB API response to internal format
      coefficients.value = data.map((item: Coefficient) => ({
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        maxCoefficient: item.coefficient,
        date: item.date,
        supplyType: BOX_TYPE_MAP[item.boxTypeId] || String(item.boxTypeId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching coefficients:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function getMostRecentCoefficient(
    warehouseId: number,
    supplyType: string,
  ): WarehouseCoefficient | null {
    if (!warehouseId || !supplyType) {
      return null;
    }
    const relevantCoefficients = coefficients.value.filter(
      (c) => c.warehouseId === warehouseId && c.supplyType === supplyType,
    );
    if (relevantCoefficients.length === 0) {
      return null;
    }

    // Sort by date in descending order (newest first)
    return relevantCoefficients.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
  }

  function getLastThreeCoefficientDetails(
    warehouseId: number,
    supplyType: string,
  ): Array<{
    date: string;
    createdAt: string;
    updatedAt: string;
    maxCoefficient: number;
  }> {
    if (!warehouseId || !supplyType) {
      return [];
    }
    const relevantCoefficients = coefficients.value.filter(
      (c) => c.warehouseId === warehouseId && c.supplyType === supplyType,
    );
    if (relevantCoefficients.length === 0) {
      return [];
    }

    // Sort by createdAt in descending order (newest first) and take last 3
    return relevantCoefficients
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 3)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((c) => ({
        date: c.date,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        maxCoefficient: c.maxCoefficient,
      }));
  }

  return {
    coefficients: readonly(coefficients),
    loading: readonly(loading),
    loadCoefficients,
    getMostRecentCoefficient,
    getLastThreeCoefficientDetails,
  };
});
