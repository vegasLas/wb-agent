import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { promotionsAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type {
  PromotionItem,
  PromotionDetail,
  PromotionExcelItem,
  ParticipationCounts,
} from './types';

export const usePromotionsStore = defineStore('promotions', () => {
  const userStore = useUserStore();

  // State
  const promotions = ref<PromotionItem[]>([]);
  const selectedPromotion = ref<PromotionItem | null>(null);
  const promotionDetail = ref<PromotionDetail | null>(null);
  const _excelItems = ref<PromotionExcelItem[]>([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const excelLoading = ref(false);
  const error = ref<string | null>(null);
  const detailError = ref<string | null>(null);
  const excelError = ref<string | null>(null);
  const reportPending = ref(false);
  const estimatedWaitTime = ref<number | null>(null);
  const participationCounts = ref<ParticipationCounts | null>(null);

  // Getters
  const hasPromotions = computed(() => promotions.value.length > 0);
  const excelItems = computed(() => _excelItems.value);

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

  async function fetchExcel(
    periodID: number,
    isRecovery = true,
    hasStarted?: boolean,
  ) {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      excelError.value = prerequisiteError;
      return;
    }

    excelLoading.value = true;
    excelError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    _excelItems.value = [];

    try {
      const response = await promotionsAPI.fetchExcel({
        periodID,
        isRecovery,
        hasStarted,
      });

      if (response.error) {
        excelError.value = response.error;
        reportPending.value = response.reportPending || false;
        estimatedWaitTime.value = response.estimatedWaitTime || null;
        return;
      }

      _excelItems.value = response.items || [];
      reportPending.value = false;
      estimatedWaitTime.value = null;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch promotion Excel';
      excelError.value = errorMsg;
      _excelItems.value = [];
      reportPending.value = false;
      estimatedWaitTime.value = null;
    } finally {
      excelLoading.value = false;
    }
  }

  /**
   * Convenience action: fetch detail then auto-fetch Excel if periodID exists
   */
  async function selectPromotionAndLoadExcel(
    promoID: number,
    isRecovery = true,
    hasStarted?: boolean,
  ) {
    await fetchDetail(promoID);
    if (promotionDetail.value?.periodID) {
      await fetchExcel(
        promotionDetail.value.periodID,
        isRecovery,
        hasStarted,
      );
    }
  }

  /**
   * Apply promotion recovery with selected items
   */
  async function applyRecovery(
    selectedItems: string[],
    isRecovery: boolean,
  ): Promise<boolean> {
    const prerequisiteError = checkPrerequisites();
    if (prerequisiteError) {
      excelError.value = prerequisiteError;
      return false;
    }

    const periodID = promotionDetail.value?.periodID;
    if (!periodID) {
      excelError.value = 'ID периода не найден';
      return false;
    }

    excelLoading.value = true;
    excelError.value = null;

    try {
      await promotionsAPI.applyRecovery({
        periodID,
        selectedItems,
        isRecovery,
      });
      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to apply promotion recovery';
      excelError.value = errorMsg;
      return false;
    } finally {
      excelLoading.value = false;
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
    _excelItems.value = [];
    error.value = null;
    detailError.value = null;
    excelError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    participationCounts.value = null;
  }

  function clearExcelData() {
    _excelItems.value = [];
    excelError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    excelLoading.value = false;
  }

  return {
    // State
    promotions: readonly(promotions),
    selectedPromotion: readonly(selectedPromotion),
    promotionDetail: readonly(promotionDetail),
    loading: readonly(loading),
    detailLoading: readonly(detailLoading),
    excelLoading: readonly(excelLoading),
    error: readonly(error),
    detailError: readonly(detailError),
    excelError: readonly(excelError),
    reportPending: readonly(reportPending),
    estimatedWaitTime: readonly(estimatedWaitTime),
    participationCounts: readonly(participationCounts),

    // Getters
    hasPromotions,
    excelItems,

    // Actions
    fetchTimeline,
    fetchDetail,
    fetchExcel,
    selectPromotionAndLoadExcel,
    selectPromotion,
    clearPromotions,
    clearExcelData,
    applyRecovery,
  };
});
