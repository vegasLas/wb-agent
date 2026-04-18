<template>
  <div class="min-h-screen bg-deep-bg">
    <!-- Header with Date Navigation -->
    <div
      class="hidden sm:block sticky top-0 z-30 bg-deep-bg border-b border-deep-border px-4 py-3"
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
        <div class="hidden sm:flex items-center gap-2">
          <Button
            v-for="tab in p.filterTabs"
            :key="tab.value"
            :severity="
              p.currentFilter.value === tab.value ? 'primary' : 'secondary'
            "
            :text="p.currentFilter.value !== tab.value"
            size="small"
            @click="p.setFilter(tab.value)"
          >
            <span>{{ tab.label }}</span>
            <span
              class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
              :class="
                p.currentFilter.value === tab.value
                  ? 'bg-theme/20 text-theme'
                  : 'bg-elevated text-muted'
              "
            >
              {{ p.participationCounts.value[tab.value] }}
            </span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Mobile Date Navigation -->
    <div
      class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-deep-border"
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

    <!-- Filter Buttons (Mobile) -->
    <div
      class="sm:hidden flex items-center justify-center gap-3 px-4 py-2 border-b border-deep-border bg-deep-card"
    >
      <OverlayBadge
        v-for="tab in p.filterTabs"
        :key="tab.value"
        :value="p.participationCounts.value[tab.value]"
        :severity="
          p.currentFilter.value === tab.value ? 'primary' : 'secondary'
        "
        size="small"
      >
        <Button
          :severity="
            p.currentFilter.value === tab.value ? 'primary' : 'secondary'
          "
          :text="p.currentFilter.value !== tab.value"
          size="small"
          :label="tab.label"
          class="text-xs"
          @click="p.setFilter(tab.value)"
        />
      </OverlayBadge>
    </div>

    <!-- Main Content -->
    <div class="p-4">
      <!-- Loading State -->
      <div
        v-if="p.loading.value"
        class="flex flex-col items-center justify-center py-20"
      >
        <i class="pi pi-refresh animate-spin text-5xl text-[#6A39F4] mb-4" />
        <p class="text-[var(--text-muted)]">
          Загрузка акций...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="p.error.value"
        class="text-center py-16 px-4"
      >
        <div
          class="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 max-w-md mx-auto"
        >
          <i class="pi pi-exclamation-circle text-red-500 text-4xl mb-3" />
          <p class="text-red-600 dark:text-red-400">
            {{ p.error.value }}
          </p>
          <Button
            class="mt-4"
            severity="primary"
            @click="p.refreshData"
          >
            <i class="pi pi-refresh mr-2" />
            Повторить
          </Button>
        </div>
      </div>

      <!-- Promotions Timeline -->
      <div
        v-else
        class="promotions-timeline -mx-4"
      >
        <!-- Horizontal Scrollable Container -->
        <div class="overflow-x-auto pb-4">
          <div class="min-w-[1200px] px-4">
            <!-- Two Month Headers -->
            <div class="flex mb-2">
              <div
                class="text-center flex-shrink-0"
                :style="{
                  width: timeline.currentMonthDaysList.value.length * 40 + 'px',
                }"
              >
                <h2
                  class="text-base font-semibold text-[var(--color-text)] capitalize"
                >
                  {{ timeline.visibleMonthsInfo.value[0]?.label }}
                </h2>
              </div>
              <div
                class="text-center flex-shrink-0"
                :style="{
                  width: timeline.nextMonthDaysList.value.length * 40 + 'px',
                }"
              >
                <h2
                  class="text-base font-semibold text-[var(--color-text)] capitalize"
                >
                  {{ timeline.visibleMonthsInfo.value[1]?.label }}
                </h2>
              </div>
            </div>

            <!-- Dates Row -->
            <div class="flex mb-1 border-b border-deep-border">
              <!-- Current Month Dates -->
              <div
                v-for="day in timeline.currentMonthDaysList.value"
                :key="`date-c-${day}`"
                class="w-10 flex-shrink-0 text-center py-2 border-r border-deep-border"
                :class="{
                  'bg-[#6A39F4]/10': timeline.isToday(
                    timeline.currentMonthInfo.value.date,
                    day,
                  ),
                }"
              >
                <span
                  class="text-xs"
                  :class="
                    timeline.isToday(timeline.currentMonthInfo.value.date, day)
                      ? 'text-[#6A39F4] font-semibold'
                      : 'text-[var(--text-muted)]'
                  "
                >
                  {{ day }}
                </span>
              </div>
              <!-- Next Month Dates -->
              <div
                v-for="day in timeline.nextMonthDaysList.value"
                :key="`date-n-${day}`"
                class="w-10 flex-shrink-0 text-center py-2 border-r border-deep-border last:border-r-0"
                :class="{
                  'bg-[#6A39F4]/10': timeline.isToday(
                    timeline.nextMonthInfo.value.date,
                    day,
                  ),
                }"
              >
                <span
                  class="text-xs"
                  :class="
                    timeline.isToday(timeline.nextMonthInfo.value.date, day)
                      ? 'text-[#6A39F4] font-semibold'
                      : 'text-[var(--text-muted)]'
                  "
                >
                  {{ day }}
                </span>
              </div>
            </div>

            <!-- Timeline Grid with Promotions -->
            <div class="relative">
              <!-- Grid Columns Background -->
              <div class="flex absolute inset-0 pointer-events-none">
                <!-- Current Month Columns -->
                <div
                  v-for="day in timeline.currentMonthDaysList.value"
                  :key="`col-c-${day}`"
                  class="w-10 flex-shrink-0 border-r border-deep-border"
                  :class="{
                    'bg-[#6A39F4]/5': timeline.isToday(
                      timeline.currentMonthInfo.value.date,
                      day,
                    ),
                  }"
                />
                <!-- Next Month Columns -->
                <div
                  v-for="day in timeline.nextMonthDaysList.value"
                  :key="`col-n-${day}`"
                  class="w-10 flex-shrink-0 border-r border-deep-border last:border-r-0"
                  :class="{
                    'bg-[#6A39F4]/5': timeline.isToday(
                      timeline.nextMonthInfo.value.date,
                      day,
                    ),
                  }"
                />
              </div>

              <!-- Promotions Rows -->
              <div class="relative py-4 space-y-3 min-h-[300px]">
                <div
                  v-for="(row, rowIndex) in promotionRows"
                  :key="`row-${rowIndex}`"
                  class="relative min-h-[70px]"
                >
                  <!-- Promotion Cards in this row -->
                  <PromotionTimelineCard
                    v-for="promotion in row"
                    :key="promotion.promoID"
                    :promotion="promotion"
                    :is-expanded="isExpanded(promotion.promoID)"
                    :style="timeline.getPromotionStyle(promotion)"
                    :detail-loading="
                      p.detailLoading.value &&
                        p.selectedPromotionId.value === promotion.promoID
                    "
                    :excel-loading="
                      p.excelLoading.value &&
                        p.selectedPromotionId.value === promotion.promoID
                    "
                    @toggle-expand="toggleExpand(promotion.promoID)"
                    @show-details="p.handleShowDetails(promotion.promoID)"
                    @show-participants="
                      handleShowParticipants(promotion.promoID)
                    "
                  />
                </div>

                <!-- Empty state for no promotions -->
                <div
                  v-if="allPromotions.length === 0"
                  class="flex items-center justify-center h-[200px]"
                >
                  <div class="text-center">
                    <i
                      :class="
                        p.emptyState.value.icon +
                          ' text-5xl text-[var(--text-secondary)] mb-3'
                      "
                    />
                    <p class="text-[var(--text-muted)]">
                      {{ p.emptyState.value.message }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      :excel-items="p.excelItems.value as PromotionExcelItem[]"
      :excel-loading="p.excelLoading.value"
      :excel-error="p.excelError.value"
      :report-pending="p.reportPending.value"
      :is-recovery="participantsIsRecovery"
      :can-edit="canEditPromotion"
      @retry="p.handleParticipantsRetry"
      @apply-recovery="handleApplyRecovery"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import Button from 'primevue/button';
import OverlayBadge from 'primevue/overlaybadge';
import {
  usePromotionsUnified,
  useViewReady,
  usePromotionsTimeline,
  isPromotionStarted,
  isPromotionEditable,
} from '../../composables';
import PromotionDetailDialog from './PromotionDetailDialog.vue';
import PromotionParticipantsDialog from './PromotionParticipantsDialog.vue';
import PromotionTimelineCard from './PromotionTimelineCard.vue';
import type { PromotionItem, PromotionExcelItem } from '../../types';

const { viewReady } = useViewReady();

const p = usePromotionsUnified({
  initialFilter: 'AVAILABLE',
  immediate: false,
});

// Use the timeline composable
const timeline = usePromotionsTimeline(p.currentDate);

// Recovery mode for participants dialog
const participantsIsRecovery = ref(true);

// Check if promotion can be edited (hasn't started yet or starts today)
const canEditPromotion = computed(() => {
  const promotion = p.selectedPromotion.value;
  return promotion ? isPromotionEditable(promotion) : false;
});

// Track expanded promotion cards
const expandedPromotions = ref<Set<number>>(new Set());

function isExpanded(promoID: number): boolean {
  return expandedPromotions.value.has(promoID);
}

function toggleExpand(promoID: number) {
  if (expandedPromotions.value.has(promoID)) {
    expandedPromotions.value.delete(promoID);
  } else {
    expandedPromotions.value.add(promoID);
  }
}

// Handle show participants with isRecovery flag based on promotion data
function handleShowParticipants(promoID: number) {
  const promotion = p.promotions.value.find((p) => p.promoID === promoID);
  if (promotion) {
    // If available > 0, set isRecovery to false (exclude mode)
    // Otherwise, set isRecovery to true (recover mode)
    participantsIsRecovery.value = promotion.participation.counts.available > 0;
  }

  const hasStarted = promotion ? isPromotionStarted(promotion) : undefined;

  p.handleShowParticipants(promoID, hasStarted);
}

// Handle apply recovery from participants dialog
async function handleApplyRecovery(
  selectedItems: string[],
  isRecovery: boolean,
) {
  const success = await p.applyRecovery(selectedItems, isRecovery);
  if (success) {
    // Refresh the data after successful recovery
    p.showParticipantsDialog.value = false;
    await p.refreshData();
  }
}

// All promotions from API
const allPromotions = computed(() => [...p.promotions.value]);

// Group promotions into rows using the composable
const promotionRows = computed(() =>
  timeline.groupPromotionsIntoRows(allPromotions.value),
);

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

/* Ensure text truncates properly */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Smooth horizontal scroll */
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
