import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { contentCardsAPI } from '@/api';
import { useUserStore } from '@/stores/user';
import type {
  ContentCardTableItem,
  CommissionCategory,
  TariffWarehouse,
} from '@/types';

export const useContentCardsStore = defineStore('contentCards', () => {
  const userStore = useUserStore();

  // State
  const cards = ref<ContentCardTableItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedCard = ref<ContentCardTableItem | null>(null);

  const commissionsData = ref<CommissionCategory[]>([]);
  const commissionsLoading = ref(false);
  const commissionsError = ref<string | null>(null);

  const tariffsData = ref<TariffWarehouse[]>([]);
  const tariffsLoading = ref(false);
  const tariffsError = ref<string | null>(null);

  // Getters
  const hasCards = computed(() => cards.value.length > 0);
  const hasCommissions = computed(() => commissionsData.value.length > 0);
  const hasTariffs = computed(() => tariffsData.value.length > 0);

  // Actions
  async function fetchCards(n = 20) {
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
      const response = await contentCardsAPI.fetchContentCardsTableList(n);
      cards.value = response.cards || [];
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch content cards';
      error.value = errorMsg;
      cards.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCommissions(nmID: number) {
    if (!userStore.user?.selectedAccountId) {
      commissionsError.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      commissionsError.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      commissionsError.value = 'Необходимо активировать подписку';
      return;
    }

    commissionsLoading.value = true;
    commissionsError.value = null;
    commissionsData.value = [];

    try {
      const response = await contentCardsAPI.fetchContentCardCommissions(nmID);
      commissionsData.value = response.categories || [];
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch commissions';
      commissionsError.value = errorMsg;
      commissionsData.value = [];
    } finally {
      commissionsLoading.value = false;
    }
  }

  async function fetchTariffs(nmID: number) {
    if (!userStore.user?.selectedAccountId) {
      tariffsError.value = 'Необходимо выбрать аккаунт';
      return;
    }
    if (!userStore.hasValidSupplier) {
      tariffsError.value = 'Необходимо выбрать поставщика';
      return;
    }
    if (!userStore.subscriptionActive) {
      tariffsError.value = 'Необходимо активировать подписку';
      return;
    }

    tariffsLoading.value = true;
    tariffsError.value = null;
    tariffsData.value = [];

    try {
      const response = await contentCardsAPI.fetchContentCardTariffsByNmID(nmID);
      tariffsData.value = response.warehouselist || [];
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tariffs';
      tariffsError.value = errorMsg;
      tariffsData.value = [];
    } finally {
      tariffsLoading.value = false;
    }
  }

  function selectCard(card: ContentCardTableItem) {
    selectedCard.value = card;
  }

  function clearSelection() {
    selectedCard.value = null;
    commissionsData.value = [];
    commissionsError.value = null;
    tariffsData.value = [];
    tariffsError.value = null;
  }

  function clearCards() {
    cards.value = [];
    error.value = null;
    clearSelection();
  }

  return {
    // State
    cards,
    loading: readonly(loading),
    error: readonly(error),
    selectedCard: readonly(selectedCard),
    commissionsData,
    commissionsLoading: readonly(commissionsLoading),
    commissionsError: readonly(commissionsError),
    tariffsData,
    tariffsLoading: readonly(tariffsLoading),
    tariffsError: readonly(tariffsError),

    // Getters
    hasCards,
    hasCommissions,
    hasTariffs,

    // Actions
    fetchCards,
    fetchCommissions,
    fetchTariffs,
    selectCard,
    clearSelection,
    clearCards,
  };
});
