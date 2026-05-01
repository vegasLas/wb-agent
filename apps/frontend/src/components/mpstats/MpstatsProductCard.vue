<template>
  <Card class="overflow-hidden group h-full">
    <template #content>
      <div class="flex flex-col gap-y-3 h-full">
        <!-- Image -->
        <div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img
            v-if="card.image"
            :src="card.image"
            :alt="displayName"
            class="w-full h-full object-contain"
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
          <!-- Name / Custom Title -->
          <div class="flex items-start gap-1">
            <p class="font-medium line-clamp-2 text-sm flex-1">
              {{ displayName }}
            </p>
            <Button
              v-if="allowEditTitle"
              size="small"
              text
              class="p-1 !w-6 !h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              icon="pi pi-pencil"
              @click="startEditing"
            />
          </div>

          <!-- Edit Title Input -->
          <div
            v-if="isEditing"
            class="flex items-center gap-1"
          >
            <InputText
              v-model="editValue"
              size="small"
              class="flex-1 text-xs"
              placeholder="Введите название"
              @keyup.enter="saveTitle"
              @keyup.esc="cancelEditing"
            />
            <Button
              size="small"
              text
              class="p-1 !w-6 !h-6"
              icon="pi pi-check"
              @click="saveTitle"
            />
            <Button
              size="small"
              text
              class="p-1 !w-6 !h-6"
              severity="secondary"
              icon="pi pi-times"
              @click="cancelEditing"
            />
          </div>

          <!-- Original name shown when custom title is set -->
          <p
            v-if="card.customTitle"
            class="text-xs text-gray-400 dark:text-gray-500 line-clamp-1"
          >
            {{ card.name }}
          </p>

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
        <div class="flex justify-end items-center gap-2 mt-auto">
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
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import type { MpstatsCard } from '@/api/mpstats/types';

interface Props {
  card: MpstatsCard;
  showFavorite?: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  allowEditTitle?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'toggle-favorite': [card: MpstatsCard];
  'open-detail': [card: MpstatsCard];
  'update-title': [payload: { nmID: number; customTitle: string | null }];
}>();

const isEditing = ref(false);
const editValue = ref('');

const displayName = computed(() => {
  return props.card.customTitle || props.card.name;
});

function startEditing() {
  editValue.value = props.card.customTitle || '';
  isEditing.value = true;
}

function saveTitle() {
  const trimmed = editValue.value.trim();
  const newTitle = trimmed || null;
  // Only emit if changed
  if (newTitle !== (props.card.customTitle || null)) {
    emit('update-title', { nmID: props.card.nmID, customTitle: newTitle });
  }
  isEditing.value = false;
}

function cancelEditing() {
  isEditing.value = false;
  editValue.value = '';
}
</script>

<style scoped>
:deep(.p-card-body) {
  @apply h-full flex flex-col;
}

:deep(.p-card-content) {
  @apply flex-1;
}
</style>
