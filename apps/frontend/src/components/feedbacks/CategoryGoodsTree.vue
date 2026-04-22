<template>
  <div class="space-y-3">
    <!-- Loading -->
    <LoadingSpinner v-if="goodsLoading || statsLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="categories.length === 0"
      icon="pi pi-box"
      message="Нет товаров для отображения"
    />

    <!-- Category Accordion -->
    <Accordion
      v-else
      :multiple="true"
      class="category-accordion"
    >
      <AccordionTab
        v-for="category in categories"
        :key="category.name"
        :header="''"
      >
        <template #header>
          <div class="flex items-center justify-between w-full gap-3 pr-2">
            <div class="flex items-center gap-3">
              <ToggleSwitch
                :model-value="getCategoryEnabled(category.name)"
                :disabled="!canToggleCategory(category.name)"
                @update:model-value="(val) => onToggleCategory(category.name, val)"
                @click.stop
              />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-surface-900 dark:text-surface-0">
                  {{ category.name }}
                </span>
                <span class="text-xs text-surface-500 dark:text-surface-400">
                  {{ category.goods.length }} товаров
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Badge
                :value="getProgressText(category.name)"
                :severity="getProgressSeverity(category.name)"
                class="text-xs"
              />
              <i
                v-if="!canToggleCategory(category.name)"
                v-tooltip="getThresholdTooltip(category.name)"
                class="pi pi-info-circle text-surface-400 cursor-help"
              />
            </div>
          </div>
        </template>

        <!-- Goods list inside category -->
        <div class="space-y-2 pl-2">
          <div
            v-for="good in category.goods"
            :key="good.nmID"
            class="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-900 rounded-md"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="good.thumbnail"
                :src="good.thumbnail"
                alt=""
                class="w-10 h-10 object-cover rounded"
              >
              <div
                v-else
                class="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center"
              >
                <i class="pi pi-image text-surface-400" />
              </div>
              <div class="flex flex-col">
                <span class="text-sm text-surface-900 dark:text-surface-0 line-clamp-1">
                  {{ good.title }}
                </span>
                <span class="text-xs text-surface-500">
                  Арт: {{ good.vendorCode }} | nmID: {{ good.nmID }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <ToggleSwitch
                :model-value="getProductEnabled(good.nmID)"
                :disabled="!canToggleProduct(category.name)"
                @update:model-value="(val) => onToggleProduct(good.nmID, val)"
              />
              <i
                v-if="!canToggleProduct(category.name)"
                v-tooltip="getProductThresholdTooltip(category.name)"
                class="pi pi-info-circle text-surface-400 cursor-help"
              />
            </div>
          </div>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import ToggleSwitch from 'primevue/toggleswitch';
import Badge from 'primevue/badge';
import Tooltip from 'primevue/tooltip';
import { LoadingSpinner, EmptyState } from '@/components/common';
import type { GoodsItem, CategoryStat } from '@/api/feedbacks/types';

const vTooltip = Tooltip;

interface Props {
  goodsByCategory: Record<string, GoodsItem[]>;
  categoryStats: CategoryStat[];
  categorySettings: Array<{ category: string; autoAnswerEnabled: boolean }>;
  productSettings: Array<{ nmId: number; autoAnswerEnabled: boolean }>;
  goodsLoading: boolean;
  statsLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle-category', category: string, enabled: boolean): void;
  (e: 'toggle-product', nmId: number, enabled: boolean): void;
}>();

interface CategoryGroup {
  name: string;
  goods: GoodsItem[];
}

const categories = computed<CategoryGroup[]>(() => {
  const result: CategoryGroup[] = [];
  for (const [name, goods] of Object.entries(props.goodsByCategory)) {
    result.push({ name, goods });
  }
  // Sort by name for consistency
  return result.sort((a, b) => a.name.localeCompare(b.name));
});

function getCategoryStat(category: string): CategoryStat | undefined {
  return props.categoryStats.find((s) => s.category === category);
}

function getCategoryEnabled(category: string): boolean {
  const setting = props.categorySettings.find((s) => s.category === category);
  return setting?.autoAnswerEnabled ?? false;
}

function getProductEnabled(nmId: number): boolean {
  const setting = props.productSettings.find((s) => s.nmId === nmId);
  return setting?.autoAnswerEnabled ?? true;
}

function canToggleCategory(category: string): boolean {
  const stat = getCategoryStat(category);
  if (!stat) return false;
  // Can always disable; can only enable if threshold is met
  if (getCategoryEnabled(category)) return true;
  return stat.canEnableCategory;
}

function canToggleProduct(category: string): boolean {
  const stat = getCategoryStat(category);
  if (!stat) return false;
  return stat.canEnableProduct;
}

function getProgressText(category: string): string {
  const stat = getCategoryStat(category);
  if (!stat) return 'Нет данных';
  if (stat.canEnableCategory) {
    return `${stat.postedCount} опубл., ${stat.rejectedCount} откл.`;
  }
  return `${stat.postedCount} опубл., ${stat.rejectedCount} откл.`;
}

function getProgressSeverity(category: string): string {
  const stat = getCategoryStat(category);
  if (!stat) return 'secondary';
  if (stat.canEnableCategory) return 'success';
  if (stat.postedCount >= 15 || stat.rejectedCount >= 10) return 'warn';
  return 'secondary';
}

function getThresholdTooltip(category: string): string {
  const stat = getCategoryStat(category);
  if (!stat) {
    return 'Недостаточно данных. Необходимо ≥ 30 опубликованных или ≥ 20 отклоненных отзывов.';
  }
  return `Для включения необходимо: ≥ 30 опубликованных или ≥ 20 отклоненных отзывов. Сейчас: ${stat.postedCount} опубликовано, ${stat.rejectedCount} отклонено.`;
}

function getProductThresholdTooltip(category: string): string {
  return getThresholdTooltip(category);
}

function onToggleCategory(category: string, enabled: boolean) {
  emit('toggle-category', category, enabled);
}

function onToggleProduct(nmId: number, enabled: boolean) {
  emit('toggle-product', nmId, enabled);
}
</script>

<style scoped>
.category-accordion :deep(.p-accordion-header-link) {
  padding: 0.75rem 1rem;
}

.category-accordion :deep(.p-accordion-content) {
  padding: 0.75rem 1rem;
}
</style>
