import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { draftsAPI } from '../api';
import { api } from '../api';
import type { Draft, DraftGood } from '../types';

export const useDraftStore = defineStore('draft', () => {
  // State
  const drafts = ref<Draft[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedDraftId = ref<string | null>(null);
  const showGoodsModal = ref(false);
  const draftGoods = ref<DraftGood[]>([]);
  const loadingGoods = ref(false);

  // Getters
  const draftCount = computed(() => drafts.value.length);

  const selectedDraft = computed(() =>
    drafts.value.find((d) => d.id === selectedDraftId.value)
  );

  const getDraftById = computed(() => {
    return (id: string) => drafts.value.find((d) => d.id === id);
  });

  const draftOptions = computed(() =>
    drafts.value.map((d) => ({
      label: d.name,
      value: d.id,
    }))
  );

  // Actions
  async function fetchDrafts() {
    try {
      loading.value = true;
      error.value = null;
      const data = await draftsAPI.fetchDrafts();
      drafts.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch drafts';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function selectDraft(id: string | null) {
    selectedDraftId.value = id;
  }

  async function showDraftGoods(draftId: string, supplierId?: string) {
    try {
      loadingGoods.value = true;
      showGoodsModal.value = true;
      
      const response = await api.get(`/drafts/${draftId}/goods`, {
        params: supplierId ? { supplierId } : undefined
      });
      
      if (response.data && response.data.success) {
        draftGoods.value = response.data.data.map((good: any) => ({
          article: good.sa || good.article,
          image: good.imgSrc || good.image,
          name: good.subjectName || good.name,
          quantity: good.quantity,
        })) || [];
      } else {
        draftGoods.value = [];
      }
    } catch (err: any) {
      console.error('Failed to fetch draft goods:', err);
      draftGoods.value = [];
    } finally {
      loadingGoods.value = false;
    }
  }

  function closeGoodsModal() {
    showGoodsModal.value = false;
    draftGoods.value = [];
  }

  return {
    // State
    drafts: readonly(drafts),
    loading: readonly(loading),
    error: readonly(error),
    selectedDraftId: readonly(selectedDraftId),
    showGoodsModal: readonly(showGoodsModal),
    draftGoods: readonly(draftGoods),
    loadingGoods: readonly(loadingGoods),

    // Getters
    draftCount,
    selectedDraft,
    getDraftById,
    draftOptions,

    // Actions
    fetchDrafts,
    selectDraft,
    showDraftGoods,
    closeGoodsModal,
  };
});
