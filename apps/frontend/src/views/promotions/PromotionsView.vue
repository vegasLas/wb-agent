<template>
  <div class="min-h-screen bg-theme">
    <!-- Header with Date Navigation -->
    <div
      class="hidden sm:block sticky top-0 z-30 bg-theme border-b border-[var(--color-border)] px-4 py-3"
    >
      <div class="flex items-center justify-between">
        <!-- Date Navigation -->
        <div class="hidden sm:flex items-center gap-2">
          <Button
            icon="pi pi-chevron-left"
            severity="secondary"
            text
            size="small"
            @click="p.navigateMonth(-1)"
          />
          <span
            class="text-sm text-[var(--color-text)] min-w-[140px] text-center"
          >
            {{ p.currentMonthLabel.value }}
          </span>
          <Button
            icon="pi pi-chevron-right"
            severity="secondary"
            text
            size="small"
            @click="p.navigateMonth(1)"
          />
          <div class="text-sm text-[var(--text-secondary)] ml-4">
            Сегодня: {{ p.todayLabel.value }}
          </div>
        </div>

        <!-- Filter Buttons (Desktop) -->
        <PromotionFilterBar
          :tabs="p.filterTabs"
          :current-filter="p.currentFilter.value"
          :counts="p.participationCounts.value"
          @set-filter="p.setFilter"
        />
      </div>
    </div>

    <!-- Mobile Date Navigation -->
    <div
      class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]"
    >
      <Button
        icon="pi pi-chevron-left"
        severity="secondary"
        text
        size="small"
        @click="p.navigateMonth(-1)"
      />
      <span class="text-sm text-[var(--color-text)]">
        {{ p.currentMonthLabel.value }}
      </span>
      <Button
        icon="pi pi-chevron-right"
        severity="secondary"
        text
        size="small"
        @click="p.navigateMonth(1)"
      />
    </div>

    <!-- Mobile Filter Buttons -->
    <PromotionFilterBar
      :tabs="p.filterTabs"
      :current-filter="p.currentFilter.value"
      :counts="p.participationCounts.value"
      @set-filter="p.setFilter"
    />

    <!-- Main Content -->
    <div class="p-4">
      <!-- Loading State -->
      <div
        v-if="p.loading.value"
        class="flex flex-col items-center justify-center py-20"
      >
        <i class="pi pi-refresh animate-spin text-5xl text-[var(--promo-primary)] mb-4" />
        <p class="text-[var(--text-muted)]">Загрузка акций...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="p.error.value" class="text-center py-16 px-4">
        <div
          class="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 max-w-md mx-auto"
        >
          <i class="pi pi-exclamation-circle text-red-500 text-4xl mb-3" />
          <p class="text-red-600 dark:text-red-400">
            {{ p.error.value }}
          </p>
          <Button class="mt-4" severity="primary" @click="p.refreshData">
            <i class="pi pi-refresh mr-2" />
            Повторить
          </Button>
        </div>
      </div>

      <!-- Promotions Timeline -->
      <PromotionTimelineGrid
        v-else
        :promotions="allPromotions"
        :current-month-days-list="p.currentMonthDaysList.value"
        :next-month-days-list="p.nextMonthDaysList.value"
        :visible-months="p.visibleMonths.value"
        :current-month-date="p.currentDate.value"
        :column-width="p.columnWidth"
        :expanded-ids="expandedIdsSet"
        :selected-promotion-id="p.selectedPromotionId.value"
        :detail-loading="p.detailLoading.value"
        :goods-loading="p.goodsLoading.value"
        :empty-icon="p.emptyState.value.icon"
        :empty-message="p.emptyState.value.message"
        :is-today="p.isToday"
        :get-promotion-style="p.getPromotionStyle"
        :group-promotions-into-rows="p.groupPromotionsIntoRows"
        @toggle-expand="toggleExpand"
        @show-details="p.handleShowDetails"
        @show-participants="handleShowParticipants"
      />
    </div>

    <!-- Promotion Detail Dialog -->
    <PromotionDetailDialog
      v-model:show="p.showDetailDialog.value"
      :promotion-name="p.selectedPromotion.value?.name"
      :detail="p.promotionDetail.value"
      :detail-loading="p.detailLoading.value"
      :detail-error="p.detailError.value"
    />

    <!-- Promotion Participants Dialog -->
    <PromotionParticipantsDialog
      v-model:show="p.showParticipantsDialog.value"
      :promotion-name="p.selectedPromotion.value?.name"
      :goods-items="p.goodsItems.value as PromotionGoodsItem[]"
      :goods-loading="p.goodsLoading.value"
      :goods-error="p.goodsError.value"
      :report-pending="p.reportPending.value"
      :is-recovery="participantsIsRecovery"
      :can-edit="canEditPromotion"
      :timeline-participating-count="timelineParticipatingCount"
      :timeline-not-participating-count="timelineNotParticipatingCount"
      @retry="handleParticipantsRetry"
      @apply-management="handleApplyManagement"
      @switch-mode="handleSwitchMode"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import Button from 'primevue/button';
