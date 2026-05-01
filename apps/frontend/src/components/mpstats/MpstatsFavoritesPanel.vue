<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center py-12"
    >
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500 mb-4" />
      <p class="text-gray-600 dark:text-gray-400">
        Загрузка избранного...
      </p>
    </div>

    <!-- Error -->
    <Message
      v-else-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <!-- Favorites Grid -->
    <div
      v-else-if="favorites.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <MpstatsProductCard
        v-for="card in favorites"
        :key="card.nmID"
        :card="card"
        :show-favorite="true"
        :is-favorite="true"
        :favorite-loading="removingFavorite === card.nmID"
        :allow-edit-title="true"
        @toggle-favorite="$emit('toggle-favorite', $event)"
        @open-detail="$emit('open-detail', $event)"
        @update-title="$emit('update-title', $event)"
      />
    </div>

    <!-- Empty State -->
    <Card
      v-else
      class="text-center py-12"
    >
      <template #content>
        <i class="pi pi-heart text-5xl text-gray-400 mb-4" />
        <p class="text-lg text-gray-600 dark:text-gray-400">
          У вас пока нет избранных товаров
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Добавляйте товары в избранное, чтобы быстро просматривать аналитику
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
  favorites: MpstatsCard[];
  loading: boolean;
  error: string | null;
  removingFavorite: number | null;
}

defineProps<Props>();

defineEmits<{
  'toggle-favorite': [card: MpstatsCard];
  'open-detail': [card: MpstatsCard];
  'update-title': [payload: { nmID: number; customTitle: string | null }];
}>();
</script>
