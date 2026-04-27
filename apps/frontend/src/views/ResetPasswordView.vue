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

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="error" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p class="text-red-500 text-sm">{{ error }}</p>
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
            />
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
import { useRoute, useRouter } from 'vue-router';
import Password from 'primevue/password';
import Button from 'primevue/button';
import apiClient from '@/api/client';

const route = useRoute();
const router = useRouter();

const token = ref((route.query.token as string) || '');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const isFormValid = computed(() => {
  return password.value.length >= 8 && password.value === confirmPassword.value;
});

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают';
    return;
  }

  if (!token.value) {
    error.value = 'Отсутствует токен сброса пароля';
    return;
  }

  error.value = null;
  isLoading.value = true;

  try {
    await apiClient.post('/auth/reset-password', {
      token: token.value,
      password: password.value,
    });
    success.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Ошибка сброса пароля';
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
