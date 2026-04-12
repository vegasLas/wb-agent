import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { suppliesAPI } from '../api';
import { useRescheduleStore } from './reschedules';
import type { SupplyDetails, SupplyGood } from '../types';

export const useSupplyDetailsStore = defineStore('supplyDetails', () => {
  // Supply details state
  const supplyGoods = ref<SupplyGood[]>([]);
  const supplyDetails = ref<SupplyDetails | null>(null);
  const loadingSupplyDetails = ref(false);
  const supplyGoodsError = ref<string | null>(null);
  const supplyRemoved = ref(false);

  // Modal state
  const showModal = ref(false);
  const selectedSupplyId = ref<string | null>(null);

  // Getters
  const currentDetails = computed(() => supplyDetails.value);

  // Actions
  async function getSupplyDetails(supplyId: string) {
    loadingSupplyDetails.value = true;
    supplyGoodsError.value = null;
    supplyRemoved.value = false;

    try {
      const response = await suppliesAPI.fetchSupplyDetails(supplyId);
      if (response.success) {
        supplyGoods.value = response.data?.goods || [];
        supplyDetails.value = response.data?.supply || null;
      } else {
        // Handle API error response (success: false)
        const errorResponse = response as unknown as {
          success: false;
          error: string;
        };
        if (errorResponse.error === 'SUPPLY_REMOVED') {
          supplyRemoved.value = true;
          supplyGoodsError.value = 'Поставка была удалена';
        } else {
          supplyGoodsError.value =
            errorResponse.error || 'Failed to get supply details';
        }
        supplyGoods.value = [];
        supplyDetails.value = null;
      }
    } catch (err: unknown) {
      // Handle network/unexpected errors
      console.error('Failed to get supply details:', err);
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get supply details';
      supplyGoodsError.value = errorMsg;
      supplyGoods.value = [];
      supplyDetails.value = null;
    } finally {
      loadingSupplyDetails.value = false;
    }
  }

  // Clear supply goods
  function clearSupplyGoods() {
    supplyGoods.value = [];
    supplyDetails.value = null;
    supplyGoodsError.value = null;
    supplyRemoved.value = false;
  }

  // Get reschedule by supply ID (moved from reschedule store for better separation)
  function getRescheduleBySupplyId(supplyId: string) {
    const rescheduleStore = useRescheduleStore();
    const reschedule = rescheduleStore.reschedules.find(
      (reschedule) => reschedule.supplyId === supplyId,
    );
    return reschedule;
  }

  // Modal management functions
  async function openModal(supplyId: string) {
    selectedSupplyId.value = supplyId;
    showModal.value = true;
    await getSupplyDetails(supplyId);
  }

  function closeModal() {
    showModal.value = false;
    selectedSupplyId.value = null;
    clearSupplyGoods();
  }

  return {
    // State
    supplyGoods: readonly(supplyGoods),
    supplyDetails: readonly(supplyDetails),
    loadingSupplyDetails: readonly(loadingSupplyDetails),
    supplyGoodsError: readonly(supplyGoodsError),
    supplyRemoved: readonly(supplyRemoved),
    showModal: readonly(showModal),
    selectedSupplyId: readonly(selectedSupplyId),

    // Getters
    currentDetails,

    // Actions
    getSupplyDetails,
    clearSupplyGoods,
    getRescheduleBySupplyId,
    openModal,
    closeModal,
  };
});
