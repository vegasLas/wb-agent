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
        <AuthAlert
          :visible="!!displayError"
          severity="error"
          :message="displayError"
          class="mb-4"
        >
          <div v-if="isEmailExists" class="mt-2">
            <RouterLink to="/login" class="text-purple hover:underline text-sm">
              Перейти ко входу
            </RouterLink>
          </div>
        </AuthAlert>

        <!-- Rate limit info -->
        <AuthAlert
          :visible="isRateLimited"
          severity="warning"
          message="Слишком много попыток регистрации. Пожалуйста, подождите немного перед следующей попыткой."
          class="mb-4"
        />

        <!-- Success Message -->
        <AuthAlert
          :visible="success"
          severity="success"
          title="Регистрация успешна!"
          message="Письмо с подтверждением отправлено на ваш email. Перейдите по ссылке в письме, чтобы активировать аккаунт. Если не видите письмо, проверьте папку «Спам»."
          class="mb-4"
        />

        <!-- Register Form -->
        <form
          v-if="!success"
          class="space-y-4"
          @submit.prevent="handleRegister"
        >
          <FormField
            label="Имя"
            required
            :error="fieldErrors.name"
            :show-error="touched.name"
          >
            <InputText
              v-model="form.name"
              type="text"
              placeholder="Введите ваше имя"
              class="w-full"
              :disabled="isLoading"
              :class="{ 'p-invalid': touched.name && fieldErrors.name }"
              @blur="touched.name = true"
            />
          </FormField>

          <FormField
            label="Email"
            required
            :error="fieldErrors.email"
            :show-error="touched.email"
          >
            <InputText
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              class="w-full"
              :disabled="isLoading"
              :class="{ 'p-invalid': touched.email && fieldErrors.email }"
              @blur="touched.email = true"
            />
          </FormField>

          <FormField
            label="Пароль"
            required
            :error="fieldErrors.password"
            :show-error="touched.password"
            hint="Минимум 8 символов"
          >
            <Password
              v-model="form.password"
              placeholder="Минимум 8 символов"
              class="w-full"
              :disabled="isLoading"
              :feedback="true"
              toggle-mask
              input-class="w-full"
              prompt-label="Введите пароль"
              weak-label="Слабый"
              medium-label="Средний"
              strong-label="Надежный"
              :class="{ 'p-invalid': touched.password && fieldErrors.password }"
              @blur="touched.password = true"
            />
          </FormField>

          <FormField
            label="Повторите пароль"
            required
            :error="fieldErrors.confirmPassword"
            :show-error="touched.confirmPassword"
          >
            <Password
              v-model="form.confirmPassword"
              placeholder="Повторите пароль"
              class="w-full"
              :disabled="isLoading"
              :feedback="false"
              toggle-mask
              input-class="w-full"
              :class="{ 'p-invalid': touched.confirmPassword && fieldErrors.confirmPassword }"
              @blur="touched.confirmPassword = true"
            />
          </FormField>

          <FormField
            label="Код привязки"
            optional
            :error="fieldErrors.telegramCode"
            :show-error="touched.telegramCode"
            hint="Если вы получили код привязки, введите его здесь"
          >
            <InputText
              v-model="form.telegramCode"
              type="text"
              placeholder="ABC123"
              class="w-full"
              :disabled="isLoading"
              maxlength="6"
              :class="{ 'p-invalid': touched.telegramCode && fieldErrors.telegramCode }"
              @blur="touched.telegramCode = true"
            />
          </FormField>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading"
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
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBrowserAuthStore } from '@/stores/auth';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import FormField from '@/components/ui/FormField.vue';
import AuthAlert from '@/components/ui/AuthAlert.vue';
import { useRegisterForm } from '@/composables/auth/useRegisterForm';

const route = useRoute();
const router = useRouter();
const authStore = useBrowserAuthStore();

const {
  form,
  touched,
  isLoading,
  success,
  fieldErrors,
  isRateLimited,
  isEmailExists,
  displayError,
  handleRegister,
} = useRegisterForm();

onMounted(() => {
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string;
    router.push(redirect || '/');
    return;
  }

  const codeFromUrl = route.query.telegramCode;
  if (typeof codeFromUrl === 'string' && codeFromUrl) {
    form.value.telegramCode = codeFromUrl.slice(0, 6);
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
</style>
