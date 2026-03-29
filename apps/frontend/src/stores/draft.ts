import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { draftsAPI } from '../api';
import type { Draft, DraftGood } from '../types';

export interface FetchDraftsOptions {
  accountId: string;
  supplierId: string;
}

export const useDraftStore = defineStore('draft', () => {
  // ============================================
  // State
  // ============================================
  const drafts = ref<Draft[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Track last fetch params to avoid redundant fetches
  const lastFetchKey = ref<string | null>(null);

  // Modal state
  const showGoodsModal = ref(false);
  const draftGoods = ref<DraftGood[]>([]);
  const loadingGoods = ref(false);

  // Active promise for request deduplication
  let activeFetchPromise: Promise<Draft[]> | null = null;

  // ============================================
  // Getters
  // ============================================
  const draftOptions = computed(() => [
    { label: 'Выберите черновик', value: null },
    ...drafts.value.map((d) => ({
      label: `${new Date(d.createdAt).toLocaleDateString('ru-RU')} | товары: ${d.goodQuantity}, артикулы: ${d.barcodeQuantity}`,
      value: d.id,
    })),
  ]);

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Creates a unique key for fetch params to track deduplication
   */
  function getFetchKey(accountId: string, supplierId: string): string {
    return `${accountId}:${supplierId}`;
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Fetches drafts for the given account and supplier.
   * Implements request deduplication - concurrent calls with same params
   * will share the same promise.
   */
  async function fetchDrafts(
    options: FetchDraftsOptions,
    force = false,
  ): Promise<Draft[]> {
    const { accountId, supplierId } = options;
    const fetchKey = getFetchKey(accountId, supplierId);

    // If same fetch is already in progress, return the existing promise
    if (activeFetchPromise && lastFetchKey.value === fetchKey && !force) {
      return activeFetchPromise;
    }

    // If data already exists for this key and not forcing refresh, return cached
    if (!force && lastFetchKey.value === fetchKey && drafts.value.length > 0) {
      return Promise.resolve(drafts.value);
    }

    loading.value = true;
    error.value = null;
    lastFetchKey.value = fetchKey;

    // Create and store the promise for deduplication
    activeFetchPromise = (async (): Promise<Draft[]> => {
      try {
        const data = await draftsAPI.fetchDrafts(accountId, supplierId);
        drafts.value = data;
        return data;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to fetch drafts';
        error.value = errorMsg;
        throw err;
      } finally {
        loading.value = false;
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  }

  /**
   * Forces a refresh of drafts even if data exists.
   */
  async function refreshDrafts(options: FetchDraftsOptions): Promise<Draft[]> {
    return fetchDrafts(options, true);
  }

  /**
   * Fetches and displays goods for a specific draft.
   * Opens the modal and loads the goods data.
   */
  async function showDraftGoods(
    draftId: string,
    supplierId?: string,
  ): Promise<void> {
    // Get account info from user store via window context
    // This is done lazily to avoid circular dependency
    const { useUserStore } = await import('./user');
    const userStore = useUserStore();

    const accountId = userStore.selectedAccount?.id;
    const effectiveSupplierId =
      supplierId ?? userStore.activeSupplier?.supplierId;

    if (!accountId || !effectiveSupplierId) {
      console.error(
        'Cannot fetch draft goods: missing accountId or supplierId',
      );
      return;
    }

    loadingGoods.value = true;
    showGoodsModal.value = true;

    try {
      const data = await draftsAPI.fetchDraftGoods(
        draftId,
        accountId,
        effectiveSupplierId,
      );
      draftGoods.value = data;
    } catch (err: unknown) {
      console.error('Failed to fetch draft goods:', err);
      draftGoods.value = [];
    } finally {
      loadingGoods.value = false;
    }
  }

  return {
    // State (readonly to prevent direct mutations)
    drafts: readonly(drafts),
    loading: readonly(loading),
    error: readonly(error),
    showGoodsModal: readonly(showGoodsModal),
    draftGoods: readonly(draftGoods),
    loadingGoods: readonly(loadingGoods),

    // Getters
    draftOptions,

    // Actions
    fetchDrafts,
    refreshDrafts,
    showDraftGoods,
  };
});
