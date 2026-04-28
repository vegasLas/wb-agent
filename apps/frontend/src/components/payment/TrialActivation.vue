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
        Активируйте 14-дневный пробный период для тарифа Lite. Пробный период можно активировать только один раз.
      </p>

      <div class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm">
        <p class="font-medium">Lite включает:</p>
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

const loading = ref(false);

const slots = computed(() => AUTOBOOKING_SLOTS['LITE']);
const accounts = computed(() => MAX_ACCOUNTS['LITE']);
const aiBudget = computed(() => AI_CHAT_BUDGET_USD['LITE']);
const feedbackQuota = computed(() => {
  const q = FEEDBACK_QUOTA['LITE'];
  return q === Infinity ? '∞' : q;
});

async function activate() {
  loading.value = true;
  try {
    const response = await paymentsAPI.activateTrial();
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
