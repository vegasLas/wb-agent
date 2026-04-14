<template>
  <div class="space-y-4">
    <!-- Search Input -->
    <div class="flex gap-2">
      <InputText
        v-model="localQuery"
        placeholder="Ссылка на товар WB или артикул (SKU)"
        class="flex-1"
        @keyup.enter="handleSearch"
      />
      <Button
        :loading="loading"
        @click="handleSearch"
      >
        <i class="pi pi-search mr-2" />
        Найти
      </Button>
    </div>

    <!-- Error -->
    <Message
      v-if="error"
      severity="error"
    >
      {{ error }}
    </Message>

    <!-- Results -->
    <div v-if="results.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <MpstatsProductCard
        v-for="card in results"
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
      v-else-if="!loading && hasSearched"
      class="text-center py-12"
    >
      <template #content>
        <i class="pi pi-search text-5xl text-gray-400 mb-4" />
        <p class="text-lg text-gray-600 dark:text-gray-400">
          Ничего не найдено по запросу "{{ lastQuery }}"
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import MpstatsProductCard from './MpstatsProductCard.vue';
import type { MpstatsCard } from '@/api/mpstats/types';

interface Props {
  query: string;
  results: MpstatsCard[];
  loading: boolean;
  error: string | null;
  addingFavorite: number | null;
  removingFavorite: number | null;
  isFavorite: (nmID: number) => boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  search: [query: string];
  'toggle-favorite': [card: MpstatsCard];
  'open-detail': [card: MpstatsCard];
}>();

const localQuery = ref(props.query);
const hasSearched = ref(false);
const lastQuery = ref('');

watch(() => props.query, (newVal) => {
  localQuery.value = newVal;
});

function handleSearch() {
  lastQuery.value = localQuery.value;
  hasSearched.value = true;
  emit('search', localQuery.value);
}
</script>
