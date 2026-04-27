<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="w-full max-w-md text-center">
      <!-- Logo -->
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-6 shadow-lg">
        <i class="pi pi-shopping-bag text-white text-2xl" />
      </div>

      <div class="crypto-card">
        <!-- Loading -->
        <div v-if="isLoading" class="py-8">
          <i class="pi pi-spinner pi-spin text-purple text-3xl" />
          <p class="text-secondary mt-4">Подтверждение email...</p>
        </div>

        <!-- Success -->
        <div v-else-if="success" class="py-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
            <i class="pi pi-check text-green-500 text-2xl" />
          </div>
          <h2 class="text-lg font-semibold text-theme mb-2">Email подтвержден!</h2>
          <p class="text-secondary text-sm mb-6">
            Ваш email успешно подтвержден. Теперь вы можете войти в систему.
          </p>
          <RouterLink to="/login">
            <Button label="Войти" icon="pi pi-sign-in" class="w-full" />
          </RouterLink>
        </div>

        <!-- Error -->
        <div v-else class="py-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4">
            <i class="pi pi-times text-red-500 text-2xl" />
          </div>
          <h2 class="text-lg font-semibold text-theme mb-2">Ошибка подтверждения</h2>
          <p class="text-red-500 text-sm mb-6">{{ error }}</p>
          <RouterLink to="/login">
            <Button label="На страницу входа" icon="pi pi-arrow-left" class="w-full" outlined />
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import apiClient from '@/api/client';

const route = useRoute();

const isLoading = ref(true);
const success = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    isLoading.value = false;
    error.value = 'Отсутствует токен подтверждения';
    return;
  }

  try {
    await apiClient.post('/auth/verify-email', { token });
    success.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Не удалось подтвердить email';
  } finally {
    isLoading.value = false;
  }
});
</script>
