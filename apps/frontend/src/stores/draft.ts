import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { draftsAPI } from '../api';
import type { Draft } from '../types';

export const useDraftStore = defineStore('draft', () => {
  // State
  const drafts = ref<Draft[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedDraftId = ref<string | null>(null);

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

  return {
    // State
    drafts: readonly(drafts),
    loading: readonly(loading),
    error: readonly(error),
    selectedDraftId: readonly(selectedDraftId),

    // Getters
    draftCount,
    selectedDraft,
    getDraftById,
    draftOptions,

    // Actions
    fetchDrafts,
    selectDraft,
  };
});
