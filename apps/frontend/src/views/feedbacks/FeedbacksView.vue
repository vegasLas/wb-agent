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
      v-model:visible="showGenerateDialog"
      :feedback="selectedFeedback"
      :loading="feedbacksStore.generateLoading"
      :post-loading="postLoading"
      :answer-text="feedbacksStore.generatedAnswer?.answerText || null"
      :error="feedbacksStore.error"
      @accept="onAcceptAnswer"
      @reject="onRejectAnswer"
    />

    <!-- Answer All Confirm Dialog -->
    <AnswerAllConfirmDialog
      v-model:visible="showAnswerAllDialog"
      :count="unansweredCountForDialog"
      :loading="feedbacksStore.answerAllLoading"
      :result="answerAllResult"
      :error="feedbacksStore.error"
      @confirm="onConfirmAnswerAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { useFeedbacksStore } from '@/stores/feedbacks';
import { useViewReady } from '@/composables/ui';
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

// Dialog state
const showGenerateDialog = ref(false);
const showAnswerAllDialog = ref(false);
const selectedFeedback = ref<FeedbackItem | null>(null);
const postLoading = ref(false);
const answerAllResult = ref<{ processed: number; posted: number; skipped: number; failed: number } | null>(null);
const unansweredCountForDialog = ref(0);

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
  } catch (err) {
    // Error handled in store
  }
}

async function onAnswerAll() {
  // Fetch count first
  try {
    const count = await feedbacksStore.countUnansweredFeedbacks?.() ?? unansweredCount.value;
    unansweredCountForDialog.value = count;
    answerAllResult.value = null;
    showAnswerAllDialog.value = true;
  } catch (err) {
    // Fallback to current count
    unansweredCountForDialog.value = unansweredCount.value;
    answerAllResult.value = null;
    showAnswerAllDialog.value = true;
  }
}

async function onConfirmAnswerAll() {
  try {
    const result = await feedbacksStore.answerAllFeedbacks();
    answerAllResult.value = result;
  } catch (err) {
    answerAllResult.value = null;
  }
}

async function onGenerate(feedback: FeedbackItem) {
  selectedFeedback.value = feedback;
  showGenerateDialog.value = true;
  feedbacksStore.clearGeneratedAnswer();

  try {
    await feedbacksStore.generateAnswer(feedback.id);
  } catch (err) {
    // Error handled in store
  }
}

async function onAcceptAnswer(feedbackId: string) {
  postLoading.value = true;
  try {
    await feedbacksStore.acceptAnswer(feedbackId);
    showGenerateDialog.value = false;
    selectedFeedback.value = null;
  } catch (err) {
    // Error handled in store
  } finally {
    postLoading.value = false;
  }
}

async function onRejectAnswer(feedbackId: string) {
  try {
    await feedbacksStore.rejectAnswer(feedbackId);
    showGenerateDialog.value = false;
    selectedFeedback.value = null;
  } catch (err) {
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
