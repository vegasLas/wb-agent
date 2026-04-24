<template>
  <Drawer
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    position="right"
    :block-scroll="true"
    :pt="{
      root: { class: 'w-[480px]' },
      content: { class: 'p-0 flex flex-col h-full' },
    }"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div
        class="flex items-start gap-3 p-4 border-b border-[var(--color-border)] shrink-0"
      >
        <img
          :src="imageUrl"
          :alt="feedback?.productInfo?.name"
          class="w-14 h-14 object-cover rounded-lg flex-shrink-0"
          @error="$event.target.src = '/placeholder-product.png'"
        />
        <div class="flex-1 min-w-0">
          <h3
            class="text-base font-semibold text-surface-900 dark:text-surface-0 truncate"
          >
            {{ feedback?.productInfo?.name }}
          </h3>
          <p class="text-xs text-surface-500 mt-0.5">
            {{ feedback?.productInfo?.supplierArticle }} ·
            {{ feedback?.productInfo?.wbArticle }} · {{ colorOrCategory }}
          </p>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Customer & Rating -->
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p
              class="text-base font-semibold text-surface-900 dark:text-surface-0"
            >
              {{ feedback?.feedbackInfo?.userName }}
            </p>
            <p class="text-xs text-surface-500 mt-0.5">
              {{ formattedDate }}
              <span v-if="formattedPurchaseDate"
                >· Покупка: {{ formattedPurchaseDate }}</span
              >
            </p>
          </div>
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <i
              v-for="n in 5"
              :key="n"
              class="pi pi-star-fill text-sm"
              :class="
                n <= (feedback?.valuation || 0)
                  ? 'text-yellow-500'
                  : 'text-surface-300 dark:text-surface-600'
              "
            />
          </div>
        </div>

        <!-- Feedback Text -->
        <div class="space-y-2">
          <div
            v-if="feedback?.feedbackInfo?.feedbackTextCons"
            class="flex gap-1"
          >
            <span
              class="text-sm font-medium text-surface-700 dark:text-surface-300"
              >Минусы:</span
            >
            <span class="text-sm text-surface-700 dark:text-surface-300">{{
              feedback.feedbackInfo.feedbackTextCons
            }}</span>
          </div>
          <div
            v-if="feedback?.feedbackInfo?.feedbackTextPros"
            class="flex gap-1"
          >
            <span
              class="text-sm font-medium text-surface-700 dark:text-surface-300"
              >Плюсы:</span
            >
            <span class="text-sm text-surface-700 dark:text-surface-300">{{
              feedback.feedbackInfo.feedbackTextPros
            }}</span>
          </div>
          <div class="flex gap-1">
            <span
              class="text-sm font-medium text-surface-700 dark:text-surface-300"
              >Комментарий:</span
            >
            <span class="text-sm text-surface-700 dark:text-surface-300">{{
              feedback?.feedbackInfo?.feedbackText || '(Без текста)'
            }}</span>
          </div>
        </div>

        <!-- Trust Factor -->
        <Tag
          v-if="trustFactorLabel"
          :value="trustFactorLabel"
          severity="success"
          class="text-xs"
        />

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
            Ваши пожелания помогут ИИ генерировать более точные ответы в
            будущем.
          </p>
        </div>

        <!-- Generated Answer -->
        <div v-else-if="answerText" class="flex flex-col gap-3">
          <label class="text-sm font-medium">Сгенерированный ответ:</label>
          <div
            class="p-4 bg-elevated border border-[var(--color-border)] rounded-lg"
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

      <!-- Bottom Action Bar -->
      <div class="p-4 border-t border-[var(--color-border)] shrink-0">
        <div class="flex justify-end gap-2">
          <!-- Feedback form buttons -->
          <template v-if="showFeedbackForm">
            <Button
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Назад'"
              @click="cancelFeedbackForm"
            />
            <Button
              v-if="feedbackAction === 'reject'"
              icon="pi pi-times"
              severity="danger"
              rounded
              v-tooltip.top="'Отправить и исправить'"
              @click="submitReject"
            />
            <Button
              v-else-if="feedbackAction === 'regenerate'"
              icon="pi pi-refresh"
              severity="primary"
              rounded
              v-tooltip.top="'Отправить и перегенерировать'"
              @click="submitRegenerate"
            />
          </template>

          <!-- Normal action buttons -->
          <template v-else>
            <Button
              icon="pi pi-times"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Исправить'"
              :disabled="loading || !answerText"
              @click="onReject"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Перегенерировать'"
              :disabled="loading || !answerText"
              @click="onRegenerate"
            />
            <Button
              icon="pi pi-check"
              severity="success"
              rounded
              v-tooltip.top="'Опубликовать'"
              :disabled="loading || !answerText"
              :loading="postLoading"
              @click="onAccept"
            />
          </template>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import { getWbImageUrl } from '@/utils/feedbacks/image-url';
import { formatDate, formatDateTime } from '@/utils/feedbacks/date-format';
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

const colorOrCategory = computed(() => {
  // @ts-expect-runtime color may exist at runtime even if not in types
  return (
    (props.feedback?.feedbackInfo as unknown as { color?: string })?.color ||
    props.feedback?.productInfo?.category ||
    ''
  );
});

const formattedDate = computed(() =>
  props.feedback ? formatDateTime(props.feedback.createdDate) : '',
);

const formattedPurchaseDate = computed(() =>
  props.feedback?.feedbackInfo?.purchaseDate
    ? formatDate(props.feedback.feedbackInfo.purchaseDate)
    : '',
);

const trustFactorLabel = computed(() => {
  if (props.feedback?.trustFactor === 'buyout') return 'Выкуп';
  if (props.feedback?.trustFactor === 'rejected') return 'Возврат';
  return '';
});

// Reset form state when drawer opens/closes or answer changes
watch(
  () => [props.visible, props.answerText],
  () => {
    showFeedbackForm.value = false;
    userFeedback.value = '';
    feedbackAction.value = null;
  },
);

function closeDrawer() {
  emit('update:visible', false);
}

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
