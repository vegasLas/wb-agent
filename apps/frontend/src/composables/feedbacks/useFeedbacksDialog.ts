/**
 * useFeedbacksDialog
 * Encapsulates dialog state and actions for the feedbacks view.
 */

import { ref, computed } from 'vue';
import type { FeedbackItem, ProcessResult } from '@/stores/feedbacks';

export function useFeedbacksDialog() {
  const showGenerateDialog = ref(false);
  const showAnswerAllDialog = ref(false);
  const selectedFeedback = ref<FeedbackItem | null>(null);
  const postLoading = ref(false);
  const answerAllResult = ref<ProcessResult | null>(null);
  const unansweredCountForDialog = ref(0);

  const hasSelectedFeedback = computed(() => selectedFeedback.value !== null);

  function openGenerateDialog(feedback: FeedbackItem) {
    selectedFeedback.value = feedback;
    showGenerateDialog.value = true;
  }

  function closeGenerateDialog() {
    showGenerateDialog.value = false;
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
    showGenerateDialog,
    showAnswerAllDialog,
    selectedFeedback,
    postLoading,
    answerAllResult,
    unansweredCountForDialog,
    hasSelectedFeedback,

    // Actions
    openGenerateDialog,
    closeGenerateDialog,
    openAnswerAllDialog,
    closeAnswerAllDialog,
    setPostLoading,
    setAnswerAllResult,
  };
}
