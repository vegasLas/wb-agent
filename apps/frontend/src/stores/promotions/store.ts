import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { promotionsAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type {
  PromotionItem,
  PromotionDetail,
  PromotionGoodsItem,
  ParticipationCounts,
} from './types';

export const usePromotionsStore = defineStore('promotions', () => {
  const userStore = useUserStore();

  // State
  const promotions = ref<PromotionItem[]>([]);
  const selectedPromotion = ref<PromotionItem | null>(null);
  const promotionDetail = ref<PromotionDetail | null>(null);
  const _goodsItems = ref<PromotionGoodsItem[]>([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const goodsLoading = ref(false);
  const error = ref<string | null>(null);
  const detailError = ref<string | null>(null);
  const goodsError = ref<string | null>(null);
  const reportPending = ref(false);
  const estimatedWaitTime = ref<number | null>(null);
  const participationCounts = ref<ParticipationCounts | null>(null);

  // Getters
  const hasPromotions = computed(() => promotions.value.length > 0);
  const goodsItems = computed(() => _goodsItems.value);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function checkPrerequisites(): string | null {
    if (!userStore.user?.selectedAccountId) {
      return 'Необходимо выбрать аккаунт';
    }
    if (!userStore.hasValidSupplier) {
      return 'Необходимо выбрать поставщика';
    }

    return null;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function fetchTimeline(
    startDate?: string,
    endDate?: string,
    filter = 'PARTICIPATING',
  ) {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      error.value = prerequisiteError;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await promotionsAPI.fetchTimeline({
        startDate,
        endDate,
        filter,
      });
      promotions.value = response.data?.promotions || [];
      participationCounts.value = response.data?.participationCounts || null;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to fetch promotions timeline';
      error.value = errorMsg;
      promotions.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail(promoID: number) {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      detailError.value = prerequisiteError;
      return;
    }

    detailLoading.value = true;
    detailError.value = null;
    promotionDetail.value = null;

    try {
      const response = await promotionsAPI.fetchDetail({ promoID });
      promotionDetail.value = response.data || null;
      const found =
        promotions.value.find((p) => p.promoID === promoID) || null;
      selectedPromotion.value = found;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch promotion detail';
      detailError.value = errorMsg;
      promotionDetail.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  async function fetchGoods(
    promoID: number,
    periodID: number,
    mode: 'participating' | 'excluded',
  ) {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      goodsError.value = prerequisiteError;
      return;
    }

    goodsLoading.value = true;
    goodsError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    _goodsItems.value = [];

    try {
      const response = await promotionsAPI.fetchGoods({
        promoID,
        periodID,
        mode,
      });

      if (response.error) {
        goodsError.value = response.error;
        reportPending.value = response.reportPending || false;
        estimatedWaitTime.value = response.estimatedWaitTime || null;
        return;
      }

      _goodsItems.value = response.items || [];
      reportPending.value = false;
      estimatedWaitTime.value = null;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch promotion goods';
      goodsError.value = errorMsg;
      _goodsItems.value = [];
      reportPending.value = false;
      estimatedWaitTime.value = null;
    } finally {
      goodsLoading.value = false;
    }
  }

  /**
   * Convenience action: fetch detail then auto-fetch goods if periodID exists
   */
  async function selectPromotionAndLoadGoods(
    promoID: number,
    isRecovery = true,
  ) {
    await fetchDetail(promoID);
    if (promotionDetail.value?.periodID) {
      const mode = isRecovery ? 'excluded' : 'participating';
      await fetchGoods(
        promoID,
        promotionDetail.value.periodID,
        mode,
      );
    }
  }

  /**
   * Apply promotion management with selected items
   */
  async function applyManagement(
    selectedItems: string[],
    isRecovery: boolean,
  ): Promise<boolean> {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      goodsError.value = prerequisiteError;
      return false;
    }

    const promoID = promotionDetail.value?.promoID;
    if (!promoID) {
      goodsError.value = 'ID акции не найден';
      return false;
    }

    goodsLoading.value = true;
    goodsError.value = null;

    try {
      await promotionsAPI.applyManagement({
        promoID,
        selectedItems,
        isRecovery,
      });
      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to apply promotion management';
      goodsError.value = errorMsg;
      return false;
    } finally {
      goodsLoading.value = false;
    }
  }

  function selectPromotion(promoID: number) {
    const found = promotions.value.find((p) => p.promoID === promoID) || null;
    selectedPromotion.value = found;
  }

  function clearPromotions() {
    promotions.value = [];
    selectedPromotion.value = null;
    promotionDetail.value = null;
    _goodsItems.value = [];
    error.value = null;
    detailError.value = null;
    goodsError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    participationCounts.value = null;
  }

  function clearGoodsData() {
    _goodsItems.value = [];
    goodsError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    goodsLoading.value = false;
  }

  return {
    // State
    promotions: readonly(promotions),
    selectedPromotion: readonly(selectedPromotion),
    promotionDetail: readonly(promotionDetail),
    loading: readonly(loading),
    detailLoading: readonly(detailLoading),
    goodsLoading: readonly(goodsLoading),
    error: readonly(error),
    detailError: readonly(detailError),
    goodsError: readonly(goodsError),
    reportPending: readonly(reportPending),
    estimatedWaitTime: readonly(estimatedWaitTime),
    participationCounts: readonly(participationCounts),

    // Getters
    hasPromotions,
    goodsItems,

    // Actions
    fetchTimeline,
    fetchDetail,
    fetchGoods,
    selectPromotionAndLoadGoods,
    selectPromotion,
    clearPromotions,
    clearGoodsData,
    applyManagement,
  };
});
