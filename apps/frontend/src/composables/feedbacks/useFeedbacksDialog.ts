/**
 * useFeedbacksDialog
 * Encapsulates drawer state and actions for the feedbacks view.
 */

import { ref, computed } from 'vue';
import type { FeedbackItem, ProcessResult, UnansweredSummary } from '@/stores/feedbacks';

export function useFeedbacksDialog() {
  const showGenerateDrawer = ref(false);
  const showAnswerAllDialog = ref(false);
  const selectedFeedback = ref<FeedbackItem | null>(null);
  const postLoading = ref(false);
  const answerAllResult = ref<ProcessResult | null>(null);
  const unansweredCountForDialog = ref(0);
  const answerAllSummary = ref<UnansweredSummary | null>(null);
  const selectedNmId = ref<number | null>(null);
  const selectedNmIds = ref<number[]>([]);
  const showConfirmNmId = ref(false);
  const showConfirmBulk = ref(false);

  const hasSelectedFeedback = computed(() => selectedFeedback.value !== null);
  const selectedCount = computed(() => selectedNmIds.value.length);

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

  function openAnswerAllSummary(summary: UnansweredSummary) {
    answerAllSummary.value = summary;
    answerAllResult.value = null;
    selectedNmId.value = null;
    selectedNmIds.value = [];
    showConfirmNmId.value = false;
    showConfirmBulk.value = false;
    showAnswerAllDialog.value = true;
  }

  function closeAnswerAllDialog() {
    showAnswerAllDialog.value = false;
    answerAllResult.value = null;
    answerAllSummary.value = null;
    selectedNmId.value = null;
    selectedNmIds.value = [];
    showConfirmNmId.value = false;
    showConfirmBulk.value = false;
  }

  function selectNmIdForAnswer(nmId: number) {
    selectedNmId.value = nmId;
    showConfirmNmId.value = true;
  }

  function cancelConfirmNmId() {
    selectedNmId.value = null;
    showConfirmNmId.value = false;
  }

  function setSelectedNmIds(nmIds: number[]) {
    selectedNmIds.value = nmIds;
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
    answerAllSummary,
    selectedNmId,
    selectedNmIds,
    showConfirmNmId,
    showConfirmBulk,
    hasSelectedFeedback,
    selectedCount,

    // Actions
    openGenerateDrawer,
    closeGenerateDrawer,
    openAnswerAllDialog,
    openAnswerAllSummary,
    closeAnswerAllDialog,
    selectNmIdForAnswer,
    cancelConfirmNmId,
    setSelectedNmIds,
    setPostLoading,
    setAnswerAllResult,
  };
}
