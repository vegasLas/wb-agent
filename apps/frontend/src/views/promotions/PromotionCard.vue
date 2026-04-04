<template>
  <div
    class="promotion-card rounded-lg border border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-900/20 dark:to-gray-800/50 p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <!-- Header: Title -->
    <div class="mb-3">
      <h3
        class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2"
      >
        <span class="text-orange-600 dark:text-orange-400">{{
          display.typeLabel.value
        }}</span>
        {{ display.name.value }}
      </h3>
    </div>

    <!-- Status Badge Row -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <!-- Participation Status -->
      <Tag
        :value="display.participationStatusLabel.value"
        :severity="display.participationStatusSeverity.value"
        class="text-xs"
      />

      <!-- Participation Percentage -->
      <span
        class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"
      >
        <i class="pi pi-arrow-up-right text-xs" />
        {{ display.participationText.value }}
      </span>

      <!-- Coefficient Boost -->
      <span
        v-if="display.hasBoost.value"
        class="text-xs text-orange-600 dark:text-orange-400 font-medium"
      >
        {{ display.boostText.value }}
      </span>
    </div>

    <!-- Date Range & Product Count -->
    <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <div>{{ display.dateRangeText.value }}</div>
      <div>{{ display.productCountText.value }}</div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2 mt-4">
      <Button
        size="small"
        severity="secondary"
        variant="outlined"
        class="flex-1 text-xs"
        :loading="detailLoading"
        @click="handleDetailsClick"
      >
        <i class="pi pi-info-circle mr-1" />
        Детали
      </Button>
      <Button
        size="small"
        severity="primary"
        class="flex-1 text-xs"
        :loading="excelLoading"
        @click="handleParticipateClick"
      >
        <i class="pi pi-users mr-1" />
        Участвовать
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { usePromotionItem } from '../../composables';
import type { PromotionItem } from '../../types';

interface Props {
  promotion: PromotionItem;
  detailLoading?: boolean;
  excelLoading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'show-details': [promoID: number];
  'show-participants': [promoID: number];
}>();

// Use the composable for all display logic
const display = usePromotionItem(() => props.promotion);

function handleDetailsClick() {
  emit('show-details', display.id.value);
}

function handleParticipateClick() {
  emit('show-participants', display.id.value);
}
</script>

<style scoped>
.promotion-card {
  min-width: 240px;
  max-width: 320px;
}
</style>
