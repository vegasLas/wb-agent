import { computed, ref, type ComputedRef } from 'vue';
import { useDraftStore, type FetchDraftsOptions } from '@/stores/drafts';
import { useUserStore } from '@/stores/user';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseDraftsFetcherOptions {
  /** Auto-fetch on mount if drafts are empty */
  immediate?: boolean;
  /** Optional accountId override (defaults to selectedAccount from user store) */
  accountId?: ComputedRef<string | undefined>;
  /** Optional supplierId override (defaults to activeSupplier from user store) */
  supplierId?: ComputedRef<string | undefined>;
}

/**
 * Composable for managing drafts fetching with deduplication and auto-fetching.
 *
 * This solves the common problem of multiple components trying to fetch drafts
 * simultaneously, causing duplicate requests.
 *
 * The store's `fetchDrafts` is the SINGLE method that fetches and assigns data.
 * This composable wraps it with convenience methods.
 *
 * @example
 * // Auto-fetch on mount
 * const { fetch, refresh, isLoading } = useDraftsFetcher();
 *
 * @example
 * // Manual control
 * const { fetch, isEmpty } = useDraftsFetcher({ immediate: false });
 * onMounted(() => {
 *   if (isEmpty.value) fetch();
 * });
 */
export function useDraftsFetcher(options: UseDraftsFetcherOptions = {}) {
  const draftStore = useDraftStore();
  const userStore = useUserStore();

  // Track fetch status locally for this composable instance
  const status = ref<FetchStatus>(draftStore.loading ? 'loading' : 'idle');

  // Use provided IDs or fall back to user store
  const effectiveAccountId =
    options.accountId ?? computed(() => userStore.selectedAccount?.id);
  const effectiveSupplierId =
    options.supplierId ?? computed(() => userStore.activeSupplier?.supplierId);

  // Check if we have valid credentials
  const hasCredentials = computed(() =>
    Boolean(effectiveAccountId.value && effectiveSupplierId.value),
  );

  // Check if drafts are empty
  const isEmpty = computed(() => draftStore.drafts.length === 0);

  // Check if currently loading (either from store or local)
  const isLoading = computed(
    () => status.value === 'loading' || draftStore.loading,
  );

  // Check if fetch was successful
  const isSuccess = computed(() => status.value === 'success');

  // Get error if any
  const error = computed(() => draftStore.error);

  /**
   * SINGLE method that gets drafts and assigns them to data.
   * Delegates to store.fetchDrafts which handles the actual fetch + assignment.
   */
  async function fetchDrafts(force = false): Promise<void> {
    if (!hasCredentials.value) {
      throw new Error('Cannot fetch drafts: missing accountId or supplierId');
    }

    const opts: FetchDraftsOptions = {
      accountId: effectiveAccountId.value!,
      supplierId: effectiveSupplierId.value!,
    };

    status.value = 'loading';

    try {
      // This is the SINGLE store method that fetches and assigns data
      await draftStore.fetchDrafts(opts, force);
      status.value = 'success';
    } catch (err) {
      status.value = 'error';
      throw err;
    }
  }

  /**
   * Fetches drafts if credentials are available.
   * Uses fetchDrafts internally.
   */
  async function fetch(): Promise<void> {
    return fetchDrafts(false);
  }

  /**
   * Forces a refresh of drafts even if data exists.
   * Uses fetchDrafts internally with force=true.
   */
  async function refresh(): Promise<void> {
    return fetchDrafts(true);
  }

  /**
   * Fetches drafts only if they haven't been loaded yet.
   * Safe to call multiple times - only fetches once.
   * Uses fetchDrafts internally.
   */
  async function fetchIfEmpty(): Promise<void> {
    if (!isEmpty.value) return;
    return fetchDrafts(false);
  }

  return {
    // State
    status,
    isLoading,
    isSuccess,
    isEmpty,
    error,
    hasCredentials,

    // Actions - all delegate to fetchDrafts
    fetchDrafts,
    fetch,
    refresh,
    fetchIfEmpty,
  };
}
