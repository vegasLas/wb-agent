/**
 * useFeedbacksDialog
 * Encapsulates drawer state and actions for the feedbacks view.
 */

import { ref, computed } from 'vue';
import type { FeedbackItem, UnansweredSummary } from '@/stores/feedbacks';

export function useFeedbacksDialog() {
  const showGenerateDrawer = ref(false);
  const showAnswerAllDialog = ref(false);
  const selectedFeedback = ref<FeedbackItem | null>(null);
  const postLoading = ref(false);
  const unansweredCountForDialog = ref(0);
  const answerAllSummary = ref<UnansweredSummary | null>(null);

  const hasSelectedFeedback = computed(() => selectedFeedback.value !== null);

  function openGenerateDrawer(feedback: FeedbackItem) {
    selectedFeedback.value = feedback;
    showGenerateDrawer.value = true;
  }

  function closeGenerateDrawer() {
    showGenerateDrawer.value = false;
    selectedFeedback.value = null;
  }

  function openAnswerAllDialog(count: number) {
    unansweredCountForDialog.value = count;
    showAnswerAllDialog.value = true;
  }

  function openAnswerAllSummary(summary: UnansweredSummary) {
    answerAllSummary.value = summary;
    showAnswerAllDialog.value = true;
  }

  function closeAnswerAllDialog() {
    showAnswerAllDialog.value = false;
    answerAllSummary.value = null;
  }

  function setPostLoading(value: boolean) {
    postLoading.value = value;
  }

  return {
    // State (readonly in consuming component)
    showGenerateDrawer,
    showAnswerAllDialog,
    selectedFeedback,
    postLoading,
    unansweredCountForDialog,
    answerAllSummary,
    hasSelectedFeedback,

    // Actions
    openGenerateDrawer,
    closeGenerateDrawer,
    openAnswerAllDialog,
    openAnswerAllSummary,
    closeAnswerAllDialog,
    setPostLoading,
  };
}
