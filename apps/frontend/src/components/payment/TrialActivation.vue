<template>
  <Dialog
    v-model:visible="visible"
    header="Пробный период"
    :modal="true"
    :closable="true"
    class="w-full max-w-md"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Выберите план для 14-дневного пробного периода. Пробный период можно активировать только один раз.
      </p>

      <div class="grid grid-cols-3 gap-2">
        <Button
          v-for="tier in tiers"
          :key="tier"
          :severity="selectedTier === tier ? 'primary' : 'secondary'")
          class="w-full"
          @click="selectedTier = tier"
        >
          {{ tier }}
        </Button>
      </div>

      <div v-if="selectedTier" class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm">
        <p class="font-medium">{{ selectedTier }} включает:</p>
        <ul class="mt-1 space-y-1 text-gray-600 dark:text-gray-400">
          <li>• {{ slots }} активных броней</li>
          <li>• {{ accounts }} WB аккаунт{{ accounts === 1 ? '' : 'а' }}</li>
          <li>• AI чат: {{ aiBudget }}₽/мес</li>
          <li>• Отзывы: {{ feedbackQuota }}</li>
        </ul>
      </div>

      <Button
        class="w-full"
        :loading="loading"
        :disabled="!selectedTier"
        @click="activate"
      >
        Активировать пробный период
      </Button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { paymentsAPI } from '@/api/payments/api';
import { useToast } from 'primevue/usetoast';
import {
  AUTOBOOKING_SLOTS,
  MAX_ACCOUNTS,
  AI_CHAT_BUDGET_USD,
  FEEDBACK_QUOTA,
} from '@/constants';
import type { SubscriptionTier } from '@/constants';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const toast = useToast();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const selectedTier = ref<SubscriptionTier | null>(null);
const loading = ref(false);

const tiers: SubscriptionTier[] = ['LITE', 'PRO', 'MAX'];

const slots = computed(() => selectedTier.value ? AUTOBOOKING_SLOTS[selectedTier.value] : 0);
const accounts = computed(() => selectedTier.value ? MAX_ACCOUNTS[selectedTier.value] : 0);
const aiBudget = computed(() => selectedTier.value ? AI_CHAT_BUDGET_USD[selectedTier.value] : 0);
const feedbackQuota = computed(() => {
  if (!selectedTier.value) return 0;
  const q = FEEDBACK_QUOTA[selectedTier.value];
  return q === Infinity ? '∞' : q;
});

async function activate() {
  if (!selectedTier.value) return;

  loading.value = true;
  try {
    const response = await paymentsAPI.activateTrial(selectedTier.value);
    toast.add({
      severity: 'success',
      summary: 'Пробный период активирован',
      detail: response.message,
      life: 5000,
    });
    visible.value = false;
    emit('success');
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error?.response?.data?.message || 'Не удалось активировать пробный период',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}
</script>
