<template>
  <div class="promotions-timeline -mx-4">
    <!-- Horizontal Scrollable Container -->
    <div class="overflow-x-auto pb-4">
      <div class="max-w-[900px] px-4">
        <!-- Two Month Headers -->
        <div class="flex mb-2">
          <div
            class="text-center flex-shrink-0"
            :style="{
              width: currentMonthDaysList.length * columnWidth + 'px',
            }"
          >
            <h2
              class="text-base font-semibold text-[var(--color-text)] capitalize"
            >
              {{ visibleMonths[0]?.label }}
            </h2>
          </div>
          <div
            class="text-center flex-shrink-0"
            :style="{
              width: nextMonthDaysList.length * columnWidth + 'px',
            }"
          >
            <h2
              class="text-base font-semibold text-[var(--color-text)] capitalize"
            >
              {{ visibleMonths[1]?.label }}
            </h2>
          </div>
        </div>

        <!-- Dates Row -->
        <div class="flex mb-1 border-b border-[var(--color-border)]">
          <!-- Current Month Dates -->
          <div
            v-for="day in currentMonthDaysList"
            :key="`date-c-${day}`"
            class="w-10 flex-shrink-0 text-center py-2 border-r border-[var(--color-border)]"
            :class="{
              'today-highlight': isToday(currentMonthDate, day),
            }"
          >
            <span
              class="text-xs"
              :class="
                isToday(currentMonthDate, day)
                  ? 'today-text font-semibold'
                  : 'text-[var(--text-muted)]'
              "
            >
              {{ day }}
            </span>
          </div>
          <!-- Next Month Dates -->
          <div
            v-for="day in nextMonthDaysList"
            :key="`date-n-${day}`"
            class="w-10 flex-shrink-0 text-center py-2 border-r border-[var(--color-border)] last:border-r-0"
            :class="{
              'today-highlight': isToday(nextMonthDate, day),
            }"
          >
            <span
              class="text-xs"
              :class="
                isToday(nextMonthDate, day)
                  ? 'today-text font-semibold'
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
              v-for="day in currentMonthDaysList"
              :key="`col-c-${day}`"
              class="w-10 flex-shrink-0 border-r border-[var(--color-border)]"
              :class="{
                'today-highlight': isToday(currentMonthDate, day),
              }"
            />
            <!-- Next Month Columns -->
            <div
              v-for="day in nextMonthDaysList"
              :key="`col-n-${day}`"
              class="w-10 flex-shrink-0 border-r border-[var(--color-border)] last:border-r-0"
              :class="{
                'today-highlight': isToday(nextMonthDate, day),
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
                :style="getPromotionStyle(promotion)"
                :detail-loading="
                  detailLoading && selectedPromotionId === promotion.promoID
                "
                :excel-loading="
                  excelLoading && selectedPromotionId === promotion.promoID
                "
                @toggle-expand="$emit('toggle-expand', promotion.promoID)"
                @show-details="$emit('show-details', promotion.promoID)"
                @show-participants="
                  $emit('show-participants', promotion.promoID)
                "
              />
            </div>

            <!-- Empty state for no promotions -->
            <div
              v-if="promotions.length === 0"
              class="flex items-center justify-center h-[200px]"
            >
              <div class="text-center">
                <i
                  :class="
                    emptyIcon + ' text-5xl text-[var(--text-secondary)] mb-3'
                  "
                />
                <p class="text-[var(--text-muted)]">
                  {{ emptyMessage }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PromotionTimelineCard from '@/views/promotions/PromotionTimelineCard.vue';
import type { PromotionItem } from '@/types';

interface Props {
  promotions: PromotionItem[];
  currentMonthDaysList: number[];
  nextMonthDaysList: number[];
  visibleMonths: Array<{ key: string; label: string }>;
  currentMonthDate: Date;
  columnWidth: number;
  expandedIds: Set<number>;
  selectedPromotionId: number | null;
  detailLoading: boolean;
  excelLoading: boolean;
  emptyIcon: string;
  emptyMessage: string;
  isToday: (monthDate: Date, day: number) => boolean;
  getPromotionStyle: (promotion: PromotionItem) => {
    left: string;
    width?: string;
  };
  groupPromotionsIntoRows: (promotions: PromotionItem[]) => PromotionItem[][];
}

const props = defineProps<Props>();

defineEmits<{
  'toggle-expand': [promoID: number];
  'show-details': [promoID: number];
  'show-participants': [promoID: number];
}>();

const nextMonthDate = computed(() => {
  const d = new Date(props.currentMonthDate);
  d.setMonth(d.getMonth() + 1);
  return d;
});

function isExpanded(promoID: number): boolean {
  return props.expandedIds.has(promoID);
}

const promotionRows = computed(() =>
  props.groupPromotionsIntoRows(props.promotions),
);
</script>
