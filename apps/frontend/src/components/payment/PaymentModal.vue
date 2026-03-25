<template>
  <BaseModal
    v-model="isOpen"
    title="Оплата"
    size="md"
  >
    <!-- Error Display -->
    <BaseAlert
      v-if="error"
      :title="error"
      color="red"
      icon="error"
      class="mb-4"
    />

    <!-- Step 1: Email Input -->
    <div v-if="!paymentInitiated" class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ tariffName }}</h3>
        <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {{ tariffPrice }} ₽
        </span>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        Укажите ваш email для получения чека, после оплаты
      </p>

      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          v-model="emailInput"
          type="email"
          placeholder="example@mail.com"
          :class="[
            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
            emailError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:bg-gray-700 dark:text-white'
          ]"
        />
        <p v-if="emailError" class="text-sm text-red-600">{{ emailError }}</p>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="close">
          Отмена
        </BaseButton>
        <BaseButton :loading="loading" @click="handleEmailSubmit">
          Продолжить
        </BaseButton>
      </div>
    </div>

    <!-- Step 2: Success Message -->
    <div v-else class="text-center py-4">
      <CheckCircleIcon class="text-green-500 w-16 h-16 mx-auto mb-4" />
      <p class="text-lg font-medium mb-2 text-gray-900 dark:text-white">Ссылка на оплату отправлена</p>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Мы отправили ссылку для оплаты в чат. Пожалуйста, проверьте сообщения.
      </p>
      <BaseButton @click="goToChat">
        Перейти в чат
      </BaseButton>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { BaseButton, BaseModal, BaseAlert } from '../ui';
import { CheckCircleIcon } from '@heroicons/vue/24/outline';

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
  } catch (e: any) {
    console.error('Error initializing payment:', e);
    error.value = e?.message || 'Ошибка при создании платежа';
    emit('fail');
  }
}

function goToChat() {
  // Check if Telegram WebApp is available
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close();
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
  }
);

// Clear email error when user types valid email
watch(emailInput, (newVal) => {
  if (newVal && validateEmail(newVal)) {
    emailError.value = '';
  }
});
</script>
