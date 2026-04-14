<template>
  <Card class="overflow-hidden group">
    <template #content>
      <div class="space-y-3">
        <!-- Image -->
        <div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
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
        <div class="flex justify-end items-center gap-2">
          <Button
            size="small"
            @click="$emit('open-detail', card)"
          >
            <i class="pi pi-chart-line mr-2" />
            Аналитика
          </Button>

          <Button
            v-if="showFavorite"
            size="small"
            :icon="isFavorite ? 'pi pi-heart-fill' : 'pi pi-heart'"
            :severity="isFavorite ? 'danger' : 'secondary'"
            rounded
            :loading="favoriteLoading"
            @click.stop="$emit('toggle-favorite', card)"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import type { MpstatsCard } from '@/api/mpstats/types';

interface Props {
  card: MpstatsCard;
  showFavorite?: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
}

defineProps<Props>();

defineEmits<{
  'toggle-favorite': [card: MpstatsCard];
  'open-detail': [card: MpstatsCard];
}>();
</script>
