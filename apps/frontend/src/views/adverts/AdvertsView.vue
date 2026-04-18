<template>
  <div class="space-y-4">
    <!-- Stats Cards -->
    <AdvertsStatsCards
      :total-count="advertsStore.totalCount"
      :pause-count="advertsStore.pauseCount"
    />

    <!-- Error Message -->
    <ErrorMessage
      v-if="advertsStore.error"
      :message="advertsStore.error"
    />

    <!-- Loading Spinner -->
    <LoadingSpinner v-if="advertsStore.loading" />

    <!-- Adverts Table -->
    <AdvertsTable
      v-else-if="advertsStore.hasAdverts"
      :adverts="advertsStore.adverts"
      :total-count="advertsStore.totalCount"
      :current-page="advertsStore.currentPage"
      :page-size="advertsStore.pageSize"
      :total-pages="advertsStore.totalPages"
      @show-info="openPresetInfo"
      @page-change="onPageChange"
    />

    <!-- Empty State -->
    <EmptyState
      v-else
      icon="pi pi-megaphone"
      message="Нет рекламных кампаний"
    />

    <!-- Preset Info Dialog -->
    <AdvertPresetDialog
      v-model:visible="showPresetDialog"
      :title="presetDialogTitle"
      :loading="advertsStore.presetLoading"
      :error="advertsStore.presetError"
      :has-preset-info="advertsStore.hasPresetInfo"
      :preset-info="advertsStore.presetInfo"
      :preset-total-count="advertsStore.presetTotalCount"
      :preset-current-page="advertsStore.presetCurrentPage"
      :preset-page-size="advertsStore.presetPageSize"
      :preset-total-pages="advertsStore.presetTotalPages"
      :active-filter="advertsStore.presetFilterState"
      @page-change="onPresetPageChange"
      @filter-state-change="onPresetFilterStateChange"
      @hide="onDialogHide"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAdvertsStore } from '@/stores/adverts';
import {
  AdvertsStatsCards,
  AdvertsTable,
  AdvertPresetDialog,
  ErrorMessage,
  LoadingSpinner,
  EmptyState,
} from '@/components/adverts';
import type { AdvertItem } from '@/stores/adverts';

const advertsStore = useAdvertsStore();

// Dialog state
const showPresetDialog = ref(false);
const selectedAdvert = ref<AdvertItem | null>(null);

const presetDialogTitle = computed(() => {
  if (selectedAdvert.value) {
    return `Статистика: ${selectedAdvert.value.campaign_name} (ID: ${selectedAdvert.value.id})`;
  }
  return 'Статистика кампании';
});

// Event handlers
function onPageChange(page: number, rows: number) {
  advertsStore.fetchAdverts(page, rows, advertsStore.filterState);
}

function onPresetPageChange(page: number, rows: number) {
  if (selectedAdvert.value) {
    advertsStore.fetchPresetInfo(
      selectedAdvert.value.id,
      selectedAdvert.value.top_nm,
      page,
      rows,
      advertsStore.presetFilterState,
    );
  }
}

function onPresetFilterStateChange(state: number) {
  if (selectedAdvert.value) {
    advertsStore.fetchPresetInfo(
      selectedAdvert.value.id,
      selectedAdvert.value.top_nm,
      1,
      advertsStore.presetPageSize,
      state,
    );
  }
}

async function openPresetInfo(advert: AdvertItem) {
  selectedAdvert.value = advert;
  showPresetDialog.value = true;
  await advertsStore.fetchPresetInfo(advert.id, advert.top_nm, 1, 20, 1);
}

function onDialogHide() {
  advertsStore.clearPresetInfo();
  selectedAdvert.value = null;
}

onMounted(() => {
  advertsStore.fetchAdverts(1, 10);
});
</script>
