<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between mb-4">
      <h3
        class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
      >
        Авторизация в WB
      </h3>
    </div>

    <div class="space-y-4">
      <!-- Phone Number Step -->
      <div
        v-if="authStore.needsPhone"
        class="space-y-4"
      >
        <div class="text-center">
          <i class="pi pi-mobile text-5xl mx-auto mb-4 text-blue-500 block" />
          <h4 class="text-lg font-medium mb-2">
            Введите номер телефона
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Введите номер телефона, привязанный к вашему аккаунту WB
          </p>
        </div>

        <!-- Error Message -->
        <Message
          v-if="authStore.error"
          severity="error"
          :closable="false"
        >
          <div class="font-medium">
            {{ getErrorTitle(authStore.error) }}
          </div>
          <div class="text-sm">
            {{ authStore.error }}
          </div>
        </Message>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Номер телефона <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="phoneNumber"
            type="tel"
            placeholder="+7 (999) 999-99-99"
            :disabled="authStore.loading"
            class="w-full"
            @keyup.enter="handleVerifyPhone"
          />
        </div>

        <div class="flex justify-between items-center gap-4">
          <Button
            variant="text"
            @click="handleCancel"
          >
            Отмена
          </Button>
          <Button
            :loading="authStore.loading"
            :disabled="isSubmitDisabled"
            severity="primary"
            class="px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            @click="handleVerifyPhone"
          >
            Отправить SMS
          </Button>
        </div>
      </div>

      <!-- SMS Code Step -->
      <div
        v-else-if="authStore.needsSMS"
        class="space-y-4"
      >
        <div class="text-center">
          <i class="pi pi-comments text-5xl mx-auto mb-4 text-blue-500 block" />
          <h4 class="text-lg font-medium mb-2">
            Введите SMS код
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Мы отправили 6-значный код на ваш телефон
          </p>
        </div>

        <!-- Error Message -->
        <Message
          v-if="authStore.error"
          severity="error"
          :closable="false"
        >
          <div class="font-medium">
            {{ getErrorTitle(authStore.error) }}
          </div>
          <div class="text-sm">
            {{ authStore.error }}
          </div>
        </Message>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            SMS код <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="smsCode"
            type="text"
            placeholder="123456"
            maxlength="6"
            :disabled="authStore.loading"
            class="w-full"
            @keyup.enter="handleVerifySMS"
          />
        </div>

        <div class="flex justify-between items-center gap-4">
          <Button
            variant="text"
            @click="handleCancel"
          >
            Отмена
          </Button>
          <Button
            :loading="authStore.loading"
            :disabled="smsCode.length !== 6"
            severity="primary"
            class="px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            @click="handleVerifySMS"
          >
            Подтвердить
          </Button>
        </div>
      </div>

      <!-- Two Factor Step -->
      <div
        v-else-if="authStore.needsTwoFactor"
        class="space-y-4"
      >
        <div class="text-center">
          <i class="pi pi-shield text-5xl mx-auto mb-4 text-blue-500 block" />
          <h4 class="text-lg font-medium mb-2">
            Двухфакторная аутентификация
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Введите код из email для завершения авторизации
          </p>
        </div>

        <!-- Error Message -->
        <Message
          v-if="authStore.error"
          severity="error"
          :closable="false"
        >
          <div class="font-medium">
            {{ getErrorTitle(authStore.error) }}
          </div>
          <div class="text-sm">
            {{ authStore.error }}
          </div>
        </Message>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Код из email <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="twoFactorCode"
            type="text"
            placeholder="123456"
            maxlength="6"
            :disabled="authStore.loading"
            class="w-full"
            @keyup.enter="handleVerifyTwoFactor"
          />
        </div>

        <div class="flex justify-between items-center gap-4">
          <Button
            variant="text"
            @click="handleCancel"
          >
            Отмена
          </Button>
          <Button
            :loading="authStore.loading"
            :disabled="twoFactorCode.length !== 6"
            severity="primary"
            class="px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            @click="handleVerifyTwoFactor"
          >
            Завершить авторизацию
          </Button>
        </div>
      </div>

      <!-- Error Step -->
      <div
        v-else-if="authStore.hasError"
        class="space-y-4"
      >
        <div class="text-center">
          <i class="pi pi-exclamation-triangle text-5xl mx-auto mb-4 text-red-500 block" />
          <h4 class="text-lg font-medium mb-2 text-red-600 dark:text-red-400">
            Ошибка авторизации
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ authStore.error }}
          </p>
        </div>

        <div class="flex justify-between items-center gap-4">
          <Button
            variant="text"
            @click="handleCancel"
          >
            Отмена
          </Button>
          <Button
            severity="primary"
            class="px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            @click="authStore.resetState"
          >
            Попробовать снова
          </Button>
        </div>
      </div>

      <!-- Success Step -->
      <div
        v-else-if="authStore.isCompleted"
        class="space-y-4"
      >
        <div class="text-center">
          <i class="pi pi-check-circle text-5xl mx-auto mb-4 text-green-500 block" />
          <h4
            class="text-lg font-medium mb-2 text-green-600 dark:text-green-400"
          >
            Успешно!
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Авторизация завершена успешно
          </p>
        </div>
      </div>
    </div>

    <!-- Step indicator -->
    <div class="flex justify-center mt-4">
      <div class="text-xs text-gray-500">
        Шаг {{ getCurrentStep() }} из 3
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useAuthStore } from '../../stores/auth';

