<template>
  <DataTable
    :value="feedbacks"
    scrollable
    scroll-height="flex"
    class="p-datatable-sm"
    striped-rows
  >
    <!-- Product Image & Info -->
    <Column field="productInfo" header="Товар" style="min-width: 200px">
      <template #body="{ data }">
        <div class="flex items-center gap-3">
          <img
            :src="getWbImageUrl(data.productInfo?.wbArticle)"
            :alt="data.productInfo?.name"
            class="w-12 h-12 object-cover rounded-lg"
            @error="$event.target.src = '/placeholder-product.png'"
          />
          <div class="flex flex-col">
            <span class="text-sm font-medium text-surface-900 dark:text-surface-0 line-clamp-2">
              {{ data.productInfo?.name }}
            </span>
            <span class="text-xs text-surface-500">
              {{ data.productInfo?.brand }}
            </span>
          </div>
        </div>
      </template>
    </Column>

    <!-- Feedback Text -->
    <Column field="feedbackInfo.feedbackText" header="Отзыв" style="min-width: 250px">
      <template #body="{ data }">
        <div class="flex flex-col gap-1">
          <p class="text-sm text-surface-700 dark:text-surface-300 line-clamp-3">
            {{ data.feedbackInfo?.feedbackText || '(Без текста)' }}
          </p>
          <div class="flex gap-2 text-xs">
            <Tag
              v-if="data.feedbackInfo?.feedbackTextPros"
              severity="success"
              value="Достоинства"
              class="text-xs"
            />
            <Tag
              v-if="data.feedbackInfo?.feedbackTextCons"
              severity="danger"
              value="Недостатки"
              class="text-xs"
            />
          </div>
        </div>
      </template>
    </Column>

    <!-- Rating -->
    <Column field="valuation" header="Оценка" style="width: 100px">
      <template #body="{ data }">
        <div class="flex items-center gap-1">
          <i class="pi pi-star-fill text-yellow-500" />
          <span class="text-sm font-medium">{{ data.valuation }}/5</span>
        </div>
      </template>
    </Column>

    <!-- Media -->
    <Column header="Медиа" style="width: 100px">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Tag
            v-if="data.feedbackInfo?.photos?.length"
            severity="info"
            :value="`${data.feedbackInfo.photos.length} 📷`"
            class="text-xs"
          />
          <Tag
            v-if="data.feedbackInfo?.video"
            severity="info"
            value="🎬"
            class="text-xs"
          />
        </div>
      </template>
    </Column>

    <!-- Customer -->
    <Column field="feedbackInfo.userName" header="Покупатель" style="width: 140px">
      <template #body="{ data }">
        <span class="text-sm">{{ data.feedbackInfo?.userName }}</span>
      </template>
    </Column>

    <!-- Date -->
    <Column field="createdDate" header="Дата" style="width: 120px">
      <template #body="{ data }">
        <span class="text-sm text-surface-500">
          {{ formatDate(data.createdDate) }}
        </span>
      </template>
    </Column>

    <!-- Status -->
    <Column header="Статус" style="width: 120px">
      <template #body="{ data }">
        <Tag
          :severity="data.answer ? 'success' : 'warning'"
          :value="data.answer ? 'Отвечен' : 'Без ответа'"
        />
      </template>
    </Column>

    <!-- Actions -->
    <Column header="Действия" style="width: 100px">
      <template #body="{ data }">
        <Button
          v-if="!data.answer"
          icon="pi pi-sparkles"
          severity="secondary"
          text
          rounded
          v-tooltip.top="'Сгенерировать ответ'"
          @click="$emit('generate', data)"
        />
        <Button
          v-else
          icon="pi pi-check-circle"
          severity="success"
          text
          rounded
          disabled
        />
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { FeedbackItem } from '@/stores/feedbacks';

interface Props {
  feedbacks: FeedbackItem[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'generate', feedback: FeedbackItem): void;
}>();

function getWbImageUrl(wbArticle: number): string {
  if (!wbArticle) return '/placeholder-product.png';
  const articleStr = wbArticle.toString();
  const first4 = articleStr.slice(0, 4);
  const first6 = articleStr.slice(0, 6);
  return `https://rst-basket-cdn-06.geobasket.ru/vol${first4}/part${first6}/${wbArticle}/images/tm/1.webp`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
</script>
