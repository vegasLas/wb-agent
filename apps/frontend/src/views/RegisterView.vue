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
          Регистрация
        </p>
      </div>

      <!-- Register Card -->
      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">
          Создать аккаунт
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
              <div v-if="isEmailExists" class="mt-2">
                <RouterLink to="/login" class="text-purple hover:underline text-sm">
                  Перейти ко входу
                </RouterLink>
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
              Слишком много попыток регистрации. Пожалуйста, подождите немного перед следующей попыткой.
            </p>
          </div>
        </div>

        <!-- Success Message -->
        <div
          v-if="success"
          class="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle text-green-500 mt-0.5" />
            <div class="text-green-500 text-sm">
              <p class="font-medium">Регистрация успешна!</p>
              <p>Письмо с подтверждением отправлено на ваш email. Перейдите по ссылке в письме, чтобы активировать аккаунт.</p>
            </div>
          </div>
        </div>

        <!-- Register Form -->
        <form
          v-if="!success"
          class="space-y-4"
          @submit.prevent="handleRegister"
        >
          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Имя
            </label>
            <InputText
              v-model="form.name"
              type="text"
              required
              placeholder="Введите ваше имя"
              class="w-full"
              :disabled="isLoading"
              :class="{ 'p-invalid': fieldErrors.name }"
            />
            <small v-if="fieldErrors.name" class="p-error text-xs mt-1 block">
              {{ fieldErrors.name }}
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Email
            </label>
            <InputText
              v-model="form.email"
              type="email"
              required
              placeholder="your@email.com"
              class="w-full"
              :disabled="isLoading"
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
              v-model="form.password"
              required
              placeholder="Минимум 8 символов"
              class="w-full"
              :disabled="isLoading"
              :feedback="true"
              toggle-mask
              input-class="w-full"
              :class="{ 'p-invalid': fieldErrors.password }"
            />
            <small v-if="fieldErrors.password" class="p-error text-xs mt-1 block">
              {{ fieldErrors.password }}
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Повторите пароль
            </label>
            <Password
              v-model="form.confirmPassword"
              required
              placeholder="Повторите пароль"
              class="w-full"
              :disabled="isLoading"
              :feedback="false"
              toggle-mask
              input-class="w-full"
            />
            <small v-if="passwordMismatch" class="p-error text-xs mt-1 block">
              Пароли не совпадают
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Код из Telegram бота <span class="text-xs text-secondary/60">(необязательно)</span>
            </label>
            <InputText
              v-model="form.telegramCode"
              type="text"
              placeholder="ABC123"
              class="w-full"
              :disabled="isLoading"
              maxlength="6"
              :class="{ 'p-invalid': fieldErrors.telegramCode }"
            />
            <small v-if="fieldErrors.telegramCode" class="p-error text-xs mt-1 block">
              {{ fieldErrors.telegramCode }}
            </small>
            <p class="text-xs text-secondary/60 mt-1">
              Если вы получили код в Telegram боте, введите его здесь для привязки аккаунта
            </p>
          </div>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading || !isFormValid"
            class="w-full mt-2"
            label="Зарегистрироваться"
            icon="pi pi-user-plus"
          />

          <!-- Legal Agreement -->
          <p class="text-muted text-xs text-center leading-relaxed mt-3">
            Регистрируясь, вы соглашаетесь с
            <RouterLink to="/terms" class="text-purple hover:underline">Пользовательским соглашением</RouterLink>
            и
            <RouterLink to="/privacy" class="text-purple hover:underline">Политикой конфиденциальности</RouterLink>
          </p>
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

        <!-- Login Link -->
        <div class="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
          <p class="text-secondary text-sm">
            Уже есть аккаунт?
            <RouterLink to="/login" class="text-purple hover:underline ml-1">
              Войти
            </RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { register } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';

const route = useRoute();

const vkAuthUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1';
  return `${base}/auth/vk`;
});

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  telegramCode: '',
});

const isLoading = ref(false);
const error = ref<AuthAPIError | null>(null);
const success = ref(false);
const passwordMismatch = ref(false);

onMounted(() => {
  const codeFromUrl = route.query.telegramCode;
  if (typeof codeFromUrl === 'string' && codeFromUrl) {
    form.value.telegramCode = codeFromUrl.slice(0, 6);
  }
});

const isFormValid = computed(() => {
  return (
    form.value.name.trim().length >= 2 &&
    form.value.email.includes('@') &&
    form.value.password.length >= 8 &&
    form.value.password === form.value.confirmPassword
  );
});

const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');
const isEmailExists = computed(() => {
  if (error.value?.code !== 'BAD_REQUEST') return false;
  const msg = error.value.message.toLowerCase();
  return msg.includes('уже существует') || msg.includes('already exists');
});

const fieldErrors = computed<Record<string, string>>(() => {
  if (error.value?.code === 'VALIDATION_ERROR') {
    return error.value.fieldErrors;
  }
  return {};
});

const displayError = computed(() => {
  if (!error.value) return null;
  const code = error.value.code;
  const message = error.value.message;

  switch (code) {
    case 'RATE_LIMITED':
      return null; // shown in separate banner
    case 'VALIDATION_ERROR':
      return 'Проверьте правильность заполнения полей.';
    case 'BAD_REQUEST': {
      const msg = message.toLowerCase();
      if (msg.includes('telegram') && msg.includes('привязан')) {
        return 'Этот Telegram-аккаунт уже привязан к email.';
      }
      if (msg.includes('уже существует') || msg.includes('already exists')) {
        return 'Пользователь с таким email уже существует.';
      }
      if (msg.includes('пароль') && msg.includes('8')) {
        return 'Пароль должен быть не менее 8 символов.';
      }
      return message;
    }
    case 'INTERNAL_ERROR':
      return 'Сервис временно недоступен. Попробуйте позже.';
    default:
      return message || 'Ошибка регистрации';
  }
});

async function handleRegister() {
  passwordMismatch.value = false;

  if (form.value.password !== form.value.confirmPassword) {
    passwordMismatch.value = true;
    return;
  }

  error.value = null;
  isLoading.value = true;

  try {
    const payload: {
      name: string;
      email: string;
      password: string;
      telegramCode?: string;
    } = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
    };
    if (form.value.telegramCode.trim()) {
      payload.telegramCode = form.value.telegramCode.trim();
    }
    await register(payload);
    success.value = true;
    toastHelpers.success('Регистрация успешна', 'Письмо с подтверждением отправлено на ваш email.');
  } catch (err: unknown) {
    if (err instanceof AuthAPIError) {
      error.value = err;
    } else {
      error.value = new AuthAPIError(500, 'Ошибка регистрации', 'INTERNAL_ERROR');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
:deep(.p-password) {
  width: 100%;
}
:deep(.p-password-input) {
  width: 100%;
}
</style>
