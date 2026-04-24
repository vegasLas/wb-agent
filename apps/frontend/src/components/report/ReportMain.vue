<template>
  <div class="report-main">
    <!-- Loading skeleton -->
    <div v-if="reportStore.loading">
      <SkeletonReport />
    </div>

    <div v-else class="space-y-6">
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'px-4 py-2 font-medium transition-colors',
            reportViewStore.activeView === tab.id
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          ]"
          @click="reportViewStore.setActiveView(tab.id)"
        >
          <i :class="['mr-1', tab.icon]" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <ReportCharts
          v-if="reportViewStore.activeView === 'charts'"
          :items-by-warehouse="reportStore.itemsByWarehouse"
          :data="reportDataTyped"
          :error="reportStore.error"
          :loading="reportStore.loading"
          :report-pending="reportStore.reportPending"
          :estimated-wait-time="reportStore.estimatedWaitTime"
          @retry="reportViewStore.fetchReportData()"
        />
        <WarehouseSuggestions
          v-else-if="reportViewStore.activeView === 'suggestions'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useReportStore } from '@/stores/reports';
import { useReportViewStore } from '@/stores/reports';
import ReportCharts from './ReportCharts.vue';
import WarehouseSuggestions from './WarehouseSuggestions.vue';
import SkeletonReport from '../skeleton/SkeletonReport.vue';
import type { ReportParsedData } from '@/types';

const reportStore = useReportStore();
const reportViewStore = useReportViewStore();

const reportDataTyped = computed<ReportParsedData | null>(() => {
  return reportStore.data as ReportParsedData | null;
});

const tabs = [
  { id: 'charts' as const, label: 'Графики', icon: 'pi pi-chart-pie' },
  { id: 'suggestions' as const, label: 'Рекомендации', icon: 'pi pi-lightbulb' },
];
</script>
