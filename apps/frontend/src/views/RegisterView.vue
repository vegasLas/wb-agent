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
          v-if="error"
          class="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-exclamation-circle text-red-500 mt-0.5" />
            <p class="text-red-500 text-sm">
              {{ error }}
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
            />
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
            />
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
            />
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
            />
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

const route = useRoute();

const vkAuthUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1';
  return `${base}/auth/vk`;
});
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import apiClient from '@/api/client';

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  telegramCode: '',
});

onMounted(() => {
  const codeFromUrl = route.query.telegramCode;
  if (typeof codeFromUrl === 'string' && codeFromUrl) {
    form.value.telegramCode = codeFromUrl.slice(0, 6);
  }
});

const isLoading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const isFormValid = computed(() => {
  return (
    form.value.name.trim().length >= 2 &&
    form.value.email.includes('@') &&
    form.value.password.length >= 8 &&
    form.value.password === form.value.confirmPassword
  );
});

async function handleRegister() {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Пароли не совпадают';
    return;
  }

  error.value = null;
  isLoading.value = true;

  try {
    const payload: any = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
    };
    if (form.value.telegramCode.trim()) {
      payload.telegramCode = form.value.telegramCode.trim();
    }
    await apiClient.post('/auth/register', payload);
    success.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Ошибка регистрации';
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
