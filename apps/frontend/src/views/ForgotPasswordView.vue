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
        <AuthAlert
          :visible="success"
          severity="success"
          icon="pi pi-check text-green-500 text-2xl"
          message="Если пользователь с таким email существует, мы отправили письмо для сброса пароля. Если не видите письмо, проверьте папку «Спам»."
        />

        <!-- Form -->
        <form v-if="!success" class="space-y-4" @submit.prevent="handleSubmit">
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
            label="Email"
            required
            :error="fieldErrors.email"
            :show-error="touched"
          >
            <InputText
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="w-full"
              :disabled="isLoading"
              :class="{ 'p-invalid': touched && fieldErrors.email }"
              @blur="touched = true"
            />
          </FormField>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading"
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
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import FormField from '@/components/ui/FormField.vue';
import AuthAlert from '@/components/ui/AuthAlert.vue';
import { useForgotPasswordForm } from '@/composables/auth/useForgotPasswordForm';

const {
  email,
  touched,
  isLoading,
  success,
  isRateLimited,
  fieldErrors,
  displayError,
  handleSubmit,
} = useForgotPasswordForm();
</script>
