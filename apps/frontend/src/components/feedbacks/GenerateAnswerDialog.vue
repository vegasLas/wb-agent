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
            <p class="text-xs text-surface-500">
              {{ feedback?.feedbackInfo?.userName }}
            </p>
          </div>
        </div>
        <p
          v-if="feedback?.feedbackInfo?.feedbackText"
          class="text-sm text-surface-700 dark:text-surface-300 italic"
        >
          {{ feedback?.feedbackInfo?.feedbackText }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center gap-3 py-8">
        <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
        <p class="text-sm text-surface-500">ИИ генерирует ответ...</p>
      </div>

      <!-- User Feedback Form -->
      <div v-else-if="showFeedbackForm" class="flex flex-col gap-3">
        <label class="text-sm font-medium">
          Что вам не понравилось в ответе? Что бы вы хотели изменить?
        </label>
        <Textarea
          v-model="userFeedback"
          rows="4"
          auto-resize
          placeholder="Например: слишком формально, хочу более тёплый тон; или не упомянул бренд; или слишком длинно..."
          class="w-full"
        />
        <p class="text-xs text-surface-500">
          Ваши пожелания помогут ИИ генерировать более точные ответы в будущем.
        </p>
      </div>

      <!-- Generated Answer -->
      <div v-else-if="answerText" class="flex flex-col gap-3">
        <label class="text-sm font-medium">Сгенерированный ответ:</label>
        <div
          class="p-4 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg"
        >
          <p class="text-sm leading-relaxed">{{ answerText }}</p>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm"
      >
        {{ error }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <!-- Feedback form buttons -->
        <template v-if="showFeedbackForm">
          <Button
            label="Отмена"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="cancelFeedbackForm"
          />
          <Button
            label="Отправить и отклонить"
            v-if="feedbackAction === 'reject'"
            icon="pi pi-times"
            severity="danger"
            @click="submitReject"
          />
          <Button
            label="Отправить и перегенерировать"
            v-else-if="feedbackAction === 'regenerate'"
            icon="pi pi-refresh"
            severity="primary"
            @click="submitRegenerate"
          />
        </template>

        <!-- Normal action buttons -->
        <template v-else>
          <Button
            label="Отклонить"
            icon="pi pi-times"
            severity="secondary"
            text
            :disabled="loading || !answerText"
            @click="onReject"
          />
          <Button
            label="Перегенерировать"
            icon="pi pi-refresh"
            severity="secondary"
            :disabled="loading || !answerText"
            @click="onRegenerate"
          />
          <Button
            label="Опубликовать"
            icon="pi pi-check"
            severity="success"
            :disabled="loading || !answerText"
            :loading="postLoading"
            @click="onAccept"
          />
        </template>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
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
  (e: 'reject', feedbackId: string, userFeedback: string): void;
  (e: 'regenerate', feedbackId: string, userFeedback: string): void;
}>();

const showFeedbackForm = ref(false);
const userFeedback = ref('');
const feedbackAction = ref<'reject' | 'regenerate' | null>(null);

const imageUrl = computed(() =>
  getWbImageUrl(props.feedback?.productInfo?.wbArticle),
);

// Reset form state when dialog opens/closes or answer changes
watch(
  () => [props.visible, props.answerText],
  () => {
    showFeedbackForm.value = false;
    userFeedback.value = '';
    feedbackAction.value = null;
  },
);

function onAccept() {
  if (props.feedback) {
    emit('accept', props.feedback.id);
  }
}

function onReject() {
  feedbackAction.value = 'reject';
  showFeedbackForm.value = true;
}

function onRegenerate() {
  feedbackAction.value = 'regenerate';
  showFeedbackForm.value = true;
}

function cancelFeedbackForm() {
  showFeedbackForm.value = false;
  userFeedback.value = '';
  feedbackAction.value = null;
}

function submitReject() {
  if (props.feedback) {
    emit('reject', props.feedback.id, userFeedback.value.trim());
  }
}

function submitRegenerate() {
  if (props.feedback) {
    emit('regenerate', props.feedback.id, userFeedback.value.trim());
  }
}
</script>
