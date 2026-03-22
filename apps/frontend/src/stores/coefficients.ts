import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';

export interface WarehouseCoefficient {
  id: string;
  warehouseId: number;
  warehouseName: string;
  maxCoefficient: number;
  date: string;
  supplyType: string;
  createdAt: string;
  updatedAt: string;
}

export const useCoefficientsStore = defineStore('coefficients', () => {
  const coefficients = ref<WarehouseCoefficient[]>([]);
  const loading = ref(false);

  async function loadCoefficients() {
    if (coefficients.value.length > 0 || loading.value) return;

    try {
      loading.value = true;
      const response = await api.get('/coefficients');
      coefficients.value = response.data as WarehouseCoefficient[];
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
    coefficients,
    loading,
    loadCoefficients,
    getMostRecentCoefficient,
    getLastThreeCoefficientDetails,
  };
});
