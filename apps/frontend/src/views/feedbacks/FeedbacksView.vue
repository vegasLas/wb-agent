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
        <FeedbacksTable
          v-else-if="feedbacksStore.unansweredFeedbacks.length > 0"
          :feedbacks="feedbacksStore.unansweredFeedbacks"
          @generate="onGenerate"
        />
        <EmptyState
          v-else
          icon="pi pi-inbox"
          message="Нет отзывов без ответа"
        />
      </TabPanel>

      <TabPanel header="С ответом">
        <LoadingSpinner v-if="feedbacksStore.loading && activeTab === 'answered'" />
        <FeedbacksTable
          v-else-if="feedbacksStore.answeredFeedbacks.length > 0"
          :feedbacks="feedbacksStore.answeredFeedbacks"
          @generate="onGenerate"
        />
        <EmptyState
          v-else
          icon="pi pi-check-circle"
          message="Нет отзывов с ответом"
        />
      </TabPanel>
    </TabView>

    <!-- Generate Answer Dialog -->
    <GenerateAnswerDialog
      v-model:visible="dialog.showGenerateDialog.value"
      :feedback="dialog.selectedFeedback.value"
      :loading="feedbacksStore.generateLoading"
      :post-loading="dialog.postLoading.value"
      :answer-text="feedbacksStore.generatedAnswer?.answerText || null"
      :error="feedbacksStore.error"
      @accept="onAcceptAnswer"
      @reject="onRejectAnswer"
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
import { useFeedbacksStore } from '@/stores/feedbacks';
import { useViewReady } from '@/composables/ui';
import { useFeedbacksDialog } from '@/composables/feedbacks/useFeedbacksDialog';
import {
  FeedbacksStatsCards,
  FeedbacksActionsBar,
  FeedbacksTable,
  GenerateAnswerDialog,
  AnswerAllConfirmDialog,
} from '@/components/feedbacks';
import { ErrorMessage, LoadingSpinner, EmptyState } from '@/components/common';
import type { FeedbackItem } from '@/stores/feedbacks';

const feedbacksStore = useFeedbacksStore();
const { viewReady } = useViewReady();
const dialog = useFeedbacksDialog();

// Tabs
const activeTab = computed(() => feedbacksStore.activeTab);
const activeTabIndex = computed(() => (activeTab.value === 'unanswered' ? 0 : 1));
const unansweredCount = computed(() => feedbacksStore.unansweredFeedbacks.length);

function onTabChange(index: number) {
  const tab = index === 0 ? 'unanswered' : 'answered';
  feedbacksStore.setActiveTab(tab);
  feedbacksStore.fetchFeedbacks(tab === 'answered', true);
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
  dialog.openGenerateDialog(feedback);
  feedbacksStore.clearGeneratedAnswer();

  try {
    await feedbacksStore.generateAnswer(feedback.id);
  } catch {
    // Error handled in store
  }
}

async function onAcceptAnswer(feedbackId: string) {
  dialog.setPostLoading(true);
  try {
    await feedbacksStore.acceptAnswer(feedbackId);
    dialog.closeGenerateDialog();
  } catch {
    // Error handled in store
  } finally {
    dialog.setPostLoading(false);
  }
}

async function onRejectAnswer(feedbackId: string) {
  try {
    await feedbacksStore.rejectAnswer(feedbackId);
    dialog.closeGenerateDialog();
  } catch {
    // Error handled in store
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      feedbacksStore.fetchStatistics(),
      feedbacksStore.fetchSettings(),
      feedbacksStore.fetchFeedbacks(false, true),
    ]);
  } finally {
    viewReady();
  }
});
</script>
