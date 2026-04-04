import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { useReportStore } from './report';
import type { ReportRequestParams, ReportTab } from '../types';

export type ReportViewType = 'charts' | 'suggestions' | 'daily-sales';

export const useReportViewStore = defineStore('reportView', () => {
  const reportStore = useReportStore();

  // State
  const activeTab = ref<ReportTab>('charts');
  const chartType = ref<'line' | 'bar' | 'polar'>('line');
  const showHelp = ref(false);

  // Date range state
  const dateRange = ref({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
  });
  const activeView = ref<ReportViewType>('charts');

  // Getters
  const pickerDateRangeArray = computed<[Date, Date]>(() => {
    return [dateRange.value.start, dateRange.value.end];
  });

  // Helper Functions
  const formatDateForAPI = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().substring(2);
    return `${day}.${month}.${year}`;
  };

  // Actions
  async function fetchReportData() {
    if (
      !(
        dateRange.value.start instanceof Date &&
        !isNaN(dateRange.value.start.valueOf())
      ) ||
      !(
        dateRange.value.end instanceof Date &&
        !isNaN(dateRange.value.end.valueOf())
      )
    ) {
      console.error('Invalid Date objects in dateRange', dateRange.value);
      return;
    }

    const params: ReportRequestParams = {
      dateFrom: formatDateForAPI(dateRange.value.start),
      dateTo: formatDateForAPI(dateRange.value.end),
    };

    await reportStore.getReport(params);
  }

  function setDateRange(payload: { start: Date | null; end: Date | null }) {
    if (payload.start && payload.end) {
      dateRange.value.start = payload.start;
      dateRange.value.end = payload.end;
    } else {
      // Reset to default if cleared or invalid
      const today = new Date();
      dateRange.value.start = new Date(
        new Date().setDate(today.getDate() - 30),
      );
      dateRange.value.end = new Date(new Date().setDate(today.getDate() - 1));
    }
    // Automatically fetch report when date range changes
    fetchReportData();
  }

  function setActiveView(view: ReportViewType) {
    activeView.value = view;
  }

  function setActiveTab(tab: ReportTab) {
    activeTab.value = tab;
  }

  function setChartType(type: 'line' | 'bar' | 'polar') {
    chartType.value = type;
  }

  function toggleHelp() {
    showHelp.value = !showHelp.value;
  }

  // Initialize by fetching data
  fetchReportData();

  return {
    // State
    activeTab: readonly(activeTab),
    chartType: readonly(chartType),
    showHelp: readonly(showHelp),
    dateRange: readonly(dateRange),
    activeView: readonly(activeView),
    pickerDateRangeArray,

    // Actions
    setActiveTab,
    setChartType,
    toggleHelp,
    setDateRange,
    setActiveView,
    fetchReportData,
  };
});
