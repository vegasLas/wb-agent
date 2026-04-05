<template>
  <div
    class="absolute promotion-card-wrapper"
    :class="{
      'h-auto': isExpanded,
      'h-[58px]': !isExpanded,
      expanded: isExpanded,
    }"
    :style="style"
  >
    <div
      class="mx-1 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:z-20 relative overflow-hidden"
      :class="
        isExpanded
          ? 'p-3 bg-white dark:bg-gray-800'
          : 'p-2 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800/50'
      "
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
              class="text-xs font-medium text-orange-600 dark:text-orange-400 flex-shrink-0"
            >
              {{ display.typeLabel.value }}
            </span>

            <!-- Title -->
            <span
              class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
            >
              {{ display.name.value }}
            </span>
          </div>

          <!-- Participation Counts (Always visible, below name) -->
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-[10px] text-green-600 dark:text-green-400">
              Участвуют:
              <strong>{{ promotion.participation.counts.participating }}</strong>
            </span>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">
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
        class="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800"
      >
        <!-- Status Badge -->
        <div class="mb-2">
          <Tag
            :value="display.participationStatusLabel.value"
            :severity="display.participationStatusSeverity.value"
            class="text-xs"
          />
        </div>

        <!-- Stats Row -->
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <span
            class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-0.5"
          >
            <i class="pi pi-arrow-up-right text-[10px]" />
            {{ display.participationText.value }}
          </span>
          <span
            v-if="display.hasBoost.value"
            class="text-xs text-orange-600 dark:text-orange-400 font-medium"
          >
            {{ display.boostText.value }}
          </span>
        </div>

        <!-- Date Range & Product Count -->
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
          <div>{{ dateRangeText }}</div>
          <div>{{ display.productCountText.value }}</div>
        </div>

        <!-- Action Buttons (Moved to expanded section) -->
        <div
          class="flex items-center justify-start gap-2 pt-2 border-t border-orange-100 dark:border-orange-900/30"
        >
          <Button
            size="small"
            severity="secondary"
            variant="outlined"
            :loading="detailLoading"
            @click.stop="emit('show-details')"
          >
            <i class="pi pi-info-circle mr-1" />
            Детали
          </Button>
          <Button
            size="small"
            severity="primary"
            :loading="excelLoading"
            @click.stop="emit('show-participants')"
          >
            <i class="pi pi-users mr-1" />
            Участники
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

interface Props {
  promotion: PromotionItem;
  isExpanded: boolean;
  style: Record<string, string>;
  detailLoading?: boolean;
  excelLoading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'toggle-expand': [];
  'show-details': [];
  'show-participants': [];
}>();

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