interface Emits {
  (e: 'cancel'): void;
}

const emit = defineEmits<Emits>();

const authStore = useAuthStore();

// Local reactive refs synced with store
const phoneNumber = ref('');
const smsCode = ref('');
const twoFactorCode = ref('');

// Computed property for button disabled state
const isSubmitDisabled = computed(() => {
  return (
    !phoneNumber.value || phoneNumber.value.length < 10 || authStore.loading
  );
});

function getCurrentStep(): number {
  if (authStore.needsPhone) return 1;
  if (authStore.needsSMS) return 2;
  if (authStore.needsTwoFactor) return 3;
  return 1;
}

async function handleVerifyPhone() {
  if (!phoneNumber.value) return;

  // Update the store with the full phone number including country code
  authStore.setPhoneNumber(phoneNumber.value);
  await authStore.verifyPhone();
}

async function handleVerifySMS() {
  if (smsCode.value.length !== 6) return;

  // Update the store with the SMS code
  authStore.setSMSCode(smsCode.value);
  await authStore.verifySMS();
}

async function handleVerifyTwoFactor() {
  if (twoFactorCode.value.length !== 6) return;

  // Update the store with the two-factor code
  authStore.setTwoFactorCode(twoFactorCode.value);
  await authStore.verifyTwoFactor();
}

async function handleCancel() {
  await authStore.cancelAuth();
  emit('cancel');
}

// Start auth when component mounts
onMounted(() => {
  if (authStore.isIdle) {
    authStore.startAuth();
  }
});

// Sync local refs with store values
watch(
  () => authStore.phoneNumber,
  (newPhone) => {
    if (newPhone && !phoneNumber.value) {
      phoneNumber.value = newPhone;
    }
  },
  { immediate: true },
);

watch(
  () => authStore.smsCode,
  (newCode) => {
    if (newCode !== smsCode.value) {
      smsCode.value = newCode;
    }
  },
  { immediate: true },
);

watch(
  () => authStore.twoFactorCode,
  (newCode) => {
    if (newCode !== twoFactorCode.value) {
      twoFactorCode.value = newCode;
    }
  },
  { immediate: true },
);

// Emit cancel when auth is completed
watch(
  () => authStore.isCompleted,
  (completed) => {
    if (completed) {
      setTimeout(() => {
        emit('cancel');
      }, 2000); // Close after 2 seconds to show success message
    }
  },
);

function getErrorTitle(error: string): string {
  if (error.includes('Неверный номер телефона')) {
    return 'Неверный номер';
  } else if (error.includes('Неверный код подтверждения')) {
    return 'Неверный SMS код';
  } else if (
    error.includes('двухфакторной аутентификации') ||
    error.includes('Неверный код')
  ) {
    return 'Неверный код 2FA';
  } else if (error.includes('Время ожидания') || error.includes('истекло')) {
    return 'Время истекло';
  } else {
    return 'Ошибка';
  }
}
</script>
