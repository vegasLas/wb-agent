<template>
  <div class="space-y-3">
    <!-- Stats Cards -->
    <FeedbacksStatsCards :stats="feedbacksStore.stats" />

    <!-- Actions Bar + View Mode Switch -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm"
    >
      <!-- Left: View Mode Switch -->
      <SelectButton
        v-model="viewMode"
        :options="viewModeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        class="text-sm"
      />

      <!-- Right: Actions + Quota -->
      <div class="flex items-center gap-3">
        <FeedbackQuotaBadge
          :used="feedbackQuota.used"
          :max="feedbackQuota.max"
        />
        <FeedbacksActionsBar
          :active-tab="activeTab"
          :settings-loading="feedbacksStore.settingsLoading"
          :answer-all-loading="feedbacksStore.answerAllLoading"
          @open-auto-answers="showAutoAnswersDrawer = true"
          @answer-all="onAnswerAll"
        />
      </div>
    </div>

    <!-- Error Message -->
    <ErrorMessage v-if="feedbacksStore.error" :message="feedbacksStore.error" />

    <!-- Answers View -->
    <div v-if="viewMode === 'answers'">
      <TabView
        :active-index="activeTabIndex"
        @update:active-index="onTabChange"
      >
        <TabPanel :header="tabLabels.unanswered">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'unanswered'"
          />
          <div
            v-if="
              feedbacksStore.pagination.unanswered.totalCount > 0 &&
              !feedbacksStore.loading
            "
            class="flex justify-end mb-2"
          >
            <Chip
              :label="`Показано ${feedbacksStore.unansweredFeedbacks.length} из ${feedbacksStore.pagination.unanswered.totalCount}`"
              icon="pi pi-list"
              class="text-xs"
            />
          </div>
          <div
            v-if="feedbacksStore.unansweredFeedbacks.length > 0"
            class="space-y-3 feedbacks-list"
            :class="{ 'page-changing': pageChanging }"
          >
            <FeedbacksCard
              v-for="feedback in feedbacksStore.unansweredFeedbacks"
              :key="feedback.id"
              :feedback="feedback"
              tab="unanswered"
              @generate="onGenerate"
            />
          </div>
          <EmptyState
            v-else-if="!feedbacksStore.loading"
            icon="pi pi-inbox"
            message="в последних 100 отзывах есть ответы"
          />
          <Paginator
            v-if="
              feedbacksStore.pagination.unanswered.totalPages > 1 &&
              !feedbacksStore.loading
            "
            class="feedbacks-paginator"
            :rows="feedbacksStore.pagination.unanswered.pageSize"
            :total-records="feedbacksStore.pagination.unanswered.totalCount"
            :first="
              (feedbacksStore.pagination.unanswered.page - 1) *
              feedbacksStore.pagination.unanswered.pageSize
            "
            :rows-per-page-options="[10, 20, 50]"
            @page="onPageChange"
          />
        </TabPanel>

        <TabPanel :header="tabLabels['ai-posted']">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'ai-posted'"
          />
          <div
            v-if="!feedbacksStore.loading"
            class="flex items-center justify-between mb-2 gap-3"
          >
            <Select
              v-model="selectedGoodFilter"
              :options="goodsOptions"
              option-label="label"
              option-value="value"
              placeholder="Фильтр по товару"
              size="small"
              class="w-56 text-sm"
              show-clear
            />
            <Chip
              :label="`Показано ${feedbacksStore.feedbacks.length} из ${feedbacksStore.pagination['ai-posted'].totalCount}`"
              icon="pi pi-list"
              class="text-xs"
            />
          </div>
          <div
            v-if="feedbacksStore.feedbacks.length > 0"
            class="space-y-3 feedbacks-list"
            :class="{ 'page-changing': pageChanging }"
          >
            <FeedbacksCard
              v-for="feedback in feedbacksStore.feedbacks"
              :key="feedback.id"
              :feedback="feedback"
              tab="ai-posted"
            />
          </div>
          <EmptyState
            v-else-if="!feedbacksStore.loading"
            icon="pi pi-check-circle"
            message="Нет опубликованных AI-ответов"
          />
          <Paginator
            v-if="
              feedbacksStore.pagination['ai-posted'].totalPages > 1 &&
              !feedbacksStore.loading
            "
            class="feedbacks-paginator"
            :rows="feedbacksStore.pagination['ai-posted'].pageSize"
            :total-records="feedbacksStore.pagination['ai-posted'].totalCount"
            :first="
              (feedbacksStore.pagination['ai-posted'].page - 1) *
              feedbacksStore.pagination['ai-posted'].pageSize
            "
            :rows-per-page-options="[10, 20, 50]"
            @page="onPageChange"
          />
        </TabPanel>

        <TabPanel :header="tabLabels['ai-pending']">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'ai-pending'"
          />
          <div
            v-if="
              feedbacksStore.pagination['ai-pending'].totalCount > 0 &&
              !feedbacksStore.loading
            "
            class="flex items-center justify-between mb-2"
          >
            <Chip
              :label="`Показано ${feedbacksStore.feedbacks.length} из ${feedbacksStore.pagination['ai-pending'].totalCount}`"
              icon="pi pi-list"
              class="text-xs"
            />
            <Button
              label="Опубликовать все AI"
              icon="pi pi-check"
              severity="success"
              size="small"
              :loading="feedbacksStore.postPendingLoading"
              @click="onPostPending"
            />
          </div>
          <div
            v-if="feedbacksStore.feedbacks.length > 0"
            class="space-y-3 feedbacks-list"
            :class="{ 'page-changing': pageChanging }"
          >
            <FeedbacksCard
              v-for="feedback in feedbacksStore.feedbacks"
              :key="feedback.id"
              :feedback="feedback"
              tab="ai-pending"
              @accept="onAcceptAnswer"
              @reject="onRejectAnswer"
            />
          </div>
          <EmptyState
            v-else-if="!feedbacksStore.loading"
            icon="pi pi-inbox"
            message="Нет неопубликованных AI-ответов"
          />
          <Paginator
            v-if="
              feedbacksStore.pagination['ai-pending'].totalPages > 1 &&
              !feedbacksStore.loading
            "
            class="feedbacks-paginator"
            :rows="feedbacksStore.pagination['ai-pending'].pageSize"
            :total-records="feedbacksStore.pagination['ai-pending'].totalCount"
            :first="
              (feedbacksStore.pagination['ai-pending'].page - 1) *
              feedbacksStore.pagination['ai-pending'].pageSize
            "
            :rows-per-page-options="[10, 20, 50]"
            @page="onPageChange"
          />
        </TabPanel>
      </TabView>
    </div>

    <!-- Rejected View -->
    <div v-else-if="viewMode === 'rejected'">
      <RejectedFeedbackManager
        :rejected-answers="feedbacksStore.rejectedAnswers"
        :rejected-loading="feedbacksStore.rejectedLoading"
        :goods-by-category="feedbacksStore.goodsByCategory"
        @update-note="onUpdateRejectedNote"
        @delete="onDeleteRejected"
        @refresh="feedbacksStore.fetchRejectedAnswers"
      />
    </div>

    <!-- Rules View -->
    <div v-else-if="viewMode === 'rules'">
      <FeedbackRulesSection
        :goods-by-category="feedbacksStore.goodsByCategory"
        :feedback-rules="feedbacksStore.feedbackRules"
        :rules-loading="feedbacksStore.rulesLoading"
        @create-rule="onCreateRule"
        @update-rule="onUpdateRule"
        @delete-rule="onDeleteRule"
      />
    </div>

    <!-- Groups View -->
    <div v-else-if="viewMode === 'groups'">
      <GoodsGroupsView
        :goods-by-category="feedbacksStore.goodsByCategory"
        :goods-groups="feedbacksStore.goodsGroups"
        :goods-loading="feedbacksStore.goodsLoading"
        :groups-loading="feedbacksStore.goodsGroupsLoading"
        @merge="onMergeGoods"
        @delete-group="onDeleteGoodsGroup"
        @remove-from-group="onRemoveFromGroup"
      />
    </div>

    <!-- Generate Answer Drawer -->
    <GenerateAnswerDrawer
      v-model:visible="dialog.showGenerateDrawer.value"
      :feedback="dialog.selectedFeedback.value"
      :loading="feedbacksStore.generateLoading"
      :post-loading="dialog.postLoading.value"
      :answer-text="feedbacksStore.generatedAnswer?.answerText || null"
      :error="feedbacksStore.error"
      @accept="onAcceptAnswer"
      @reject="onRejectAnswer"
      @regenerate="onRegenerateAnswer"
    />

    <!-- Answer All Confirm Dialog -->
    <AnswerAllConfirmDialog
      v-model:visible="dialog.showAnswerAllDialog.value"
      :summary-loading="feedbacksStore.summaryLoading"
      :summary="dialog.answerAllSummary.value"
      :error="feedbacksStore.error"
      @confirm-bulk="onConfirmBulk"
    />

    <!-- Auto Answers Drawer -->
    <AutoAnswersDrawer
      v-model:visible="showAutoAnswersDrawer"
      :auto-answer-enabled="feedbacksStore.settings?.autoAnswerEnabled ?? false"
      :settings-loading="feedbacksStore.settingsLoading"
      :stats-loading="feedbacksStore.statsLoading"
      :goods-loading="feedbacksStore.goodsLoading"
      :goods-by-category="feedbacksStore.goodsByCategory"
      :product-stats="feedbacksStore.productStats"
      :product-settings="feedbacksStore.productSettings"
      @update:auto-answer="onToggleAutoAnswer"
      @toggle-product="onToggleProduct"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import Paginator from 'primevue/paginator';
