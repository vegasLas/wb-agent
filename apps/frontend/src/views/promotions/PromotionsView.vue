<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header with Filter Tabs -->
    <div class="sticky top-0 z-20 bg-white dark:bg-[#171819] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div class="flex items-center justify-between">
        <!-- Filter Tabs -->
        <div class="flex items-center gap-2">
          <Button
            v-for="tab in p.filterTabs"
            :key="tab.value"
            :severity="p.currentFilter.value === tab.value ? 'primary' : 'secondary'"
            size="small"
            class="text-xs"
            @click="p.setFilter(tab.value)"
          >
            {{ tab.label }}
            <span
              v-if="p.participationCounts.value[tab.value] > 0"
              class="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-white/20"
            >
              {{ p.participationCounts.value[tab.value] }}
            </span>
          </Button>
        </div>

        <!-- Date Navigation -->
        <div class="hidden sm:flex items-center gap-2">
          <Button
            icon="pi pi-chevron-left"
            severity="secondary"
            text
            size="small"
            @click="p.navigateMonth(-1)"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
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
    <div class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
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
        <p class="text-gray-600 dark:text-gray-400">
          Загрузка акций...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="p.error.value"
        class="text-center py-16 px-4"
      >
        <div class="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 max-w-md mx-auto">
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
      <div v-else>
        <!-- Month Headers -->
        <div class="flex gap-8 mb-6">
          <div
            v-for="month in p.visibleMonths.value"
            :key="month.key"
            class="flex-1 text-center"
          >
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {{ month.label }}
            </h2>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="relative">
          <!-- Days Header -->
          <div class="flex mb-2">
            <div
              v-for="day in p.weekDays"
              :key="day"
              class="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 py-1"
            >
              {{ day }}
            </div>
            <div
              v-for="day in p.weekDays"
              :key="`next-${day}`"
              class="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 py-1"
            >
              {{ day }}
            </div>
          </div>

          <!-- Calendar Body with Promotions -->
          <div class="flex gap-4">
            <!-- Current Month Column -->
            <div class="flex-1">
              <div class="grid grid-cols-7 gap-1">
                <!-- Empty cells for offset -->
                <div
                  v-for="n in p.currentMonthOffset.value"
                  :key="`offset-${n}`"
                  class="h-24"
                />
                
                <!-- Day cells -->
                <div
                  v-for="day in p.currentMonthDays.value"
                  :key="`day-${day}`"
                  class="h-24 border border-gray-100 dark:border-gray-800 rounded-lg p-1 relative"
                  :class="{ 
                    'bg-orange-50/30 dark:bg-orange-900/10': p.isToday(p.currentDate.value, day),
                    'border-orange-300 dark:border-orange-700': p.isToday(p.currentDate.value, day)
                  }"
                >
                  <span
                    class="text-xs font-medium"
                    :class="p.isToday(p.currentDate.value, day) ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'"
                  >
                    {{ day }}
                  </span>
                </div>
              </div>

              <!-- Promotions for current month -->
              <div class="mt-4 space-y-3">
                <PromotionCard
                  v-for="promotion in p.currentMonthPromotions.value"
                  :key="promotion.promoID"
                  :promotion="promotion"
                  :detail-loading="p.detailLoading.value && p.selectedPromotionId.value === promotion.promoID"
                  :excel-loading="p.excelLoading.value && p.selectedPromotionId.value === promotion.promoID"
                  @show-details="p.handleShowDetails"
                  @show-participants="p.handleShowParticipants"
                />
              </div>
            </div>

            <!-- Next Month Column -->
            <div class="flex-1 hidden md:block">
              <div class="grid grid-cols-7 gap-1">
                <!-- Empty cells for offset -->
                <div
                  v-for="n in p.nextMonthOffset.value"
                  :key="`next-offset-${n}`"
                  class="h-24"
                />
                
                <!-- Day cells -->
                <div
                  v-for="day in p.nextMonthDays.value"
                  :key="`next-day-${day}`"
                  class="h-24 border border-gray-100 dark:border-gray-800 rounded-lg p-1"
                >
                  <span class="text-xs text-gray-700 dark:text-gray-300">{{ day }}</span>
                </div>
              </div>

              <!-- Promotions for next month -->
              <div class="mt-4 space-y-3">
                <PromotionCard
                  v-for="promotion in p.nextMonthPromotions.value"
                  :key="promotion.promoID"
                  :promotion="promotion"
                  :detail-loading="p.detailLoading.value && p.selectedPromotionId.value === promotion.promoID"
                  :excel-loading="p.excelLoading.value && p.selectedPromotionId.value === promotion.promoID"
                  @show-details="p.handleShowDetails"
                  @show-participants="p.handleShowParticipants"
                />
              </div>
            </div>
          </div>

          <!-- No Promotions State -->
          <div
            v-if="p.groupedPromotions.value.currentMonth.length === 0 && p.groupedPromotions.value.nextMonth.length === 0"
            class="text-center py-20"
          >
            <div class="p-8 rounded-lg bg-gray-50 dark:bg-gray-800/50 max-w-md mx-auto">
              <i :class="p.emptyState.value.icon + ' text-5xl text-gray-400 mb-4'" />
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Нет акций
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                {{ p.emptyState.value.message }}
              </p>
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
import { onMounted } from 'vue';
import Button from 'primevue/button';
import { usePromotionsUnified, useViewReady } from '../../composables';
import PromotionCard from './PromotionCard.vue';
import PromotionDetailDialog from './PromotionDetailDialog.vue';
import PromotionParticipantsDialog from './PromotionParticipantsDialog.vue';

const { viewReady } = useViewReady();

const p = usePromotionsUnified({
  initialFilter: 'PARTICIPATING',
  immediate: false,
});

onMounted(async () => {
  await p.refreshData();
  viewReady();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
