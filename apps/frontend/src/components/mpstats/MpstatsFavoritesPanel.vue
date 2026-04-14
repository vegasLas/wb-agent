<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500 mb-4" />
      <p class="text-gray-600 dark:text-gray-400">Загрузка избранного...</p>
    </div>

    <!-- Error -->
    <Message
      v-else-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <!-- Favorites Grid -->
    <div v-else-if="favorites.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <Card
        v-for="card in favorites"
        :key="card.nmID"
        class="overflow-hidden group"
      >
        <template #content>
          <div class="space-y-3">
            <!-- Image -->
            <div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
              <img
                v-if="card.image"
                :src="card.image"
                :alt="card.name"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-400"
              >
                <i class="pi pi-image text-4xl" />
              </div>

              <!-- Remove Favorite Button -->
              <Button
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                icon="pi pi-heart-fill"
                severity="danger"
                rounded
                text
                :loading="removingFavorite === card.nmID"
                @click="$emit('remove-favorite', card.nmID)"
              />
            </div>

            <!-- Info -->
            <div class="space-y-1">
              <p class="font-medium line-clamp-2 text-sm">{{ card.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Артикул: {{ card.nmID }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Бренд: {{ card.brand || '—' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Предмет: {{ card.subjectName || '—' }}
              </p>
            </div>

            <!-- Actions -->
            <Button
              size="small"
              fluid
              @click="$emit('open-detail', card)"
            >
              <i class="pi pi-chart-line mr-2" />
              Аналитика
            </Button>
          </div>
        </template>
      </Card>
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
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import type { MpstatsCard } from '@/api/mpstats/types';

interface Props {
  favorites: MpstatsCard[];
  loading: boolean;
  error: string | null;
  removingFavorite: number | null;
}

defineProps<Props>();

defineEmits<{
  'remove-favorite': [nmID: number];
  'open-detail': [card: MpstatsCard];
}>();
</script>
