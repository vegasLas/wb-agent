<template>
  <Dialog
    v-model:visible="isOpen"
    position="bottom"
    header="Оплата"
    modal
    class=""
    :style="{ width: '450px' }"
    :closable="true"
  >
    <!-- Error Display -->
    <Message
      v-if="error"
      severity="error"
      class="mb-4 w-full"
    >
      {{ error }}
    </Message>

    <!-- Step 1: Email Input -->
    <div
      v-if="!paymentInitiated"
      class="space-y-4"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ tariffName }}
        </h3>
        <Tag
          severity="info"
          :value="`${tariffPrice} ₽`"
        />
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        Укажите ваш email для получения чека, после оплаты
      </p>

      <div class="space-y-2">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <InputText
          v-model="emailInput"
          type="email"
          placeholder="example@mail.com"
          :class="['w-full', emailError ? 'p-invalid' : '']"
        />
        <small
          v-if="emailError"
          class="p-error"
        >{{ emailError }}</small>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <Button
          variant="text"
          severity="secondary"
          @click="close"
        >
          Отмена
        </Button>
        <Button
          :loading="loading"
          @click="handleEmailSubmit"
        >
          Продолжить
        </Button>
      </div>
    </div>

    <!-- Step 2: Success Message -->
    <div
      v-else
      class="text-center py-4"
    >
      <i
        class="pi pi-check-circle text-green-500 dark:text-green-400 text-6xl mb-4"
      />
      <p class="text-lg font-medium mb-2 text-gray-900 dark:text-white">
        Ссылка на оплату отправлена
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Мы отправили ссылку для оплаты в чат. Пожалуйста, проверьте сообщения.
      </p>
      <Button @click="goToChat">
        Перейти в чат
      </Button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { closeWebApp } from '../../utils/telegramWebApp';

const props = defineProps<{
  modelValue: boolean;
  tariffId: string;
  tariffName: string;
  tariffPrice: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
  fail: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const error = ref('');
const loading = ref(false);
const emailInput = ref('');
const emailError = ref('');
const paymentInitiated = ref(false);

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function handleEmailSubmit() {
  loading.value = true;
  emailError.value = '';

  if (!emailInput.value) {
    emailError.value = 'Email обязателен';
    loading.value = false;
    return;
  }

  if (!validateEmail(emailInput.value)) {
    emailError.value = 'Неверный формат email';
    loading.value = false;
    return;
  }

  await initializePayment();
  loading.value = false;
}

async function initializePayment() {
  try {
    // Import the API function dynamically to avoid circular dependencies
    const { paymentsAPI } = await import('../../api');
    await paymentsAPI.createPaymentWithEmail({
      tariffId: props.tariffId,
      email: emailInput.value,
    });

    paymentInitiated.value = true;
  } catch (e: unknown) {
    console.error('Error initializing payment:', e);
    error.value = e instanceof Error ? e.message : 'Ошибка при создании платежа';
    emit('fail');
  }
}

function goToChat() {
  // Try to close Telegram WebApp if available, otherwise just close the modal
  const closed = closeWebApp();
  if (!closed) {
    // Not in Telegram WebApp context - just close the modal
    console.log('[PaymentModal] Not in Telegram WebApp, closing modal');
    close();
  }
}

function close() {
  isOpen.value = false;
}

// Reset form when modal closes
watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      error.value = '';
      emailInput.value = '';
      emailError.value = '';
      paymentInitiated.value = false;
    }
  },
);

// Clear email error when user types valid email
watch(emailInput, (newVal) => {
  if (newVal && validateEmail(newVal)) {
    emailError.value = '';
  }
});
</script>
