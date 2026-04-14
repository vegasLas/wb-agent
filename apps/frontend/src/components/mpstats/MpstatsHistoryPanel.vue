<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500 mb-4" />
      <p class="text-gray-600 dark:text-gray-400">
        Загрузка истории...
      </p>
    </div>

    <!-- Error -->
    <Message
      v-else-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <!-- History Grid -->
    <div v-else-if="history.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <MpstatsProductCard
        v-for="card in history"
        :key="card.nmID"
        :card="card"
        :show-favorite="true"
        :is-favorite="isFavorite(card.nmID)"
        :favorite-loading="addingFavorite === card.nmID || removingFavorite === card.nmID"
        @toggle-favorite="$emit('toggle-favorite', $event)"
        @open-detail="$emit('open-detail', $event)"
      />
    </div>

    <!-- Empty State -->
    <Card
      v-else
      class="text-center py-12"
    >
      <template #content>
        <i class="pi pi-clock text-5xl text-gray-400 mb-4" />
        <p class="text-lg text-gray-600 dark:text-gray-400">
          История поиска пуста
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Исканные товары будут появляться здесь автоматически
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
import Message from 'primevue/message';
import MpstatsProductCard from './MpstatsProductCard.vue';
import type { MpstatsCard } from '@/api/mpstats/types';

interface Props {
  history: MpstatsCard[];
  loading: boolean;
  error: string | null;
  addingFavorite: number | null;
  removingFavorite: number | null;
  isFavorite: (nmID: number) => boolean;
}

defineProps<Props>();

defineEmits<{
  'toggle-favorite': [card: MpstatsCard];
  'open-detail': [card: MpstatsCard];
}>();
</script>
