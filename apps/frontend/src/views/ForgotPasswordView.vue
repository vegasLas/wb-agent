<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-4 shadow-lg">
          <i class="pi pi-shopping-bag text-white text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-theme mb-2">wboi</h1>
        <p class="text-secondary">Восстановление пароля</p>
      </div>

      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">Сброс пароля</h2>

        <!-- Success -->
        <div v-if="success" class="py-4 text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
            <i class="pi pi-check text-green-500 text-2xl" />
          </div>
          <p class="text-secondary text-sm">
            Если пользователь с таким email существует, мы отправили письмо для сброса пароля.
          </p>
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
            <label class="block text-sm font-medium text-secondary mb-1.5">Email</label>
            <InputText
              v-model="email"
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

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading || !email"
            class="w-full"
            label="Отправить ссылку"
            icon="pi pi-send"
          />
        </form>

        <div class="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
          <RouterLink to="/login" class="text-purple hover:underline text-sm">
            Вернуться ко входу
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { forgotPassword } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';

const email = ref('');
const isLoading = ref(false);
const error = ref<AuthAPIError | null>(null);
const success = ref(false);

const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');

const fieldErrors = computed<Record<string, string>>(() => {
  if (error.value?.code === 'VALIDATION_ERROR') {
    return error.value.fieldErrors;
  }
  return {};
});

const displayError = computed(() => {
  if (!error.value) return null;
  const code = error.value.code;
  if (code === 'RATE_LIMITED') return null; // shown in separate banner
  if (code === 'VALIDATION_ERROR') return 'Проверьте правильность заполнения полей.';
  if (code === 'INTERNAL_ERROR') return 'Сервис временно недоступен. Попробуйте позже.';
  return error.value.message || 'Ошибка отправки';
});

async function handleSubmit() {
  error.value = null;
  isLoading.value = true;

  try {
    await forgotPassword(email.value.trim());
    success.value = true;
    toastHelpers.success('Письмо отправлено', 'Если пользователь существует, письмо для сброса пароля отправлено.');
  } catch (err: unknown) {
    if (err instanceof AuthAPIError) {
      error.value = err;
    } else {
      error.value = new AuthAPIError(500, 'Ошибка отправки', 'INTERNAL_ERROR');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>
