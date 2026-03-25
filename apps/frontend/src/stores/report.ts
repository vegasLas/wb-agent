import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reportsAPI } from '../api';
import type { Report } from '../types';

export const useReportStore = defineStore('report', () => {
  // State
  const report = ref<Report | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  const totalBookings = computed(() => report.value?.totalBookings || 0);

  const bookingsByMonth = computed(() => report.value?.bookingsByMonth || []);

  const warehouseStats = computed(() => report.value?.warehouseStats || []);

  const coefficientStats = computed(() => report.value?.coefficientStats || []);

  const warehouseSuggestions = computed(() => report.value?.warehouseSuggestions || []);

  const hasData = computed(() => !!report.value && totalBookings.value > 0);

  const hasSuggestions = computed(() => warehouseSuggestions.value.length > 0);

  // Actions
  async function fetchReport() {
    try {
      loading.value = true;
      error.value = null;
      const data = await reportsAPI.fetchReport();
      report.value = data;
      isFetched.value = true;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch report';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearReport() {
    report.value = null;
    isFetched.value = false;
    error.value = null;
  }

  return {
    // State
    report: readonly(report),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),

    // Getters
    totalBookings,
    bookingsByMonth,
    warehouseStats,
    coefficientStats,
    warehouseSuggestions,
    hasData,
    hasSuggestions,

    // Actions
    fetchReport,
    clearReport,
  };
});
