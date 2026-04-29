<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-4 shadow-lg">
          <i class="pi pi-shopping-bag text-white text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-theme mb-2">wboi</h1>
        <p class="text-secondary">Новый пароль</p>
      </div>

      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">Сброс пароля</h2>

        <!-- Success -->
        <div v-if="success" class="py-4 text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
            <i class="pi pi-check text-green-500 text-2xl" />
          </div>
          <p class="text-secondary text-sm mb-4">Пароль успешно изменен!</p>
          <RouterLink to="/login">
            <Button label="Войти" icon="pi pi-sign-in" class="w-full" />
          </RouterLink>
        </div>

        <!-- Token expired / used -->
        <div v-else-if="tokenErrorType === 'expired' || tokenErrorType === 'used'" class="py-4 text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10 mb-4">
            <i class="pi pi-clock text-yellow-500 text-2xl" />
          </div>
          <h2 class="text-lg font-semibold text-theme mb-2">
            {{ tokenErrorType === 'used' ? 'Ссылка уже использована' : 'Ссылка устарела' }}
          </h2>
          <p class="text-secondary text-sm mb-6">
            {{ tokenErrorType === 'used'
              ? 'Эта ссылка для сброса пароля уже была использована ранее.'
              : 'Срок действия ссылки для сброса пароля истек.' }}
          </p>
          <RouterLink to="/forgot-password">
            <Button label="Запросить новую ссылку" icon="pi pi-send" class="w-full" outlined />
          </RouterLink>
          <div class="mt-4">
            <RouterLink to="/login" class="text-purple hover:underline text-sm">
              На страницу входа
            </RouterLink>
          </div>
        </div>

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div
            v-if="displayError"
            class="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <p class="text-red-500 text-sm">{{ displayError }}</p>
          </div>

          <div v-if="isRateLimited" class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p class="text-yellow-500 text-sm">
              Слишком много попыток. Пожалуйста, подождите немного перед следующей попыткой.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">Новый пароль</label>
            <Password
              v-model="password"
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
            <label class="block text-sm font-medium text-secondary mb-1.5">Повторите пароль</label>
            <Password
              v-model="confirmPassword"
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

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading || !isFormValid"
            class="w-full"
            label="Изменить пароль"
            icon="pi pi-key"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { resetPassword } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';

const route = useRoute();
const token = ref((route.query.token as string) || '');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<AuthAPIError | null>(null);
const success = ref(false);
const passwordMismatch = ref(false);
const tokenErrorType = ref<'expired' | 'used' | 'invalid' | 'wrong_type' | null>(null);

const isFormValid = computed(() => {
  return password.value.length >= 8 && password.value === confirmPassword.value;
});

const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');

const fieldErrors = computed<Record<string, string>>(() => {
  if (error.value?.code === 'VALIDATION_ERROR') {
    return error.value.fieldErrors;
  }
  return {};
});

const displayError = computed(() => {
  if (!error.value || tokenErrorType.value) return null;
  const code = error.value.code;
  if (code === 'RATE_LIMITED') return null;
  if (code === 'VALIDATION_ERROR') return 'Проверьте правильность заполнения полей.';
  if (code === 'INTERNAL_ERROR') return 'Сервис временно недоступен. Попробуйте позже.';
  return error.value.message || 'Ошибка сброса пароля';
});

async function handleSubmit() {
  passwordMismatch.value = false;

  if (password.value !== confirmPassword.value) {
    passwordMismatch.value = true;
    return;
  }

  if (!token.value) {
    error.value = new AuthAPIError(400, 'Отсутствует токен сброса пароля', 'BAD_REQUEST');
    return;
  }

  error.value = null;
  tokenErrorType.value = null;
  isLoading.value = true;

  try {
    await resetPassword(token.value, password.value);
    success.value = true;
    toastHelpers.success('Пароль изменен', 'Теперь вы можете войти с новым паролем.');
  } catch (err: unknown) {
    if (err instanceof AuthAPIError) {
      error.value = err;
      tokenErrorType.value = err.tokenErrorType;
    } else {
      error.value = new AuthAPIError(500, 'Ошибка сброса пароля', 'INTERNAL_ERROR');
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
