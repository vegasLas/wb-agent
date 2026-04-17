import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { advertsAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type { AdvertItem, PresetInfo } from './types';

export const useAdvertsStore = defineStore('adverts', () => {
  const userStore = useUserStore();

  // State
  const adverts = ref<AdvertItem[]>([]);
  const selectedAdvert = ref<AdvertItem | null>(null);
  const presetInfo = ref<PresetInfo | null>(null);
  const loading = ref(false);
  const presetLoading = ref(false);
  const error = ref<string | null>(null);
  const presetError = ref<string | null>(null);
  const totalCount = ref(0);
  const pauseCount = ref(0);

  // Pagination state for adverts
  const currentPage = ref(1);
  const pageSize = ref(10);
  const filterState = ref<number | undefined>(undefined);

  // Pagination state for preset info
  const presetCurrentPage = ref(1);
  const presetPageSize = ref(20);
  const presetFilterState = ref<number | undefined>(1);
  const presetTotalCount = ref(0);

  // Getters
  const hasAdverts = computed(() => adverts.value.length > 0);
  const hasPresetInfo = computed(() => presetInfo.value !== null);
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));
  const presetTotalPages = computed(() =>
    Math.ceil(presetTotalCount.value / presetPageSize.value),
  );

  // Actions
  async function fetchAdverts(
    page = 1,
    size = 10,
    state?: number,
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
      const response = await advertsAPI.fetchAdverts({
        pageNumber: page,
        pageSize: size,
        filterState: state,
      });

      adverts.value = response.content || [];
      totalCount.value = response.counts?.totalCount || 0;
      pauseCount.value = response.counts?.pauseCount || 0;
      currentPage.value = page;
      pageSize.value = size;
      filterState.value = state;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch adverts';
      error.value = errorMsg;
      adverts.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchPresetInfo(
    advertId: number,
    nmId: number,
    page = 1,
    size = 20,
    state?: number,
  ) {
    if (!userStore.user?.selectedAccountId) {
      presetError.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      presetError.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      presetError.value = 'Необходимо активировать подписку';
      return;
    }

    presetLoading.value = true;
    presetError.value = null;
    presetInfo.value = null;

    try {
      const response = await advertsAPI.fetchAdvertPresetInfo({
        advertId,
        nmId,
        pageNumber: page,
        pageSize: size,
        filterState: state,
      });

      presetInfo.value = {
        items: response.items || [],
        total: response.total,
        count: response.count,
      };
      presetTotalCount.value = response.count || 0;
      presetCurrentPage.value = page;
      presetPageSize.value = size;
      presetFilterState.value = state;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch preset info';
      presetError.value = errorMsg;
      presetInfo.value = null;
    } finally {
      presetLoading.value = false;
    }
  }

  function selectAdvert(advert: AdvertItem) {
    selectedAdvert.value = advert;
  }

  function clearAdverts() {
    adverts.value = [];
    selectedAdvert.value = null;
    presetInfo.value = null;
    error.value = null;
    presetError.value = null;
    totalCount.value = 0;
    pauseCount.value = 0;
    currentPage.value = 1;
    filterState.value = undefined;
    presetCurrentPage.value = 1;
  }

  function clearPresetInfo() {
    presetInfo.value = null;
    presetError.value = null;
    presetCurrentPage.value = 1;
    presetFilterState.value = 1;
  }

  return {
    // State
    adverts: readonly(adverts),
    selectedAdvert: readonly(selectedAdvert),
    presetInfo: readonly(presetInfo),
    loading: readonly(loading),
    presetLoading: readonly(presetLoading),
    error: readonly(error),
    presetError: readonly(presetError),
    totalCount: readonly(totalCount),
    pauseCount: readonly(pauseCount),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    filterState: readonly(filterState),
    presetCurrentPage: readonly(presetCurrentPage),
    presetPageSize: readonly(presetPageSize),
    presetFilterState: readonly(presetFilterState),
    presetTotalCount: readonly(presetTotalCount),

    // Getters
    hasAdverts,
    hasPresetInfo,
    totalPages,
    presetTotalPages,

    // Actions
    fetchAdverts,
    fetchPresetInfo,
    selectAdvert,
    clearAdverts,
    clearPresetInfo,
  };
});
