<template>
  <div class="space-y-4">
    <!-- Stats Cards -->
    <FeedbacksStatsCards :stats="feedbacksStore.stats" />

    <!-- Actions Bar -->
    <FeedbacksActionsBar
      :auto-answer-enabled="feedbacksStore.settings?.autoAnswerEnabled ?? false"
      :settings-loading="feedbacksStore.settingsLoading"
      :answer-all-loading="feedbacksStore.answerAllLoading"
      :unanswered-count="unansweredCount"
      @update:auto-answer="onToggleAutoAnswer"
      @answer-all="onAnswerAll"
    />

    <!-- Error Message -->
    <ErrorMessage
      v-if="feedbacksStore.error"
      :message="feedbacksStore.error"
    />

    <!-- Tabs -->
    <TabView
      :active-index="activeTabIndex"
      @update:active-index="onTabChange"
    >
      <TabPanel header="Без ответа">
        <LoadingSpinner v-if="feedbacksStore.loading && activeTab === 'unanswered'" />
        <div v-else-if="feedbacksStore.unansweredFeedbacks.length > 0" class="space-y-3">
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
        <div v-if="feedbacksStore.hasMore['unanswered'] && !feedbacksStore.loading" class="flex justify-center mt-4">
          <Button
            label="Загрузить ещё"
            icon="pi pi-chevron-down"
            severity="secondary"
            @click="onLoadMore"
          />
        </div>
      </TabPanel>

      <TabPanel header="Опубликованные AI">
        <LoadingSpinner v-if="feedbacksStore.loading && activeTab === 'ai-posted'" />
        <div v-else-if="feedbacksStore.feedbacks.length > 0" class="space-y-3">
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
        <div v-if="feedbacksStore.hasMore['ai-posted'] && !feedbacksStore.loading" class="flex justify-center mt-4">
          <Button
            label="Загрузить ещё"
            icon="pi pi-chevron-down"
            severity="secondary"
            @click="onLoadMore"
          />
        </div>
      </TabPanel>

      <TabPanel header="Не опубликованы AI">
        <LoadingSpinner v-if="feedbacksStore.loading && activeTab === 'ai-pending'" />
        <div v-else-if="feedbacksStore.feedbacks.length > 0" class="space-y-3">
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
        <div v-if="feedbacksStore.hasMore['ai-pending'] && !feedbacksStore.loading" class="flex justify-center mt-4">
          <Button
            label="Загрузить ещё"
            icon="pi pi-chevron-down"
            severity="secondary"
            @click="onLoadMore"
          />
        </div>
      </TabPanel>
    </TabView>

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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import { useFeedbacksStore } from '@/stores/feedbacks';
import { useViewReady } from '@/composables/ui';
import { useFeedbacksDialog } from '@/composables/feedbacks/useFeedbacksDialog';
import {
  FeedbacksStatsCards,
  FeedbacksActionsBar,
  FeedbacksCard,
  GenerateAnswerDrawer,
  AnswerAllConfirmDialog,
} from '@/components/feedbacks';
import { ErrorMessage, LoadingSpinner, EmptyState } from '@/components/common';
import type { FeedbackItem, FeedbackTab } from '@/stores/feedbacks';

const feedbacksStore = useFeedbacksStore();
const { viewReady } = useViewReady();
const dialog = useFeedbacksDialog();

const tabs: FeedbackTab[] = ['unanswered', 'ai-posted', 'ai-pending'];

// Tabs
const activeTab = computed(() => feedbacksStore.activeTab);
const activeTabIndex = computed(() => tabs.indexOf(activeTab.value));
const unansweredCount = computed(() => feedbacksStore.unansweredFeedbacks.length);

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
    const count = await feedbacksStore.countUnansweredFeedbacks?.() ?? unansweredCount.value;
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
    // On ai-pending tab, the rejected item should disappear from the list
    if (activeTab.value === 'ai-pending') {
      feedbacksStore.removeFeedback(feedbackId);
    }
    await feedbacksStore.fetchStatistics();
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

onMounted(async () => {
  try {
    await Promise.all([
      feedbacksStore.fetchStatistics(),
      feedbacksStore.fetchSettings(),
      feedbacksStore.fetchFeedbacks('unanswered', true),
    ]);
  } finally {
    viewReady();
  }
});
</script>
