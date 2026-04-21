/**
 * useFeedbacksDialog
 * Encapsulates drawer state and actions for the feedbacks view.
 */

import { ref, computed } from 'vue';
import type { FeedbackItem, ProcessResult } from '@/stores/feedbacks';

export function useFeedbacksDialog() {
  const showGenerateDrawer = ref(false);
  const showAnswerAllDialog = ref(false);
  const selectedFeedback = ref<FeedbackItem | null>(null);
  const postLoading = ref(false);
  const answerAllResult = ref<ProcessResult | null>(null);
  const unansweredCountForDialog = ref(0);

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
    answerAllResult.value = null;
    showAnswerAllDialog.value = true;
  }

  function closeAnswerAllDialog() {
    showAnswerAllDialog.value = false;
    answerAllResult.value = null;
  }

  function setPostLoading(value: boolean) {
    postLoading.value = value;
  }

  function setAnswerAllResult(result: ProcessResult | null) {
    answerAllResult.value = result;
  }

  return {
    // State (readonly in consuming component)
    showGenerateDrawer,
    showAnswerAllDialog,
    selectedFeedback,
    postLoading,
    answerAllResult,
    unansweredCountForDialog,
    hasSelectedFeedback,

    // Actions
    openGenerateDrawer,
    closeGenerateDrawer,
    openAnswerAllDialog,
    closeAnswerAllDialog,
    setPostLoading,
    setAnswerAllResult,
  };
}
