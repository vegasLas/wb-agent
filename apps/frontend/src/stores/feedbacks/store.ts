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
  FeedbackRule,
  RejectedAnswerContext,
  FeedbackGoodsGroup,
  GoodsItem,
  CreateFeedbackRuleInput,
  FeedbacksResponse,
  UnansweredSummary,
} from './types';

export const useFeedbacksStore = defineStore('feedbacks', () => {
  const userStore = useUserStore();

  // State
  const feedbacks = ref<FeedbackItem[]>([]);
  const stats = ref<FeedbackStatistics>({ today: 0, week: 0, allTime: 0, products: [] });
  const productStats = ref<Record<number, { postedCount: number; rejectedCount: number }>>({});
  const settings = ref<FeedbackSettings | null>(null);
  const productSettings = ref<FeedbackProductSetting[]>([]);
  const feedbackRules = ref<FeedbackRule[]>([]);
  const rejectedAnswers = ref<RejectedAnswerContext[]>([]);
  const goodsGroups = ref<FeedbackGoodsGroup[]>([]);
  const goodsByCategory = ref<Record<string, GoodsItem[]>>({});
  const activeTab = ref<FeedbackTab>('unanswered');
  const generatedAnswer = ref<GeneratedAnswer | null>(null);
  const loading = ref(false);
  const answerAllLoading = ref(false);
  const postPendingLoading = ref(false);
  const generateLoading = ref(false);
  const statsLoading = ref(false);
  const settingsLoading = ref(false);
  const rulesLoading = ref(false);
  const rejectedLoading = ref(false);
  const goodsGroupsLoading = ref(false);
  const goodsLoading = ref(false);
  const summaryLoading = ref(false);
  const error = ref<string | null>(null);
  const unansweredSummary = ref<UnansweredSummary | null>(null);

  // Per-tab pagination state
  const pagination = ref<Record<FeedbackTab, FeedbacksResponse['pagination']>>({
    unanswered: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
    'ai-posted': { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
    'ai-pending': { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
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
    return setting?.autoAnswerEnabled ?? false;
  }

  function getFeedbackRule(nmId: number): FeedbackRule | undefined {
    return feedbackRules.value.find((r) => r.nmIds.includes(nmId));
  }

  // Actions
  async function fetchFeedbacks(tab: FeedbackTab, reset = true, silent = false) {
    if (!userStore.user?.selectedAccountId) {
      error.value = 'Необходимо выбрать аккаунт';
      return;
    }

    if (reset) {
      if (!silent) {
        feedbacks.value = [];
      }
      pagination.value[tab].page = 1;
    }

    if (!silent) {
      loading.value = true;
    }
    error.value = null;

    try {
      const response = await feedbacksAPI.fetchFeedbacks({
        tab,
        page: pagination.value[tab].page,
        pageSize: pagination.value[tab].pageSize,
      });

      if (!silent) {
        feedbacks.value = response.feedbacks || [];
      }
      pagination.value[tab] = response.pagination;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch feedbacks';
      error.value = errorMsg;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  async function setPage(tab: FeedbackTab, page: number) {
    pagination.value[tab].page = page;
    await fetchFeedbacks(tab, false);
  }

  async function setPageSize(tab: FeedbackTab, size: number) {
    pagination.value[tab].pageSize = size;
    pagination.value[tab].page = 1;
    await fetchFeedbacks(tab, false);
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

  async function fetchUnansweredSummary(): Promise<UnansweredSummary | null> {
    summaryLoading.value = true;
    error.value = null;
    try {
      const data = await feedbacksAPI.fetchUnansweredSummary();
      unansweredSummary.value = data;
      return data;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch unanswered summary';
      error.value = errorMsg;
      return null;
    } finally {
      summaryLoading.value = false;
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

  async function answerAllFeedbacks(nmIds: number[]): Promise<{
    started: true;
    nmIdsCount: number;
  }> {
    answerAllLoading.value = true;
    error.value = null;

    try {
      const result = await feedbacksAPI.answerAllFeedbacks(nmIds);
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

  async function postPendingAnswers(): Promise<{
    started: true;
    pendingCount: number;
  }> {
    postPendingLoading.value = true;
    error.value = null;

    try {
      const result = await feedbacksAPI.postPendingAnswers();
      return result;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to post pending answers';
      error.value = errorMsg;
      throw err;
    } finally {
      postPendingLoading.value = false;
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

  // Goods groups
  async function fetchGoodsGroups() {
    goodsGroupsLoading.value = true;
    try {
      goodsGroups.value = await feedbacksAPI.fetchGoodsGroups();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch goods groups';
      error.value = errorMsg;
      console.error('Failed to fetch goods groups:', err);
    } finally {
      goodsGroupsLoading.value = false;
    }
  }

  async function createGoodsGroup(nmIds: number[]) {
    try {
      const group = await feedbacksAPI.createGoodsGroup(nmIds);
      goodsGroups.value.push(group);
      return group;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create goods group';
      error.value = errorMsg;
      throw err;
    }
  }

  async function updateGoodsGroup(id: string, nmIds: number[]) {
    try {
      const group = await feedbacksAPI.updateGoodsGroup(id, nmIds);
      const idx = goodsGroups.value.findIndex((g) => g.id === id);
      if (idx >= 0) {
        goodsGroups.value[idx] = group;
      }
      return group;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update goods group';
      error.value = errorMsg;
      throw err;
    }
  }

  async function deleteGoodsGroup(id: string) {
    try {
      await feedbacksAPI.deleteGoodsGroup(id);
      const idx = goodsGroups.value.findIndex((g) => g.id === id);
      if (idx >= 0) {
        goodsGroups.value.splice(idx, 1);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to delete goods group';
      error.value = errorMsg;
      throw err;
    }
  }

  async function mergeGoods(sourceNmId: number, targetNmId: number) {
    try {
      const group = await feedbacksAPI.mergeGoods(sourceNmId, targetNmId);
      // Refresh groups to ensure consistency
      await fetchGoodsGroups();
      return group;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to merge goods';
      error.value = errorMsg;
      throw err;
    }
  }

  async function removeNmIdFromGroup(groupId: string, nmId: number) {
    try {
      await feedbacksAPI.removeNmIdFromGroup(groupId, nmId);
      await fetchGoodsGroups();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to remove good from group';
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
      feedbackRules.value = await feedbacksAPI.fetchFeedbackRules();
    } catch (err: unknown) {
      console.error('Failed to fetch product rules:', err);
    } finally {
      rulesLoading.value = false;
    }
  }

  async function createFeedbackRule(input: CreateFeedbackRuleInput) {
    try {
      const created = await feedbacksAPI.createFeedbackRule(input);
      feedbackRules.value.push(created);
      return created;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create feedback rule';
      error.value = errorMsg;
      throw err;
    }
  }

  async function updateFeedbackRule(id: string, input: Partial<CreateFeedbackRuleInput>) {
    try {
      const updated = await feedbacksAPI.updateFeedbackRule(id, input);
      const idx = feedbackRules.value.findIndex((r) => r.id === id);
      if (idx >= 0) {
        feedbackRules.value[idx] = updated;
      }
      return updated;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update feedback rule';
      error.value = errorMsg;
      throw err;
    }
  }

  async function deleteFeedbackRule(id: string) {
    try {
      await feedbacksAPI.deleteFeedbackRule(id);
      const idx = feedbackRules.value.findIndex((r) => r.id === id);
      if (idx >= 0) {
        feedbackRules.value.splice(idx, 1);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to delete feedback rule';
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
    pagination.value = {
      unanswered: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
      'ai-posted': { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
      'ai-pending': { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, next: null, prev: null },
    };
  }

  return {
    // State
    feedbacks: readonly(feedbacks),
    stats: readonly(stats),
    productStats: readonly(productStats),
    settings: readonly(settings),
    productSettings: readonly(productSettings),
    feedbackRules: readonly(feedbackRules),
    rejectedAnswers: readonly(rejectedAnswers),
    goodsGroups: readonly(goodsGroups),
    goodsByCategory: readonly(goodsByCategory),
    activeTab: readonly(activeTab),
    generatedAnswer: readonly(generatedAnswer),
    loading: readonly(loading),
    answerAllLoading: readonly(answerAllLoading),
    postPendingLoading: readonly(postPendingLoading),
    generateLoading: readonly(generateLoading),
    statsLoading: readonly(statsLoading),
    settingsLoading: readonly(settingsLoading),
    rulesLoading: readonly(rulesLoading),
    rejectedLoading: readonly(rejectedLoading),
    goodsGroupsLoading: readonly(goodsGroupsLoading),
    goodsLoading: readonly(goodsLoading),
    summaryLoading: readonly(summaryLoading),
    unansweredSummary: readonly(unansweredSummary),
    error: readonly(error),
    pagination: readonly(pagination),

    // Getters
    hasFeedbacks,
    unansweredFeedbacks,
    displayedFeedbacks,

    // Actions
    fetchFeedbacks,
    setPage,
    setPageSize,
    fetchStatistics,
    fetchUnansweredSummary,
    fetchSettings,
    updateSettings,
    updateProductSetting,
    generateAnswer,
    acceptAnswer,
    rejectAnswer,
    regenerateAnswer,
    answerAllFeedbacks,
    postPendingAnswers,
    setActiveTab,
    clearGeneratedAnswer,
    clearFeedbacks,
    getProductSetting,
    getFeedbackRule,
    removeFeedback,
    fetchRules,
    createFeedbackRule,
    updateFeedbackRule,
    deleteFeedbackRule,
    fetchRejectedAnswers,
    updateRejectedNote,
    deleteRejectedAnswer,
    fetchGoodsGroups,
    createGoodsGroup,
    updateGoodsGroup,
    deleteGoodsGroup,
    mergeGoods,
    removeNmIdFromGroup,
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
