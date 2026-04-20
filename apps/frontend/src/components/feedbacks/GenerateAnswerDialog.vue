<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Генерация ответа на отзыв"
    :style="{ width: '500px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="flex flex-col gap-4">
      <!-- Feedback Info -->
      <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-lg">
        <div class="flex items-center gap-3 mb-2">
          <img
            :src="imageUrl"
            class="w-10 h-10 object-cover rounded"
            @error="$event.target.src = '/placeholder-product.png'"
          />
          <div>
            <p class="text-sm font-medium">{{ feedback?.productInfo?.name }}</p>
            <p class="text-xs text-surface-500">{{ feedback?.feedbackInfo?.userName }}</p>
          </div>
        </div>
        <p class="text-sm text-surface-700 dark:text-surface-300 italic">
          "{{ feedback?.feedbackInfo?.feedbackText }}"
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center gap-3 py-8">
        <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
        <p class="text-sm text-surface-500">ИИ генерирует ответ...</p>
      </div>

      <!-- Generated Answer -->
      <div v-else-if="answerText" class="flex flex-col gap-3">
        <label class="text-sm font-medium">Сгенерированный ответ:</label>
        <div class="p-4 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg">
          <p class="text-sm leading-relaxed">{{ answerText }}</p>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Отклонить"
          icon="pi pi-times"
          severity="secondary"
          text
          :disabled="loading || !answerText"
          @click="onReject"
        />
        <Button
          label="Опубликовать"
          icon="pi pi-check"
          severity="success"
          :disabled="loading || !answerText"
          :loading="postLoading"
          @click="onAccept"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { getWbImageUrl } from '@/utils/feedbacks/image-url';
import type { FeedbackItem } from '@/stores/feedbacks';

interface Props {
  visible: boolean;
  feedback: FeedbackItem | null;
  loading: boolean;
  postLoading: boolean;
  answerText: string | null;
  error: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'accept', feedbackId: string): void;
  (e: 'reject', feedbackId: string): void;
}>();

const imageUrl = computed(() => getWbImageUrl(props.feedback?.productInfo?.wbArticle));

function onAccept() {
  if (props.feedback) {
    emit('accept', props.feedback.id);
  }
}

function onReject() {
  if (props.feedback) {
    emit('reject', props.feedback.id);
  }
}
</script>
