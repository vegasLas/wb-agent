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
          <AuthAlert
            :visible="!!displayError"
            severity="error"
            :message="displayError"
          />

          <AuthAlert
            :visible="isRateLimited"
            severity="warning"
            message="Слишком много попыток. Пожалуйста, подождите немного перед следующей попыткой."
          />

          <FormField
            label="Новый пароль"
            required
            :error="fieldErrors.password"
            :show-error="touched.password"
            hint="Минимум 8 символов"
          >
            <Password
              v-model="password"
              placeholder="Минимум 8 символов"
              class="w-full"
              :disabled="isLoading"
              :feedback="true"
              toggle-mask
              input-class="w-full"
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
              v-model="confirmPassword"
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

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading"
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
import Password from 'primevue/password';
import Button from 'primevue/button';
import FormField from '@/components/ui/FormField.vue';
import AuthAlert from '@/components/ui/AuthAlert.vue';
import { useResetPasswordForm } from '@/composables/auth/useResetPasswordForm';

const {
  password,
  confirmPassword,
  isLoading,
  success,
  tokenErrorType,
  isRateLimited,
  fieldErrors,
  displayError,
  touched,
  handleSubmit,
} = useResetPasswordForm();
</script>

<style scoped>
:deep(.p-password) {
  width: 100%;
}
:deep(.p-password-input) {
  width: 100%;
}
</style>