import Chip from 'primevue/chip';
import { toastHelpers, confirmPromise } from '@/utils/ui';
import Message from 'primevue/message';
import { useFeedbacksStore } from '@/stores/feedbacks';
import { useViewReady } from '@/composables/ui';
import { useFeedbacksDialog } from '@/composables/feedbacks/useFeedbacksDialog';
import FeedbackQuotaBadge from '@/components/global/FeedbackQuotaBadge.vue';
import apiClient from '@/api/client';
import {
  FeedbacksStatsCards,
  FeedbacksActionsBar,
  FeedbacksCard,
  GenerateAnswerDrawer,
  AnswerAllConfirmDialog,
  RejectedFeedbackManager,
  GoodsGroupsView,
  FeedbackRulesSection,
  AutoAnswersDrawer,
} from '@/components/feedbacks';
import { ErrorMessage, LoadingSpinner, EmptyState } from '@/components/common';
import type { FeedbackItem, FeedbackTab } from '@/stores/feedbacks';

const feedbacksStore = useFeedbacksStore();
const { viewReady } = useViewReady();
const dialog = useFeedbacksDialog();

const feedbackQuota = ref({ used: 0, max: null as number | null });

async function fetchFeedbackQuota() {
  try {
    const response = await apiClient.get('/user/limits');
    feedbackQuota.value = response.data.feedbackQuota || { used: 0, max: null };
  } catch (error) {
    // ignore
  }
}

