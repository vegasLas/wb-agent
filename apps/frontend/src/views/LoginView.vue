<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-4 shadow-lg">
          <i class="pi pi-shopping-bag text-white text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-theme mb-2">
          wboi
        </h1>
        <p class="text-secondary">
          Вход в систему
        </p>
      </div>

      <!-- Login Card -->
      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">
          Вход
        </h2>

        <!-- Error Message -->
        <div
          v-if="displayError"
          class="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-exclamation-circle text-red-500 mt-0.5" />
            <div class="text-red-500 text-sm">
              <p>{{ displayError }}</p>
              <!-- Resend verification action -->
              <div v-if="isEmailNotVerified" class="mt-2">
                <button
                  class="text-purple hover:underline text-sm"
                  :disabled="resendLoading"
                  @click="handleResendVerification"
                >
                  {{ resendLoading ? 'Отправка...' : 'Отправить письмо повторно' }}
                </button>
                <p v-if="resendSuccess" class="text-green-500 text-xs mt-1">
                  Письмо отправлено. Проверьте вашу почту.
                </p>
                <p v-if="resendError" class="text-red-500 text-xs mt-1">
                  {{ resendError }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rate limit info -->
        <div
          v-if="isRateLimited"
          class="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-clock text-yellow-500 mt-0.5" />
            <p class="text-yellow-500 text-sm">
              Слишком много попыток входа. Пожалуйста, подождите немного перед следующей попыткой.
            </p>
          </div>
        </div>

        <!-- Email Login Form -->
        <form
          class="space-y-4"
          @submit.prevent="handleEmailLogin"
        >
          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Email
            </label>
            <InputText
              v-model="emailForm.email"
              type="email"
              required
              placeholder="your@email.com"
              class="w-full"
              :disabled="authStore.isLoading"
              :class="{ 'p-invalid': fieldErrors.email }"
            />
            <small v-if="fieldErrors.email" class="p-error text-xs mt-1 block">
              {{ fieldErrors.email }}
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Пароль
            </label>
            <Password
              v-model="emailForm.password"
              required
              placeholder="Введите пароль"
              class="w-full"
              :disabled="authStore.isLoading"
              :feedback="false"
              toggle-mask
              input-class="w-full"
              :class="{ 'p-invalid': fieldErrors.password }"
            />
            <small v-if="fieldErrors.password" class="p-error text-xs mt-1 block">
              {{ fieldErrors.password }}
            </small>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="rounded border-[var(--color-border)] bg-[var(--color-elevated)] text-purple focus:ring-purple"
              />
              Запомнить меня
            </label>
            <RouterLink to="/forgot-password" class="text-sm text-purple hover:underline">
              Забыли пароль?
            </RouterLink>
          </div>

          <Button
            type="submit"
            :loading="authStore.isLoading"
            :disabled="authStore.isLoading || !emailForm.email || !emailForm.password"
            class="w-full mt-2"
            label="Войти"
            icon="pi pi-sign-in"
          />
        </form>

        <!-- VK Login (temporarily hidden) -->
        <div v-if="false" class="mt-4">
          <div class="relative flex items-center justify-center my-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-[var(--color-border)]" />
            </div>
            <span class="relative bg-[var(--color-surface)] px-3 text-xs text-secondary">или</span>
          </div>

          <a
            :href="vkAuthUrl"
            class="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-[#4a76a8] text-white font-medium hover:bg-[#3d6694] transition-colors"
          >
            <i class="pi pi-external-link" />
            Войти через VK
          </a>
        </div>

        <!-- Register Link -->
        <div class="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
          <p class="text-secondary text-sm">
            Нет аккаунта?
            <RouterLink to="/register" class="text-purple hover:underline ml-1">
              Зарегистрироваться
            </RouterLink>
          </p>
        </div>
      </div>

      <!-- Back to Telegram -->
      <div class="mt-6 text-center">
        <a
          href="https://t.me/wb_booking_bot"
          target="_blank"
          class="inline-flex items-center gap-2 text-secondary hover:text-purple transition-colors text-sm"
        >
          <i class="pi pi-telegram" />
          <span>Вернуться в Telegram бота</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { useBrowserAuthStore } from '@/stores/auth';
import { resendVerification } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';

const router = useRouter();
const route = useRoute();
const authStore = useBrowserAuthStore();

const rememberMe = ref(false);
const routeError = ref((route.query.error as string) || null);

const emailForm = ref({
  email: '',
  password: '',
});

const resendLoading = ref(false);
const resendSuccess = ref(false);
const resendError = ref<string | null>(null);

const vkAuthUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1';
  return `${base}/auth/vk`;
});

const isEmailNotVerified = computed(() => authStore.errorCode === 'EMAIL_NOT_VERIFIED');
const isRateLimited = computed(() => authStore.errorCode === 'RATE_LIMITED');

const fieldErrors = computed<Record<string, string>>(() => {
  if (authStore.error?.code === 'VALIDATION_ERROR') {
    return authStore.error.fieldErrors;
  }
  return {};
});

const displayError = computed(() => {
  if (routeError.value) return routeError.value;
  if (!authStore.error) return null;

  const code = authStore.error.code;
  const message = authStore.error.message;

  switch (code) {
    case 'EMAIL_NOT_VERIFIED':
      return 'Email не подтвержден. Пожалуйста, проверьте почту и перейдите по ссылке.';
    case 'RATE_LIMITED':
      return null; // shown in separate banner
    case 'UNAUTHORIZED':
      return 'Неверные учетные данные';
    case 'INTERNAL_ERROR':
      return 'Сервис временно недоступен. Попробуйте позже.';
    case 'VALIDATION_ERROR':
      return 'Проверьте правильность заполнения полей.';
    default:
      return message || 'Ошибка входа';
  }
});

async function handleEmailLogin() {
  authStore.clearError();
  routeError.value = null;
  resendSuccess.value = false;
  resendError.value = null;

  const success = await authStore.emailLogin(emailForm.value.email, emailForm.value.password);

  if (success) {
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/');
  }
}

async function handleResendVerification() {
  if (!emailForm.value.email) {
    resendError.value = 'Введите email, чтобы отправить письмо повторно.';
    return;
  }
  resendLoading.value = true;
  resendError.value = null;
  resendSuccess.value = false;

  try {
    await resendVerification(emailForm.value.email.trim());
    resendSuccess.value = true;
  } catch (err: unknown) {
    const apiErr = err instanceof AuthAPIError ? err : null;
    resendError.value = apiErr?.message || 'Не удалось отправить письмо';
  } finally {
    resendLoading.value = false;
  }
}

// Redirect if already authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string;
    router.push(redirect || '/');
  }
});
</script>

<style scoped>
:deep(.p-password) {
  width: 100%;
}
:deep(.p-password-input) {
  width: 100%;
}
:deep(.p-input-icon) {
  color: var(--text-secondary);
}
</style>
