<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-4 shadow-lg">
          <i class="pi pi-shopping-bag text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-theme mb-2">WB Agent</h1>
        <p class="text-secondary">Вход в браузерную версию</p>
      </div>

      <!-- Login Card -->
      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">Вход в систему</h2>

        <!-- Error Message -->
        <div 
          v-if="authStore.error" 
          class="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-exclamation-circle text-red-500 mt-0.5"></i>
            <p class="text-red-500 text-sm">{{ authStore.error }}</p>
          </div>
        </div>

        <!-- Info Message -->
        <div class="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-blue-500 mt-0.5"></i>
            <div class="text-blue-500 text-sm">
              <p class="font-medium mb-1">Нужны данные для входа?</p>
              <p>Откройте Telegram и отправьте <code class="bg-blue-500/20 px-1.5 py-0.5 rounded">/login</code> боту @wb_booking_bot</p>
            </div>
          </div>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Логин
            </label>
            <InputText
              v-model="form.login"
              type="text"
              required
              placeholder="Введите ваш логин"
              class="w-full"
              :disabled="authStore.isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary mb-1.5">
              Пароль
            </label>
            <Password
              v-model="form.password"
              required
              placeholder="Введите ваш пароль"
              class="w-full"
              :disabled="authStore.isLoading"
              :feedback="false"
              toggleMask
              inputClass="w-full"
            />
          </div>

          <Button
            type="submit"
            :loading="authStore.isLoading"
            :disabled="authStore.isLoading || !form.login || !form.password"
            class="w-full mt-2"
            label="Войти"
            icon="pi pi-sign-in"
          />
        </form>

        <!-- Help Section -->
        <div class="mt-6 pt-6 border-t border-[var(--color-border)]">
          <div class="text-center">
            <p class="text-secondary text-sm mb-2">Забыли данные для входа?</p>
            <p class="text-muted text-xs">
              Отправьте <code class="bg-[var(--color-elevated)] px-1.5 py-0.5 rounded">/reset_password</code> в Telegram боте
            </p>
          </div>
        </div>
      </div>

      <!-- Back to Telegram -->
      <div class="mt-6 text-center">
        <a 
          href="https://t.me/wb_booking_bot" 
          target="_blank"
          class="inline-flex items-center gap-2 text-secondary hover:text-purple transition-colors text-sm"
        >
          <i class="pi pi-telegram"></i>
          <span>Вернуться в Telegram бота</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { useBrowserAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useBrowserAuthStore();

const form = ref({
  login: '',
  password: '',
});

async function handleLogin() {
  authStore.clearError();
  
  const success = await authStore.login(form.value.login, form.value.password);
  
  if (success) {
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/');
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
/* Ensure Password component takes full width */
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