const tabs: FeedbackTab[] = ['unanswered', 'ai-posted', 'ai-pending'];

// View mode
const viewMode = ref<'answers' | 'rejected' | 'groups' | 'rules'>('answers');
const viewModeOptions = [
  { label: 'Отзывы', value: 'answers' },
  { label: 'Правки', value: 'rejected' },
  { label: 'Группы', value: 'groups' },
  { label: 'Правила', value: 'rules' },
];

// Tabs
const activeTab = computed(() => feedbacksStore.activeTab);
const activeTabIndex = computed(() => tabs.indexOf(activeTab.value));

const tabLabels = computed(() => ({
  unanswered: `Без ответа${feedbacksStore.pagination.unanswered.totalCount ? ` (${feedbacksStore.pagination.unanswered.totalCount})` : ''}`,
  'ai-posted': `Опубликованные AI${feedbacksStore.pagination['ai-posted'].totalCount ? ` (${feedbacksStore.pagination['ai-posted'].totalCount})` : ''}`,
  'ai-pending': `Не опубликованы AI${feedbacksStore.pagination['ai-pending'].totalCount ? ` (${feedbacksStore.pagination['ai-pending'].totalCount})` : ''}`,
}));

// Drawer visibility
const showAutoAnswersDrawer = ref(false);

