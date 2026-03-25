import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { paymentsAPI } from '../api';
import type { Tariff, Payment } from '../types';

export const usePaymentStore = defineStore('payment', () => {
  // State
  const tariffs = ref<Tariff[]>([]);
  const selectedTariff = ref<Tariff | null>(null);
  const payments = ref<Payment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  const hasSelectedTariff = computed(() => !!selectedTariff.value);

  const tariffCount = computed(() => tariffs.value.length);

  const getTariffById = computed(() => {
    return (id: string) => tariffs.value.find((t) => t.id === id);
  });

  // Actions
  async function fetchTariffs() {
    try {
      loading.value = true;
      error.value = null;
      const data = await paymentsAPI.fetchTariffs();
      tariffs.value = data;
      isFetched.value = true;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tariffs';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function selectTariff(tariff: Tariff | null) {
    selectedTariff.value = tariff;
  }

  function selectTariffById(id: string) {
    const tariff = tariffs.value.find((t) => t.id === id);
    selectedTariff.value = tariff || null;
  }

  async function createPayment(tariffId: string): Promise<Payment> {
    try {
      loading.value = true;
      error.value = null;
      const payment = await paymentsAPI.createPayment(tariffId);
      payments.value.unshift(payment);
      return payment;
    } catch (err: any) {
      error.value = err.message || 'Failed to create payment';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearSelection() {
    selectedTariff.value = null;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    tariffs: readonly(tariffs),
    selectedTariff: readonly(selectedTariff),
    payments: readonly(payments),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),

    // Getters
    hasSelectedTariff,
    tariffCount,
    getTariffById,

    // Actions
    fetchTariffs,
    selectTariff,
    selectTariffById,
    createPayment,
    clearSelection,
    clearError,
  };
});
