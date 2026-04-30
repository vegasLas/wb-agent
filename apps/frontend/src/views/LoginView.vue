<template>
  <div
    class="min-h-screen flex items-center justify-center bg-theme p-4 relative overflow-hidden"
  >
    <ParticleBackground class="absolute inset-0" />
    <div class="w-full max-w-md relative z-10">
      <!-- Logo/Brand -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple mb-4 shadow-lg"
        >
          <i class="pi pi-shopping-bag text-white text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-theme mb-2">wboi</h1>
        <p class="text-secondary">Вход в систему</p>
      </div>

      <!-- Login Card -->
      <div class="crypto-card">
        <h2 class="text-lg font-semibold text-theme mb-6">Вход</h2>

        <!-- Error Message -->
        <AuthAlert
          :visible="!!displayError"
          severity="error"
          :message="displayError"
          class="mb-4"
        >
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
        </AuthAlert>

        <!-- Rate limit info -->
        <AuthAlert
          :visible="isRateLimited"
          severity="warning"
          message="Слишком много попыток входа. Пожалуйста, подождите немного перед следующей попыткой."
          class="mb-4"
        />

        <!-- Email Login Form -->
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <FormField
            label="Email"
            required
            :error="fieldErrors.email"
            :show-error="touched.email"
          >
            <InputText
              v-model="emailForm.email"
              type="email"
              placeholder="your@email.com"
              class="w-full"
              :disabled="authStore.isLoading"
              :class="{ 'p-invalid': touched.email && fieldErrors.email }"
              @blur="touched.email = true"
            />
          </FormField>

          <FormField
            label="Пароль"
            required
            :error="fieldErrors.password"
            :show-error="touched.password"
          >
            <Password
              v-model="emailForm.password"
              placeholder="Введите пароль"
              class="w-full"
              :disabled="authStore.isLoading"
              :feedback="false"
              toggle-mask
              input-class="w-full"
              :class="{ 'p-invalid': touched.password && fieldErrors.password }"
              @blur="touched.password = true"
            />
          </FormField>

          <div class="flex items-center justify-between">
            <label
              class="flex items-center gap-2 text-sm text-secondary cursor-pointer"
            >
              <input
                v-model="rememberMe"
                type="checkbox"
                class="rounded border-[var(--color-border)] bg-[var(--color-elevated)] text-purple focus:ring-purple"
              />
              Запомнить меня
            </label>
            <RouterLink
              to="/forgot-password"
              class="text-sm text-purple hover:underline"
            >
              Забыли пароль?
            </RouterLink>
          </div>

          <Button
            type="submit"
            :loading="authStore.isLoading"
            :disabled="authStore.isLoading"
            class="w-full mt-2"
            label="Войти"
            icon="pi pi-sign-in"
          />
        </form>

        <!-- Legal Links -->
        <div class="mt-4 text-center">
          <p class="text-muted text-xs leading-relaxed">
            Используя сервис, вы соглашаетесь с
            <RouterLink to="/terms" class="text-purple hover:underline"
              >Пользовательским соглашением</RouterLink
            >
            и
            <RouterLink to="/privacy" class="text-purple hover:underline"
              >Политикой конфиденциальности</RouterLink
            >
          </p>
        </div>

        <!-- Register Link -->
        <div
          class="mt-6 pt-6 border-t border-[var(--color-border)] text-center"
        >
          <p class="text-secondary text-sm">
            Нет аккаунта?
            <RouterLink to="/register" class="text-purple hover:underline ml-1">
              Зарегистрироваться
            </RouterLink>
          </p>
        </div>
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
import FormField from '@/components/ui/FormField.vue';
import AuthAlert from '@/components/ui/AuthAlert.vue';
import { useLoginForm } from '@/composables/auth/useLoginForm';
import ParticleBackground from '@/components/ParticleBackground.vue';

const router = useRouter();
const route = useRoute();

const routeError = ref((route.query.error as string) || null);

const {
  authStore,
  rememberMe,
  emailForm,
  touched,
  resendLoading,
  resendSuccess,
  resendError,
  isEmailNotVerified,
  isRateLimited,
  fieldErrors,
  displayError,
  touchAll,
  hasClientErrors,
  handleResendVerification,
} = useLoginForm();

async function handleSubmit() {
  authStore.clearError();
  routeError.value = null;
  touchAll();

  if (hasClientErrors()) {
    return;
  }

  const success = await authStore.emailLogin(
    emailForm.value.email,
    emailForm.value.password,
  );

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