// Product filter for ai-posted tab
const selectedGoodFilter = ref<number | null>(null);

const goodsOptions = computed(() => {
  const result: { label: string; value: number }[] = [];
  for (const goods of Object.values(feedbacksStore.goodsByCategory)) {
    for (const item of goods) {
      result.push({ label: item.vendorCode, value: item.nmID });
    }
  }
  // Sort alphabetically by vendor code
  return result.sort((a, b) => a.label.localeCompare(b.label));
});

watch(selectedGoodFilter, async (newVal) => {
  feedbacksStore.setSelectedGood(newVal);
  if (activeTab.value === 'ai-posted') {
    await feedbacksStore.fetchFeedbacks('ai-posted', true);
  }
});

// Page transition animation
const pageChanging = ref(false);

function onTabChange(index: number) {
  const tab = tabs[index];
  feedbacksStore.setActiveTab(tab);
  feedbacksStore.fetchFeedbacks(tab, true);
}

async function onPageChange(event: { first: number; rows: number }) {
  const tab = activeTab.value;
  const currentPageSize = feedbacksStore.pagination[tab].pageSize;
  pageChanging.value = true;

  if (event.rows !== currentPageSize) {
    // Page size changed — reset to page 1 with new size
    await feedbacksStore.setPageSize(tab, event.rows);
  } else {
    // Only page changed
    const page = Math.floor(event.first / event.rows) + 1;
    await feedbacksStore.setPage(tab, page);
  }

  setTimeout(() => {
    pageChanging.value = false;
  }, 200);
}

async function onToggleAutoAnswer(value: boolean) {
  try {
    await feedbacksStore.updateSettings(value);
  } catch {
    // Error handled in store
  }
}

async function onAnswerAll() {
  // Open dialog immediately so user sees the loader while fetching
  dialog.openAnswerAllSummary({ totalCount: 0, groups: [] });
  const summary = await feedbacksStore.fetchUnansweredSummary();
  if (summary) {
    dialog.openAnswerAllSummary(summary);
  }
}

async function onConfirmBulk(nmIds: number[]) {
  if (!nmIds || nmIds.length === 0) return;
  try {
    await feedbacksStore.answerAllFeedbacks(nmIds);
    await fetchFeedbackQuota();
  } catch {
    toastHelpers.error('Ошибка', 'Не удалось запустить обработку отзывов');
  }
}

async function onPostPending() {
  const pendingCount = feedbacksStore.pagination['ai-pending'].totalCount;
  const confirmed = await confirmPromise({
    header: 'Подтверждение публикации',
    message: `Запустить публикацию ${pendingCount} AI-ответов на Wildberries?`,
    acceptLabel: 'Опубликовать',
    rejectLabel: 'Отмена',
  });
  if (!confirmed) return;

  try {
    const result = await feedbacksStore.postPendingAnswers();
    await fetchFeedbackQuota();
    toastHelpers.info(
      'Публикация запущена',
      `Публикация ${result.pendingCount} AI-ответов запущена в фоновом режиме.`,
    );
  } catch {
    toastHelpers.error('Ошибка', 'Не удалось запустить публикацию AI-ответов');
  }
}

async function onGenerate(feedback: FeedbackItem) {
  dialog.openGenerateDrawer(feedback);
  feedbacksStore.clearGeneratedAnswer();

  try {
    await feedbacksStore.generateAnswer(feedback.id, feedback);
    await fetchFeedbackQuota();
  } catch {
    // Error handled in store
  }
}

async function onAcceptAnswer(feedbackId: string) {
  dialog.setPostLoading(true);
  try {
    await feedbacksStore.acceptAnswer(feedbackId);
    await feedbacksStore.fetchStatistics();
    await feedbacksStore.fetchRejectedAnswers();
    await fetchFeedbackQuota();
    dialog.closeGenerateDrawer();
  } catch {
    // Error handled in store
  } finally {
    dialog.setPostLoading(false);
  }
}

async function onRejectAnswer(feedbackId: string, userFeedback?: string) {
  try {
    await feedbacksStore.rejectAnswer(feedbackId, userFeedback);
    if (activeTab.value === 'ai-pending') {
      feedbacksStore.removeFeedback(feedbackId);
    }
    await feedbacksStore.fetchStatistics();
    await feedbacksStore.fetchRejectedAnswers();
    await fetchFeedbackQuota();
    dialog.closeGenerateDrawer();
  } catch {
    // Error handled in store
  }
}