import {
  usePromotionsUnified,
  useViewReady,
  isPromotionEditable,
} from '../../composables';
import { usePromotionsStore } from '@/stores/promotions';
import PromotionFilterBar from '@/components/promotions/PromotionFilterBar.vue';
import PromotionTimelineGrid from '@/components/promotions/PromotionTimelineGrid.vue';
import PromotionDetailDialog from './PromotionDetailDialog.vue';
import PromotionParticipantsDialog from './PromotionParticipantsDialog.vue';
import type { PromotionItem, PromotionGoodsItem } from '../../types';

const { viewReady } = useViewReady();

const p = usePromotionsUnified({
  initialFilter: 'AVAILABLE',
  immediate: false,
});

const promotionsStore = usePromotionsStore();

// Recovery mode for participants dialog
const participantsIsRecovery = ref(true);

// Check if promotion can be edited
const canEditPromotion = computed(() => {
  const promotion = p.selectedPromotion.value;
  return promotion ? isPromotionEditable(promotion) : false;
});

// Track expanded promotion cards (only one at a time)
const expandedPromoId = ref<number | null>(null);

const expandedIdsSet = computed(() =>
  expandedPromoId.value !== null ? new Set([expandedPromoId.value]) : new Set(),
);

function toggleExpand(promoID: number) {
  expandedPromoId.value = expandedPromoId.value === promoID ? null : promoID;
}

// Timeline counts for the selected promotion
const timelineParticipatingCount = computed(() => {
  return p.selectedPromotion.value?.participation?.counts?.participating ?? 0;
});

const timelineNotParticipatingCount = computed(() => {
  const counts = p.selectedPromotion.value?.participation?.counts;
  if (!counts) return 0;
  return counts.available;
});

// Handle show participants with isRecovery flag
function handleShowParticipants(promoID: number) {
  const promotion = p.promotions.value.find((p) => p.promoID === promoID);
  // Default to 'Участвуют' if it has items, otherwise fall back to 'Не участвуют'
  const isRecovery = promotion
    ? (promotion.participation?.counts?.participating ?? 0) > 0
    : true;
  participantsIsRecovery.value = isRecovery;
  p.handleShowParticipants(promoID);
}

// Handle switch mode from dialog buttons
function handleSwitchMode(isRecovery: boolean) {
  participantsIsRecovery.value = isRecovery;
  const promoID = p.selectedPromotionId.value;
  if (promoID) {
    p.handleShowParticipants(promoID);
  }
}

// Handle retry with current isRecovery mode
async function handleParticipantsRetry() {
  const promoID = p.selectedPromotionId.value;
  if (promoID) {
    await promotionsStore.fetchGoods(promoID);
  }
}

// Handle apply recovery
async function handleApplyManagement(
  selectedItems: string[],
  isRecovery: boolean,
) {
  const success = await p.applyManagement(selectedItems, isRecovery);
  if (success) {
    p.showParticipantsDialog.value = false;
    await p.refreshData();
  }
}

// All promotions from API
const allPromotions = computed(() => [...p.promotions.value]);

onMounted(async () => {
  await p.refreshData();
  viewReady();
});
</script>

<style scoped>
.promotion-card-wrapper {
  transition: all 0.2s ease;
}

.promotion-card-wrapper.expanded {
  z-index: 100 !important;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overflow-x-auto {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.8);
}
</style>
