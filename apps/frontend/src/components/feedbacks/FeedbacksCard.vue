<template>
  <Card>
    <template #content>
      <div class="space-y-3">
        <!-- Top row: image + product info + rating/date -->
        <div class="flex gap-4">
          <!-- Product Image -->
          <div class="flex-shrink-0">
            <img
              :src="imageUrl"
              :alt="feedback.productInfo?.name"
              class="w-20 h-20 object-cover rounded-lg"
              @error="$event.target.src = '/placeholder-product.png'"
            />
          </div>

          <!-- Product Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-surface-900 dark:text-surface-0 truncate">
                  {{ feedback.productInfo?.name }}
                </h3>
                <p class="text-xs text-surface-500 mt-0.5">
                  {{ feedback.productInfo?.supplierArticle }} · {{ feedback.productInfo?.wbArticle }} · {{ feedbackInfo.color || feedback.productInfo?.category }}
                </p>
                <Tag
                  v-if="trustFactorLabel"
                  :value="trustFactorLabel"
                  severity="success"
                  class="text-xs mt-1.5"
                />
              </div>

              <!-- Rating & Date -->
              <div class="flex-shrink-0 text-right">
                <div class="flex items-center gap-0.5">
                  <i
                    v-for="n in 5"
                    :key="n"
                    class="pi pi-star-fill text-sm"
                    :class="n <= feedback.valuation ? 'text-yellow-500' : 'text-surface-300 dark:text-surface-600'"
                  />
                </div>
                <p class="text-xs text-surface-500 mt-1">
                  {{ formattedDate }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback Text -->
        <div class="space-y-2">
          <div v-if="feedbackInfo.feedbackTextCons" class="flex gap-1">
            <span class="text-sm font-medium text-surface-700 dark:text-surface-300">Минусы:</span>
            <span class="text-sm text-surface-700 dark:text-surface-300">{{ feedbackInfo.feedbackTextCons }}</span>
          </div>
          <div v-if="feedbackInfo.feedbackTextPros" class="flex gap-1">
            <span class="text-sm font-medium text-surface-700 dark:text-surface-300">Плюсы:</span>
            <span class="text-sm text-surface-700 dark:text-surface-300">{{ feedbackInfo.feedbackTextPros }}</span>
          </div>
          <div class="flex gap-1">
            <span class="text-sm font-medium text-surface-700 dark:text-surface-300">Комментарий:</span>
            <span class="text-sm text-surface-700 dark:text-surface-300">{{ feedbackInfo.feedbackText || '(Без текста)' }}</span>
          </div>
        </div>

        <!-- Media Tags -->
        <div v-if="hasMedia" class="flex gap-2">
          <Tag
            v-if="feedbackInfo.photos?.length"
            severity="info"
            :value="`${feedbackInfo.photos.length} фото`"
            class="text-xs"
          />
          <Tag
            v-if="feedbackInfo.video"
            severity="info"
            value="Видео"
            class="text-xs"
          />
        </div>

        <!-- Customer Name -->
        <div class="text-sm text-surface-500">
          {{ feedbackInfo.userName }}
        </div>

        <!-- Answer Card (if exists) -->
        <div
          v-if="showAnswer && feedback.answer"
          class="bg-surface-100 dark:bg-surface-700 rounded-lg p-3 space-y-2"
        >
          <div class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <i class="pi pi-check-circle text-success" />
            <span>Опубликован для всех</span>
          </div>
          <p class="text-sm text-surface-800 dark:text-surface-200">
            {{ feedback.answer.answerText }}
          </p>
        </div>

        <!-- AI Answer Card (for AI tabs) -->
        <div
          v-if="isAiTab && 'aiAnswer' in feedback"
          class="bg-surface-100 dark:bg-surface-700 rounded-lg p-3 space-y-2"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm">
              <i
                class="pi"
                :class="aiStatusIcon"
              />
              <span :class="aiStatusClass">{{ aiStatusLabel }}</span>
            </div>
            <span
              v-if="postedDate"
              class="text-xs text-surface-500"
            >
              {{ postedDate }}
            </span>
          </div>
          <p class="text-sm text-surface-800 dark:text-surface-200">
            {{ feedback.aiAnswer.answerText }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1 justify-end">
          <Button
            v-if="tab === 'unanswered' && !feedback.answer"
            label="Сгенерировать ответ"
            icon="pi pi-sparkles"
            severity="secondary"
            size="small"
            @click="$emit('generate', feedback)"
          />
          <Button
            v-if="tab === 'ai-pending'"
            label="Опубликовать"
            icon="pi pi-check"
            severity="success"
            size="small"
            @click="$emit('accept', feedback.id)"
          />
          <Button
            v-if="tab === 'ai-pending'"
            label="Исправить"
            icon="pi pi-times"
            severity="danger"
            size="small"
            text
            @click="$emit('reject', feedback.id)"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { getWbImageUrl } from '@/utils/feedbacks/image-url';
import { formatDate } from '@/utils/feedbacks/date-format';
import type { FeedbackItem, FeedbackTab } from '@/stores/feedbacks';

interface Props {
  feedback: FeedbackItem;
  tab: FeedbackTab;
  showAnswer?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'generate', feedback: FeedbackItem): void;
  (e: 'accept', feedbackId: string): void;
  (e: 'reject', feedbackId: string): void;
}>();

const feedbackInfo = computed(() => props.feedback.feedbackInfo);

const imageUrl = computed(() => getWbImageUrl(props.feedback.productInfo?.wbArticle));

const formattedDate = computed(() => formatDate(props.feedback.createdDate));

const postedDate = computed(() => {
  if ('postedAt' in props.feedback && props.feedback.postedAt) {
    return formatDate(props.feedback.postedAt);
  }
  return '';
});

const hasMedia = computed(() =>
  (feedbackInfo.value.photos && feedbackInfo.value.photos.length > 0) || !!feedbackInfo.value.video,
);

const isAiTab = computed(() => props.tab === 'ai-posted' || props.tab === 'ai-pending');

const trustFactorLabel = computed(() => {
  if (props.feedback.trustFactor === 'buyout') return 'Выкуп';
  if (props.feedback.trustFactor === 'rejected') return 'Возврат';
  return '';
});

const aiStatusLabel = computed(() => {
  if ('aiAnswer' in props.feedback) {
    return props.feedback.aiAnswer.status === 'POSTED' ? 'Опубликован' : 'На проверке';
  }
  return '';
});

const aiStatusClass = computed(() => {
  if ('aiAnswer' in props.feedback) {
    return props.feedback.aiAnswer.status === 'POSTED'
      ? 'text-success font-medium'
      : 'text-warning font-medium';
  }
  return '';
});

const aiStatusIcon = computed(() => {
  if ('aiAnswer' in props.feedback) {
    return props.feedback.aiAnswer.status === 'POSTED' ? 'pi-check-circle text-success' : 'pi-clock text-warning';
  }
  return '';
});
</script>
