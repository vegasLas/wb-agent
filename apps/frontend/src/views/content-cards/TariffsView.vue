<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">Тарифы и комиссии</h1>
    </div>

    <!-- Error -->
    <ErrorMessage
      v-if="contentCardsStore.error"
      :message="contentCardsStore.error"
    />

    <!-- Loading -->
    <LoadingSpinner v-if="contentCardsStore.loading" />

    <!-- Table -->
    <ContentCardsTable
      v-else-if="contentCardsStore.hasCards"
      :cards="contentCardsStore.cards"
      @show-commissions="openCommissions"
      @show-tariffs="openTariffs"
    />

    <!-- Empty -->
    <EmptyState
      v-else
      icon="pi pi-shopping-bag"
      message="Нет карточек товаров"
    />

    <!-- Commissions Dialog -->
    <CommissionsDialog
      v-model:visible="showCommissionsDialog"
      :card="selectedCard"
      :loading="contentCardsStore.commissionsLoading"
      :error="contentCardsStore.commissionsError"
      :has-commissions="contentCardsStore.hasCommissions"
      :commissions="contentCardsStore.commissionsData"
      @hide="onDialogHide"
    />

    <!-- Tariffs Dialog -->
    <TariffsDialog
      v-model:visible="showTariffsDialog"
      :card="selectedCard"
      :loading="contentCardsStore.tariffsLoading"
      :error="contentCardsStore.tariffsError"
      :has-tariffs="contentCardsStore.hasTariffs"
      :tariffs="contentCardsStore.tariffsData"
      @hide="onDialogHide"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useContentCardsStore } from '@/stores/content-cards';
import { useViewReady } from '@/composables/ui';
import {
  ContentCardsTable,
  CommissionsDialog,
  TariffsDialog,
} from '@/components/content-cards';
import ErrorMessage from '@/components/common/ErrorMessage.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import type { ContentCardTableItem } from '@/types';

const contentCardsStore = useContentCardsStore();
const { viewReady } = useViewReady();

const showCommissionsDialog = ref(false);
const showTariffsDialog = ref(false);
const selectedCard = ref<ContentCardTableItem | null>(null);

function openCommissions(card: ContentCardTableItem) {
  selectedCard.value = card;
  showCommissionsDialog.value = true;
  contentCardsStore.fetchCommissions(card.nmID);
}

function openTariffs(card: ContentCardTableItem) {
  selectedCard.value = card;
  showTariffsDialog.value = true;
  contentCardsStore.fetchTariffs(card.nmID);
}

function onDialogHide() {
  contentCardsStore.clearSelection();
  selectedCard.value = null;
}

onMounted(() => {
  contentCardsStore.fetchCards().finally(() => {
    viewReady();
  });
});
</script>
