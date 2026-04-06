import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { promotionsAPI } from '../api';
import { useUserStore } from './user';
import type {
  PromotionItem,
  PromotionDetail,
  PromotionExcelItem,
} from '../types';

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

  // Getters
  const hasPromotions = computed(() => promotions.value.length > 0);
  const excelItems = computed(() => _excelItems.value);
  const excelMeta = computed(() => null); // Meta removed, keeping for backward compatibility

  // Actions
  async function fetchTimeline(
    startDate?: string,
    endDate?: string,
    filter = 'PARTICIPATING',
  ) {
    if (!userStore.user?.selectedAccountId) {
      error.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      error.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      error.value = 'Необходимо активировать подписку';
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
    if (!userStore.user?.selectedAccountId) {
      detailError.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      detailError.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      detailError.value = 'Необходимо активировать подписку';
      return;
    }

    detailLoading.value = true;
    detailError.value = null;
    promotionDetail.value = null;

    try {
      const response = await promotionsAPI.fetchDetail({ promoID });
      promotionDetail.value = response.data || null;
      const found = promotions.value.find((p) => p.promoID === promoID) || null;
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
    retryCount = 1,
  ) {
    if (!userStore.user?.selectedAccountId) {
      excelError.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      excelError.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      excelError.value = 'Необходимо активировать подписку';
      return;
    }

    excelLoading.value = true;
    excelError.value = null;
    reportPending.value = false;
    estimatedWaitTime.value = null;
    _excelItems.value = [];

    try {
      const response = await promotionsAPI.fetchExcel({ periodID, isRecovery });

      if (response.error) {
        excelError.value = response.error;
        reportPending.value = response.reportPending || false;
        estimatedWaitTime.value = response.estimatedWaitTime || null;

        if (response.reportPending && retryCount > 0) {
          const waitMs = (response.estimatedWaitTime || 5) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          excelLoading.value = false;
          return fetchExcel(periodID, isRecovery, retryCount - 1);
        }
        return;
      }

      // Response now contains items directly instead of parsedData
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
  ) {
    await fetchDetail(promoID);
    if (promotionDetail.value?.periodID) {
      await fetchExcel(promotionDetail.value.periodID, isRecovery);
    }
  }

  /**
   * Apply promotion recovery with selected items
   *
   * isRecovery: true = recover only selected items (add to promotion)
   * isRecovery: false = exclude selected items (remove from promotion, keep others)
   */
  async function applyRecovery(
    selectedItems: string[],
    isRecovery: boolean,
  ): Promise<boolean> {
    if (!userStore.user?.selectedAccountId) {
      excelError.value = 'Необходимо выбрать аккаунт';
      return false;
    }
    if (!userStore.hasValidSupplier) {
      excelError.value = 'Необходимо выбрать поставщика';
      return false;
    }
    if (!userStore.subscriptionActive) {
      excelError.value = 'Необходимо активировать подписку';
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

    // Getters
    hasPromotions,
    excelItems,
    excelMeta,

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
