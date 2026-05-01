import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { mpstatsAPI } from '@/api';
import { useAppToast } from '@/utils/ui/toast';
import type {
  MpstatsCard,
  MpstatsSkuSummary,
} from '@/api/mpstats/types';
import { mpstatsAPI } from '@/api';

export const useMpstatsStore = defineStore('mpstats', () => {
  const toast = useAppToast();

  // State
  const searchQuery = ref('');
  const searchResults = ref<MpstatsCard[]>([]);
  const favorites = ref<MpstatsCard[]>([]);
  const history = ref<MpstatsCard[]>([]);
  const selectedSkuSummary = ref<MpstatsSkuSummary | null>(null);

  const loadingSearch = ref(false);
  const loadingFavorites = ref(false);
  const loadingHistory = ref(false);
  const loadingSummary = ref(false);
  const addingFavorite = ref<number | null>(null);
  const removingFavorite = ref<number | null>(null);

  const searchError = ref<string | null>(null);
  const favoritesError = ref<string | null>(null);
  const historyError = ref<string | null>(null);
  const summaryError = ref<string | null>(null);

  // Getters
  const favoriteNmIds = computed(() => {
    return new Set(favorites.value.map((f) => f.nmID));
  });

  const isFavorite = computed(() => {
    return (nmID: number) => favoriteNmIds.value.has(nmID);
  });

  // Actions
  async function searchItem(nmId: number) {
    loadingSearch.value = true;
    searchError.value = null;
    searchResults.value = [];
    try {
      const result = await mpstatsAPI.getItemFull(nmId);
      const card: MpstatsCard = {
        nmID: result.data.nmID,
        name: result.data.name,
        brand: result.data.brand,
        subjectName: result.data.subjectName,
        image: result.data.image,
        favourite: result.data.favourite,
      };
      searchResults.value = [card];
      return searchResults.value;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search item';
      searchError.value = msg;
      throw err;
    } finally {
      loadingSearch.value = false;
    }
  }

  async function fetchFavorites() {
    loadingFavorites.value = true;
    favoritesError.value = null;
    try {
      const result = await mpstatsAPI.getFavorites();
      favorites.value = result.data || [];
      return favorites.value;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load favorites';
      favoritesError.value = msg;
      throw err;
    } finally {
      loadingFavorites.value = false;
    }
  }

  async function fetchHistory() {
    loadingHistory.value = true;
    historyError.value = null;
    try {
      const result = await mpstatsAPI.getHistory();
      history.value = result.data || [];
      return history.value;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load history';
      historyError.value = msg;
      throw err;
    } finally {
      loadingHistory.value = false;
    }
  }

  async function addFavorite(card: MpstatsCard) {
    addingFavorite.value = card.nmID;
    try {
      await mpstatsAPI.saveCard(card);
      await mpstatsAPI.addFavorite(card.nmID);
      if (!favoriteNmIds.value.has(card.nmID)) {
        favorites.value.unshift(card);
      }
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Товар добавлен в избранное',
        life: 3000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add favorite';
      throw new Error(msg);
    } finally {
      addingFavorite.value = null;
    }
  }

  async function removeFavorite(nmID: number) {
    removingFavorite.value = nmID;
    try {
      await mpstatsAPI.removeFavorite(nmID);
      favorites.value = favorites.value.filter((f) => f.nmID !== nmID);
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Товар удален из избранного',
        life: 3000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove favorite';
      throw new Error(msg);
    } finally {
      removingFavorite.value = null;
    }
  }

  async function toggleFavorite(card: MpstatsCard) {
    if (favoriteNmIds.value.has(card.nmID)) {
      await removeFavorite(card.nmID);
    } else {
      await addFavorite(card);
    }
  }

  async function updateFavoriteTitle(nmID: number, customTitle: string | null) {
    try {
      await mpstatsAPI.updateFavoriteTitle(nmID, customTitle);
      const favorite = favorites.value.find((f) => f.nmID === nmID);
      if (favorite) {
        favorite.customTitle = customTitle || '';
      }
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Название обновлено',
        life: 2000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update title';
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: msg,
        life: 3000,
      });
      throw err;
    }
  }

  async function fetchSkuSummary(nmId: number) {
    loadingSummary.value = true;
    summaryError.value = null;
    selectedSkuSummary.value = null;
    try {
      const result = await mpstatsAPI.getSkuSummary(nmId);
      selectedSkuSummary.value = result.data;
      return selectedSkuSummary.value;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load SKU summary';
      summaryError.value = msg;
      throw err;
    } finally {
      loadingSummary.value = false;
    }
  }

  return {
    searchQuery,
    searchResults,
    favorites,
    history,
    selectedSkuSummary,
    loadingSearch,
    loadingFavorites,
    loadingHistory,
    loadingSummary,
    addingFavorite,
    removingFavorite,
    searchError,
    favoritesError,
    historyError,
    summaryError,
    favoriteNmIds,
    isFavorite,
    searchItem,
    fetchFavorites,
    fetchHistory,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateFavoriteTitle,
    fetchSkuSummary,
  };
});
