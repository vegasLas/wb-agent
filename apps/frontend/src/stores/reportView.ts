import { ref, readonly } from 'vue';
import { defineStore } from 'pinia';

export type ReportTab = 'charts' | 'suggestions';

export const useReportViewStore = defineStore('reportView', () => {
  // State
  const activeTab = ref<ReportTab>('charts');
  const chartType = ref<'line' | 'bar' | 'polar'>('line');
  const showHelp = ref(false);

  // Actions
  function setActiveTab(tab: ReportTab) {
    activeTab.value = tab;
  }

  function setChartType(type: 'line' | 'bar' | 'polar') {
    chartType.value = type;
  }

  function toggleHelp() {
    showHelp.value = !showHelp.value;
  }

  return {
    // State
    activeTab: readonly(activeTab),
    chartType: readonly(chartType),
    showHelp: readonly(showHelp),

    // Actions
    setActiveTab,
    setChartType,
    toggleHelp,
  };
});
