<template>
  <div
    class="absolute promotion-card-wrapper"
    :class="{
      'h-auto': isExpanded,
      'h-[58px]': !isExpanded,
      expanded: isExpanded,
    }"
    :style="cardStyle"
  >
    <div
      class="mx-1 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer hover:z-20 relative overflow-hidden"
      :class="[
        display.isExpired.value
          ? 'border-deep-border bg-gradient-to-r from-deep-elevated to-deep-card'
          : display.isNotStarted.value
            ? 'border-emerald-500/30 hover:border-emerald-500 bg-gradient-to-r from-emerald-500/10 to-deep-card'
            : 'border-[#6A39F4]/30 hover:border-[#6A39F4] bg-gradient-to-r from-[#6A39F4]/10 to-deep-card',
        isExpanded
          ? 'p-3 bg-deep-card'
          : 'p-2',
      ]"
    >
      <!-- Main Row (Always Visible) -->
      <div class="flex items-center gap-2">
        <!-- Expand/Collapse Button (Left Side) -->
        <Button
          :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
          severity="secondary"
          text
          class="w-6 h-6 p-0 flex-shrink-0"
          @click.stop="emit('toggle-expand')"
        />

        <!-- Main Info -->
        <div class="flex-1 min-w-0">
          <!-- Title Row -->
          <div class="flex items-center gap-2 min-w-0">
            <!-- Type Badge -->
            <span
              class="text-xs font-medium flex-shrink-0"
              :class="display.isExpired.value
                ? 'text-[var(--text-muted)]'
                : 'text-[#6A39F4]'"
            >
              {{ display.typeLabel.value }}
            </span>

            <!-- Title -->
            <span
              class="text-xs font-medium truncate"
              :class="display.isExpired.value
                ? 'text-[var(--text-muted)]'
                : 'text-[var(--color-text)]'"
            >
              {{ display.name.value }}
            </span>
          </div>

          <!-- Participation Counts (Always visible, below name) -->
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-[10px] text-green-400">
              Участвуют:
              <strong>{{
                promotion.participation.counts.participating
              }}</strong>
            </span>
            <span class="text-[10px] text-[var(--text-muted)]">
              Не участвуют:
              <strong>{{
                promotion.participation.counts.available +
                  promotion.participation.counts.participatingOutOfStock
              }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Expanded Content -->
      <div
        v-if="isExpanded"
        class="mt-3 pt-3 border-t border-[#6A39F4]/30 dark:border-[#6A39F4]/30 border-[#6A39F4]/20"
      >
        <!-- Status Badge -->
        <div class="mb-2">
          <Tag
            :value="display.participationStatusLabel.value"
            :severity="display.isExpired.value ? 'secondary' : display.participationStatusSeverity.value"
            class="text-xs"
          />
        </div>

        <!-- Stats Row -->
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <span
            class="text-xs text-[var(--text-muted)] flex items-center gap-0.5"
          >
            <i class="pi pi-arrow-up-right text-[10px]" />
            {{ display.participationText.value }}
          </span>
          <span
            v-if="display.hasBoost.value"
            class="text-xs text-[#6A39F4] font-medium"
          >
            {{ display.boostText.value }}
          </span>
        </div>

        <!-- Date Range & Product Count -->
        <div
          class="text-xs space-y-1 mb-3"
          :class="display.isExpired.value
            ? 'text-[var(--text-secondary)]'
            : 'text-[var(--text-muted)]'"
        >
          <div>
            {{ dateRangeText }}
            <span
              v-if="display.isExpired.value"
              class="ml-1 text-[var(--text-muted)] font-medium"
            >(завершена)</span>
          </div>
          <div>{{ display.productCountText.value }}</div>
        </div>

        <!-- Action Buttons (Moved to expanded section) -->
        <div
          class="flex items-center justify-start gap-2 pt-2 border-t"
          :class="display.isExpired.value
            ? 'border-deep-border'
            : 'border-[#6A39F4]/20'"
        >
          <Button
            v-if="!display.isExpired.value"
            size="small"
            severity="primary"
            :loading="excelLoading"
            @click.stop="emit('show-participants')"
          >
            <i class="pi pi-box mr-1" />
            товары
          </Button>
          <Button
            size="small"
            severity="secondary"
            variant="outlined"
            :loading="detailLoading"
            @click.stop="emit('show-details')"
          >
            <i class="pi pi-info-circle mr-1" />
            детали
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { usePromotionItem } from '../../composables';
import type { PromotionItem } from '../../types';
import type { PromotionPosition } from '../../composables/promotions';

interface Props {
  promotion: PromotionItem;
  isExpanded: boolean;
  style: PromotionPosition;
  detailLoading?: boolean;
  excelLoading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'toggle-expand': [];
  'show-details': [];
  'show-participants': [];
}>();

// Compute card style - remove width constraint when expanded to allow content to show fully
const cardStyle = computed(() => {
  if (props.isExpanded) {
    // When expanded, only keep the left position, let width expand naturally
    const { width, ...rest } = props.style;
    return rest;
  }
  return props.style;
});

// Use the composable for all display logic
const display = usePromotionItem(() => props.promotion);

// Format date range in short format (e.g., "1 янв - 15 янв")
const dateRangeText = computed(() => {
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
</style>
