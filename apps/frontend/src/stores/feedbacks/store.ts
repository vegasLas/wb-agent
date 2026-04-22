import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { feedbacksAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type {
  FeedbackItem,
  FeedbackStatistics,
  FeedbackSettings,
  FeedbackProductSetting,
  FeedbackTab,
  GeneratedAnswer,
  FeedbackProductRule,
  RejectedAnswerContext,
  GoodsItem,
} from './types';

export const useFeedbacksStore = defineStore('feedbacks', () => {
  const userStore = useUserStore();

  // State
  const feedbacks = ref<FeedbackItem[]>([]);
  const stats = ref<FeedbackStatistics>({ today: 0, week: 0, allTime: 0, products: [] });
  const productStats = ref<Record<number, { postedCount: number; rejectedCount: number }>>({});
  const settings = ref<FeedbackSettings | null>(null);
  const productSettings = ref<FeedbackProductSetting[]>([]);
  const productRules = ref<FeedbackProductRule[]>([]);
  const rejectedAnswers = ref<RejectedAnswerContext[]>([]);
  const goodsByCategory = ref<Record<string, GoodsItem[]>>({});
  const activeTab = ref<FeedbackTab>('unanswered');
  const generatedAnswer = ref<GeneratedAnswer | null>(null);
  const loading = ref(false);
  const answerAllLoading = ref(false);
  const generateLoading = ref(false);
  const statsLoading = ref(false);
  const settingsLoading = ref(false);
  const rulesLoading = ref(false);
  const rejectedLoading = ref(false);
  const goodsLoading = ref(false);
  const error = ref<string | null>(null);

  // Per-tab pagination state
  const cursors = ref<Record<FeedbackTab, string>>({
    unanswered: '',
    'ai-posted': '',
    'ai-pending': '',
  });
  const hasMore = ref<Record<FeedbackTab, boolean>>({
    unanswered: false,
    'ai-posted': false,
    'ai-pending': false,
  });

  // Getters
  const hasFeedbacks = computed(() => feedbacks.value.length > 0);
  const unansweredFeedbacks = computed(() =>
    feedbacks.value.filter((f) => f.answer === null),
  );
  const displayedFeedbacks = computed(() => {
    if (activeTab.value === 'unanswered') return unansweredFeedbacks.value;
    return feedbacks.value;
  });

  function getProductSetting(nmId: number): boolean {
    const setting = productSettings.value.find((s) => s.nmId === nmId);
    return setting?.autoAnswerEnabled ?? true;
  }

  function getProductRule(nmId: number): FeedbackProductRule | undefined {
    return productRules.value.find((r) => r.nmId === nmId);
  }

  // Actions
  async function fetchFeedbacks(tab: FeedbackTab, reset = true) {
    if (!userStore.user?.selectedAccountId) {
      error.value = 'Необходимо выбрать аккаунт';
      return;
    }

    if (reset) {
      feedbacks.value = [];
      cursors.value[tab] = '';
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await feedbacksAPI.fetchFeedbacks({
        tab,
        limit: 100,
        cursor: reset ? '' : cursors.value[tab],
      });

      if (reset) {
        feedbacks.value = response.feedbacks || [];
      } else {
        feedbacks.value.push(...(response.feedbacks || []));
      }

      cursors.value[tab] = response.pages?.next || '';
      hasMore.value[tab] = !!response.pages?.next;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch feedbacks';
      error.value = errorMsg;
    } finally {
      loading.value = false;
    }
  }

  async function loadMoreFeedbacks() {
    await fetchFeedbacks(activeTab.value, false);
  }

  async function fetchStatistics() {
    statsLoading.value = true;
    try {
      const data = await feedbacksAPI.fetchStatistics();
      stats.value = data;
      // Build productStats map
      const map: Record<number, { postedCount: number; rejectedCount: number }> = {};
      for (const p of data.products) {
        map[p.nmId] = { postedCount: p.postedCount, rejectedCount: p.rejectedCount };
      }
      productStats.value = map;
    } catch (err: unknown) {
      console.error('Failed to fetch feedback statistics:', err);
    } finally {
      statsLoading.value = false;
    }
  }

  async function countUnansweredFeedbacks(): Promise<number> {
    try {
      return await feedbacksAPI.countUnansweredFeedbacks();
    } catch (err: unknown) {
      console.error('Failed to count unanswered feedbacks:', err);
      return unansweredFeedbacks.value.length;
    }
  }

  async function fetchSettings() {
    settingsLoading.value = true;
    try {
      const data = await feedbacksAPI.fetchSettings();
      settings.value = data.settings;
      productSettings.value = data.productSettings || [];
    } catch (err: unknown) {
      console.error('Failed to fetch feedback settings:', err);
    } finally {
      settingsLoading.value = false;
    }
  }

  async function updateSettings(autoAnswerEnabled: boolean) {
    try {
      const updated = await feedbacksAPI.updateSettings(autoAnswerEnabled);
      settings.value = updated;
      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update settings';
      error.value = errorMsg;
      throw err;
    }
  }

  async function updateProductSetting(nmId: number, autoAnswerEnabled: boolean) {
    try {
      const updated = await feedbacksAPI.updateProductSetting(
        nmId,
        autoAnswerEnabled,
      );
      const idx = productSettings.value.findIndex((s) => s.nmId === nmId);
      if (idx >= 0) {
        productSettings.value[idx] = updated;
      } else {
        productSettings.value.push(updated);
      }
      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update product setting';
      error.value = errorMsg;
      throw err;
    }
  }

  async function generateAnswer(feedbackId: string, feedback: unknown) {
    generateLoading.value = true;
    error.value = null;

    try {
      const result = await feedbacksAPI.generateAnswer(feedbackId, feedback);
      generatedAnswer.value = result;
      return result;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to generate answer';
      error.value = errorMsg;
      throw err;
    } finally {
      generateLoading.value = false;
    }
  }

  function removeFeedback(feedbackId: string) {
    const index = feedbacks.value.findIndex((f) => f.id === feedbackId);
    if (index !== -1) {
      feedbacks.value.splice(index, 1);
    }
  }

  async function acceptAnswer(feedbackId: string) {
    try {
      await feedbacksAPI.acceptAnswer(feedbackId);
      // Optimistically remove from list — avoids stale data from WB API caching
      removeFeedback(feedbackId);
      generatedAnswer.value = null;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to accept answer';
      error.value = errorMsg;
      throw err;
    }
  }

  async function rejectAnswer(feedbackId: string, userFeedback?: string) {
    try {
      await feedbacksAPI.rejectAnswer(feedbackId, userFeedback);
      generatedAnswer.value = null;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to reject answer';
      error.value = errorMsg;
      throw err;
    }
  }

  async function regenerateAnswer(feedbackId: string, feedback: unknown, userFeedback?: string) {
    generateLoading.value = true;
    error.value = null;

    try {
      const result = await feedbacksAPI.regenerateAnswer(feedbackId, feedback, userFeedback);
      generatedAnswer.value = result;
      return result;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to regenerate answer';
      error.value = errorMsg;
      throw err;
    } finally {
      generateLoading.value = false;
    }
  }

  async function answerAllFeedbacks(): Promise<{
    processed: number;
    posted: number;
    skipped: number;
    failed: number;
  }> {
    answerAllLoading.value = true;
    error.value = null;

    try {
      const result = await feedbacksAPI.answerAllFeedbacks();
      await fetchFeedbacks('unanswered', true);
      await fetchStatistics();
      return result;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to answer all feedbacks';
      error.value = errorMsg;
      throw err;
    } finally {
      answerAllLoading.value = false;
    }
  }

  // Rejected answers
  async function fetchRejectedAnswers() {
    rejectedLoading.value = true;
    try {
      rejectedAnswers.value = await feedbacksAPI.fetchRejectedAnswers();
    } catch (err: unknown) {
      console.error('Failed to fetch rejected answers:', err);
    } finally {
      rejectedLoading.value = false;
    }
  }

  async function updateRejectedNote(id: string, userFeedback: string) {
    try {
      await feedbacksAPI.updateRejected(id, userFeedback);
      const idx = rejectedAnswers.value.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rejectedAnswers.value[idx] = { ...rejectedAnswers.value[idx], userFeedback };
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update rejected answer';
      error.value = errorMsg;
      throw err;
    }
  }

  async function updateRejectedNmIds(id: string, nmIds: number[]) {
    try {
      await feedbacksAPI.updateRejected(id, undefined, nmIds);
      const idx = rejectedAnswers.value.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rejectedAnswers.value[idx] = { ...rejectedAnswers.value[idx], nmIds };
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update rejected nmIds';
      error.value = errorMsg;
      throw err;
    }
  }

  async function deleteRejectedAnswer(id: string) {
    try {
      await feedbacksAPI.deleteRejected(id);
      const idx = rejectedAnswers.value.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rejectedAnswers.value.splice(idx, 1);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to delete rejected answer';
      error.value = errorMsg;
      throw err;
    }
  }

  // Rules
  async function fetchRules() {
    rulesLoading.value = true;
    try {
      productRules.value = await feedbacksAPI.fetchProductRules();
    } catch (err: unknown) {
      console.error('Failed to fetch product rules:', err);
    } finally {
      rulesLoading.value = false;
    }
  }

  async function updateRule(nmId: number, rule: Partial<FeedbackProductRule>) {
    try {
      const updated = await feedbacksAPI.updateProductRule(nmId, rule);
      const idx = productRules.value.findIndex((r) => r.nmId === nmId);
      if (idx >= 0) {
        productRules.value[idx] = updated;
      } else {
        productRules.value.push(updated);
      }
      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update product rule';
      error.value = errorMsg;
      throw err;
    }
  }

  function setActiveTab(tab: FeedbackTab) {
    activeTab.value = tab;
  }

  function clearGeneratedAnswer() {
    generatedAnswer.value = null;
  }

  function clearFeedbacks() {
    feedbacks.value = [];
    generatedAnswer.value = null;
    error.value = null;
    cursors.value = { unanswered: '', 'ai-posted': '', 'ai-pending': '' };
    hasMore.value = { unanswered: false, 'ai-posted': false, 'ai-pending': false };
  }

  return {
    // State
    feedbacks: readonly(feedbacks),
    stats: readonly(stats),
    productStats: readonly(productStats),
    settings: readonly(settings),
    productSettings: readonly(productSettings),
    productRules: readonly(productRules),
    rejectedAnswers: readonly(rejectedAnswers),
    goodsByCategory: readonly(goodsByCategory),
    activeTab: readonly(activeTab),
    generatedAnswer: readonly(generatedAnswer),
    loading: readonly(loading),
    answerAllLoading: readonly(answerAllLoading),
    generateLoading: readonly(generateLoading),
    statsLoading: readonly(statsLoading),
    settingsLoading: readonly(settingsLoading),
    rulesLoading: readonly(rulesLoading),
    rejectedLoading: readonly(rejectedLoading),
    goodsLoading: readonly(goodsLoading),
    error: readonly(error),
    cursors: readonly(cursors),
    hasMore: readonly(hasMore),

    // Getters
    hasFeedbacks,
    unansweredFeedbacks,
    displayedFeedbacks,

    // Actions
    fetchFeedbacks,
    loadMoreFeedbacks,
    fetchStatistics,
    countUnansweredFeedbacks,
    fetchSettings,
    updateSettings,
    updateProductSetting,
    generateAnswer,
    acceptAnswer,
    rejectAnswer,
    regenerateAnswer,
    answerAllFeedbacks,
    setActiveTab,
    clearGeneratedAnswer,
    clearFeedbacks,
    getProductSetting,
    getProductRule,
    removeFeedback,
    fetchRules,
    updateRule,
    fetchRejectedAnswers,
    updateRejectedNote,
    updateRejectedNmIds,
    deleteRejectedAnswer,
    fetchGoods,
  };

  async function fetchGoods() {
    goodsLoading.value = true;
    try {
      goodsByCategory.value = await feedbacksAPI.fetchGoodsByCategory();
    } catch (err: unknown) {
      console.error('Failed to fetch goods:', err);
    } finally {
      goodsLoading.value = false;
    }
  }
});
