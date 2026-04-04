<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header with Date Navigation -->
    <div
      class="sticky top-0 z-30 bg-white dark:bg-[#171819] border-b border-gray-200 dark:border-gray-700 px-4 py-3"
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
            class="text-sm text-gray-700 dark:text-gray-300 min-w-[140px] text-center"
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
          <div class="text-sm text-gray-500 dark:text-gray-400 ml-4">
            Сегодня: {{ p.todayLabel.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Date Navigation -->
    <div
      class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700"
    >
      <Button
        icon="pi pi-chevron-left"
        severity="secondary"
        text
        size="small"
        @click="p.navigateMonth(-1)"
      />
      <span class="text-sm text-gray-700 dark:text-gray-300">
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

    <!-- Main Content -->
    <div class="p-4">
      <!-- Loading State -->
      <div
        v-if="p.loading.value"
        class="flex flex-col items-center justify-center py-20"
      >
        <i class="pi pi-refresh animate-spin text-5xl text-orange-500 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Загрузка акций...</p>
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
      <div v-else class="promotions-timeline -mx-4">
        <!-- Horizontal Scrollable Container -->
        <div class="overflow-x-auto pb-4">
          <div class="min-w-[1200px] px-4">
            <!-- Two Month Headers -->
            <div class="flex mb-2">
              <div class="flex-1 text-center">
                <h2
                  class="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize"
                >
                  {{ timeline.visibleMonthsInfo.value[0]?.label }}
                </h2>
              </div>
              <div class="flex-1 text-center">
                <h2
                  class="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize"
                >
                  {{ timeline.visibleMonthsInfo.value[1]?.label }}
                </h2>
              </div>
            </div>

            <!-- Dates Row -->
            <div
              class="flex mb-1 border-b border-gray-200 dark:border-gray-700"
            >
              <!-- Current Month Dates -->
              <div
                v-for="day in timeline.currentMonthDaysList.value"
                :key="`date-c-${day}`"
                class="w-10 flex-shrink-0 text-center py-2 border-r border-gray-100 dark:border-gray-800"
                :class="{
                  'bg-orange-50/50 dark:bg-orange-900/10': timeline.isToday(
                    timeline.currentMonthInfo.value.date,
                    day,
                  ),
                }"
              >
                <span
                  class="text-xs"
                  :class="
                    timeline.isToday(timeline.currentMonthInfo.value.date, day)
                      ? 'text-orange-600 dark:text-orange-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400'
                  "
                >
                  {{ day }}
                </span>
              </div>
              <!-- Next Month Dates -->
              <div
                v-for="day in timeline.nextMonthDaysList.value"
                :key="`date-n-${day}`"
                class="w-10 flex-shrink-0 text-center py-2 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                :class="{
                  'bg-orange-50/50 dark:bg-orange-900/10': timeline.isToday(
                    timeline.nextMonthInfo.value.date,
                    day,
                  ),
                }"
              >
                <span
                  class="text-xs"
                  :class="
                    timeline.isToday(timeline.nextMonthInfo.value.date, day)
                      ? 'text-orange-600 dark:text-orange-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400'
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
                  class="w-10 flex-shrink-0 border-r border-gray-100 dark:border-gray-800"
                  :class="{
                    'bg-orange-50/20 dark:bg-orange-900/5': timeline.isToday(
                      timeline.currentMonthInfo.value.date,
                      day,
                    ),
                  }"
                />
                <!-- Next Month Columns -->
                <div
                  v-for="day in timeline.nextMonthDaysList.value"
                  :key="`col-n-${day}`"
                  class="w-10 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                  :class="{
                    'bg-orange-50/20 dark:bg-orange-900/5': timeline.isToday(
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
                  class="relative h-[90px]"
                >
                  <!-- Promotion Cards in this row -->
                  <div
                    v-for="promotion in row"
                    :key="promotion.promoID"
                    class="absolute h-[85px] promotion-card-wrapper"
                    :style="timeline.getPromotionStyle(promotion)"
                  >
                    <div
                      class="h-full mx-1 rounded-lg border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50/90 to-white dark:from-orange-900/30 dark:to-gray-800/50 px-3 py-2 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 hover:z-10 relative overflow-hidden flex items-center gap-3"
                      @click="p.handleShowDetails(promotion.promoID)"
                    >
                      <!-- Content Section -->
                      <div class="flex-1 min-w-0">
                        <!-- Title -->
                        <div
                          class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1 pr-10"
                        >
                          <span class="text-orange-600 dark:text-orange-400">
                            {{ getPromotionDisplay(promotion).typeLabel.value }}
                          </span>
                          {{ getPromotionDisplay(promotion).name.value }}
                        </div>

                        <!-- Status & Stats Row -->
                        <div class="flex items-center gap-2 flex-wrap">
                          <Tag
                            :value="
                              getPromotionDisplay(promotion)
                                .participationStatusLabel.value
                            "
                            :severity="
                              getPromotionDisplay(promotion)
                                .participationStatusSeverity.value
                            "
                            class="text-xs"
                          />

                          <span
                            class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-0.5"
                          >
                            <i class="pi pi-arrow-up-right text-[10px]" />
                            {{
                              getPromotionDisplay(promotion).participationText
                                .value
                            }}
                          </span>

                          <span
                            v-if="getPromotionDisplay(promotion).hasBoost.value"
                            class="text-xs text-orange-600 dark:text-orange-400 font-medium"
                          >
                            {{ getPromotionDisplay(promotion).boostText.value }}
                          </span>
                        </div>

                        <!-- Date Range & Product Count -->
                        <div
                          class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2"
                        >
                          <span class="truncate">{{
                            getShortDateRange(promotion)
                          }}</span>
                          <span class="truncate"
                            >·
                            {{
                              getPromotionDisplay(promotion).productCountText
                                .value
                            }}</span
                          >
                        </div>
                      </div>

                      <!-- View Button (Right Side) -->
                      <Button
                        icon="pi pi-eye"
                        size="small"
                        severity="primary"
                        class="flex-shrink-0 w-8 h-8"
                        :loading="
                          p.excelLoading.value &&
                          p.selectedPromotionId.value === promotion.promoID
                        "
                        @click.stop="
                          p.handleShowParticipants(promotion.promoID)
                        "
                      />
                    </div>
                  </div>
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
                        ' text-5xl text-gray-300 dark:text-gray-600 mb-3'
                      "
                    />
                    <p class="text-gray-500 dark:text-gray-400">
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
      :excel-items="p.excelItems.value"
      :excel-loading="p.excelLoading.value"
      :excel-error="p.excelError.value"
      :report-pending="p.reportPending.value"
      @retry="p.handleParticipantsRetry"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import {
  usePromotionsUnified,
  useViewReady,
  usePromotionItem,
  usePromotionsTimeline,
} from '../../composables';
import PromotionDetailDialog from './PromotionDetailDialog.vue';
import PromotionParticipantsDialog from './PromotionParticipantsDialog.vue';
import type { PromotionItem } from '../../types';

const { viewReady } = useViewReady();

const p = usePromotionsUnified({
  initialFilter: 'PARTICIPATING',
  immediate: false,
});

// Use the timeline composable
const timeline = usePromotionsTimeline(p.currentDate);

// All promotions from API
const allPromotions = computed(() => [...p.promotions.value]);

// Group promotions into rows using the composable
const promotionRows = computed(() =>
  timeline.groupPromotionsIntoRows(allPromotions.value),
);

// Get promotion display helpers
function getPromotionDisplay(promotion: PromotionItem) {
  return usePromotionItem(() => promotion);
}

// Get short date range
function getShortDateRange(promotion: PromotionItem): string {
  const display = getPromotionDisplay(promotion);
  const start = display.startDate.value;
  const end = display.endDate.value;
  if (!start || !end) return '';

  const formatShort = (date: Date) => {
    return date
      .toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })
      .replace('.', '');
  };

  return `${formatShort(start)} - ${formatShort(end)}`;
}

onMounted(async () => {
  await p.refreshData();
  viewReady();
});
</script>

<style scoped>
.promotion-card-wrapper {
  transition: all 0.2s ease;
}

.promotion-card-wrapper:hover {
  z-index: 20;
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