async function onRegenerateAnswer(feedbackId: string, userFeedback?: string) {
  const feedback = dialog.selectedFeedback.value;
  if (!feedback) return;

  try {
    await feedbacksStore.regenerateAnswer(feedbackId, feedback, userFeedback);
    await fetchFeedbackQuota();
  } catch {
    // Error handled in store
  }
}

// Rejected feedback handlers
async function onUpdateRejectedNote(id: string, note: string) {
  try {
    await feedbacksStore.updateRejectedNote(id, note);
  } catch {
    // Error handled in store
  }
}

async function onDeleteRejected(id: string) {
  try {
    await feedbacksStore.deleteRejectedAnswer(id);
  } catch {
    // Error handled in store
  }
}

// Groups handlers
async function onMergeGoods(sourceNmId: number, targetNmId: number) {
  try {
    await feedbacksStore.mergeGoods(sourceNmId, targetNmId);
    await feedbacksStore.fetchStatistics();
  } catch {
    // Error handled in store
  }
}

async function onDeleteGoodsGroup(id: string) {
  try {
    await feedbacksStore.deleteGoodsGroup(id);
    await feedbacksStore.fetchStatistics();
  } catch {
    // Error handled in store
  }
}

async function onRemoveFromGroup(groupId: string, nmId: number) {
  try {
    await feedbacksStore.removeNmIdFromGroup(groupId, nmId);
    await feedbacksStore.fetchStatistics();
  } catch {
    // Error handled in store
  }
}

// Rules handlers
async function onCreateRule(
  rule: Record<string, unknown> & { nmIds: number[] },
) {
  try {
    await feedbacksStore.createFeedbackRule(rule);
  } catch {
    // Error handled in store
  }
}

async function onUpdateRule(id: string, rule: Record<string, unknown>) {
  try {
    await feedbacksStore.updateFeedbackRule(id, rule);
  } catch {
    // Error handled in store
  }
}

async function onDeleteRule(id: string) {
  try {
    await feedbacksStore.deleteFeedbackRule(id);
  } catch {
    // Error handled in store
  }
}

async function onToggleProduct(nmId: number, enabled: boolean) {
  try {
    await feedbacksStore.updateProductSetting(nmId, enabled);
  } catch {
    // Error handled in store
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      feedbacksStore.fetchStatistics(),
      feedbacksStore.fetchSettings(),
      feedbacksStore.fetchFeedbacks('unanswered', true),
      feedbacksStore.fetchGoods(),
      feedbacksStore.fetchRules(),
      feedbacksStore.fetchRejectedAnswers(),
      feedbacksStore.fetchGoodsGroups(),
      fetchFeedbackQuota(),
    ]);
    // Prefetch counts for other tabs so tab labels show numbers immediately
    await Promise.all([
      feedbacksStore.fetchFeedbacks('ai-posted', true, true),
      feedbacksStore.fetchFeedbacks('ai-pending', true, true),
    ]);
  } finally {
    viewReady();
  }
});
</script>
<style scoped>
.feedbacks-paginator :deep(.p-paginator) {
  background: transparent;
  border: none;
  padding: 0.75rem 0;
  gap: 0.25rem;
}
.feedbacks-paginator :deep(.p-paginator-page) {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
  font-size: 0.875rem;
  font-weight: 500;
}
.feedbacks-paginator :deep(.p-paginator-page.p-highlight) {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}
.feedbacks-paginator :deep(.p-paginator-page:not(.p-highlight):hover) {
  background: var(--p-surface-100);
}
.feedbacks-paginator :deep(.p-paginator-first),
.feedbacks-paginator :deep(.p-paginator-prev),
.feedbacks-paginator :deep(.p-paginator-next),
.feedbacks-paginator :deep(.p-paginator-last) {
  border-radius: 0.375rem;
  transition: background 0.15s ease;
}

.feedbacks-list {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.feedbacks-list.page-changing {
  opacity: 0.5;
  transform: translateY(4px);
}
</style>
