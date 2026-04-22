<template>
  <div class="space-y-3">
    <!-- Stats Cards -->
    <FeedbacksStatsCards :stats="feedbacksStore.stats" />

    <!-- Actions Bar -->
    <FeedbacksActionsBar
      :settings-loading="feedbacksStore.settingsLoading"
      :answer-all-loading="feedbacksStore.answerAllLoading"
      :unanswered-count="unansweredCount"
      @open-auto-answers="showAutoAnswersDrawer = true"
      @answer-all="onAnswerAll"
    />

    <!-- View Mode Switch -->
    <div class="flex justify-center">
      <SelectButton
        v-model="viewMode"
        :options="viewModeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        class="text-sm"
      />
    </div>

    <!-- Error Message -->
    <ErrorMessage v-if="feedbacksStore.error" :message="feedbacksStore.error" />

    <!-- Answers View -->
    <div v-if="viewMode === 'answers'">
      <TabView
        :active-index="activeTabIndex"
        @update:active-index="onTabChange"
      >
        <TabPanel header="Без ответа">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'unanswered'"
          />
          <div
            v-else-if="feedbacksStore.unansweredFeedbacks.length > 0"
            class="space-y-3"
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
            v-else
            icon="pi pi-inbox"
            message="Нет отзывов без ответа"
          />
          <div
            v-if="
              feedbacksStore.hasMore['unanswered'] && !feedbacksStore.loading
            "
            class="flex justify-center mt-4"
          >
            <Button
              label="Загрузить ещё"
              icon="pi pi-chevron-down"
              severity="secondary"
              @click="onLoadMore"
            />
          </div>
        </TabPanel>

        <TabPanel header="Опубликованные AI">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'ai-posted'"
          />
          <div
            v-else-if="feedbacksStore.feedbacks.length > 0"
            class="space-y-3"
          >
            <FeedbacksCard
              v-for="feedback in feedbacksStore.feedbacks"
              :key="feedback.id"
              :feedback="feedback"
              tab="ai-posted"
            />
          </div>
          <EmptyState
            v-else
            icon="pi pi-check-circle"
            message="Нет опубликованных AI-ответов"
          />
          <div
            v-if="
              feedbacksStore.hasMore['ai-posted'] && !feedbacksStore.loading
            "
            class="flex justify-center mt-4"
          >
            <Button
              label="Загрузить ещё"
              icon="pi pi-chevron-down"
              severity="secondary"
              @click="onLoadMore"
            />
          </div>
        </TabPanel>

        <TabPanel header="Не опубликованы AI">
          <LoadingSpinner
            v-if="feedbacksStore.loading && activeTab === 'ai-pending'"
          />
          <div
            v-else-if="feedbacksStore.feedbacks.length > 0"
            class="space-y-3"
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
            v-else
            icon="pi pi-inbox"
            message="Нет неопубликованных AI-ответов"
          />
          <div
            v-if="
              feedbacksStore.hasMore['ai-pending'] && !feedbacksStore.loading
            "
            class="flex justify-center mt-4"
          >
            <Button
              label="Загрузить ещё"
              icon="pi pi-chevron-down"
              severity="secondary"
              @click="onLoadMore"
            />
          </div>
        </TabPanel>

        <TabPanel header="Правила">
          <FeedbackRulesSection
            :goods-by-category="feedbacksStore.goodsByCategory"
            :product-rules="feedbacksStore.productRules"
            :product-settings="feedbacksStore.productSettings"
            :goods-loading="feedbacksStore.goodsLoading"
            :rules-loading="feedbacksStore.rulesLoading"
            @update-rule="onUpdateRule"
            @toggle-product="onToggleProduct"
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
      :count="dialog.unansweredCountForDialog.value"
      :loading="feedbacksStore.answerAllLoading"
      :result="dialog.answerAllResult.value"
      :error="feedbacksStore.error"
      @confirm="onConfirmAnswerAll"
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
import { computed, onMounted, ref } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import { useFeedbacksStore } from '@/stores/feedbacks';
import { useViewReady } from '@/composables/ui';
import { useFeedbacksDialog } from '@/composables/feedbacks/useFeedbacksDialog';
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

const tabs: FeedbackTab[] = ['unanswered', 'ai-posted', 'ai-pending'];

// View mode
const viewMode = ref<'answers' | 'rejected' | 'groups'>('answers');
const viewModeOptions = [
  { label: 'Отзывы', value: 'answers' },
  { label: 'Правки', value: 'rejected' },
  { label: 'Группы', value: 'groups' },
];

// Tabs
const activeTab = computed(() => feedbacksStore.activeTab);
const activeTabIndex = computed(() => tabs.indexOf(activeTab.value));
const unansweredCount = computed(
  () => feedbacksStore.unansweredFeedbacks.length,
);

// Drawer visibility
const showAutoAnswersDrawer = ref(false);

function onTabChange(index: number) {
  const tab = tabs[index];
  feedbacksStore.setActiveTab(tab);
  feedbacksStore.fetchFeedbacks(tab, true);
}

async function onLoadMore() {
  await feedbacksStore.loadMoreFeedbacks();
}

async function onToggleAutoAnswer(value: boolean) {
  try {
    await feedbacksStore.updateSettings(value);
  } catch {
    // Error handled in store
  }
}

async function onAnswerAll() {
  try {
    const count =
      (await feedbacksStore.countUnansweredFeedbacks?.()) ??
      unansweredCount.value;
    dialog.openAnswerAllDialog(count);
  } catch {
    dialog.openAnswerAllDialog(unansweredCount.value);
  }
}

async function onConfirmAnswerAll() {
  try {
    const result = await feedbacksStore.answerAllFeedbacks();
    dialog.setAnswerAllResult(result);
  } catch {
    dialog.setAnswerAllResult(null);
  }
}

async function onGenerate(feedback: FeedbackItem) {
  dialog.openGenerateDrawer(feedback);
  feedbacksStore.clearGeneratedAnswer();

  try {
    await feedbacksStore.generateAnswer(feedback.id, feedback);
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
async function onUpdateRule(nmId: number, rule: Record<string, unknown>) {
  try {
    await feedbacksStore.updateRule(nmId, rule);
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
    ]);
  } finally {
    viewReady();
  }
});
</script>
