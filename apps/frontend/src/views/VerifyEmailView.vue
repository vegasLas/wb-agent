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

        <!-- Token expired -->
        <div v-else-if="tokenErrorType === 'expired'" class="py-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10 mb-4">
            <i class="pi pi-clock text-yellow-500 text-2xl" />
          </div>
          <h2 class="text-lg font-semibold text-theme mb-2">Ссылка устарела</h2>
          <p class="text-secondary text-sm mb-4">
            Срок действия ссылки для подтверждения истек. Вы можете запросить новое письмо.
          </p>
          <div class="space-y-3">
            <InputText
              v-model="resendEmail"
              type="email"
              placeholder="your@email.com"
              class="w-full"
            />
            <Button
              :loading="resendLoading"
              :disabled="!resendEmail"
              label="Отправить письмо повторно"
              icon="pi pi-send"
              class="w-full"
              @click="handleResend"
            />
          </div>
          <p v-if="resendSuccess" class="text-green-500 text-sm mt-3">
            Письмо отправлено. Проверьте вашу почту.
          </p>
          <p v-if="resendError" class="text-red-500 text-sm mt-3">
            {{ resendError }}
          </p>
          <div class="mt-4">
            <RouterLink to="/login" class="text-purple hover:underline text-sm">
              На страницу входа
            </RouterLink>
          </div>
        </div>

        <!-- Token already used -->
        <div v-else-if="tokenErrorType === 'used'" class="py-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
            <i class="pi pi-check text-green-500 text-2xl" />
          </div>
          <h2 class="text-lg font-semibold text-theme mb-2">Email уже подтвержден</h2>
          <p class="text-secondary text-sm mb-6">
            Этот email был подтвержден ранее. Вы можете войти в систему.
          </p>
          <RouterLink to="/login">
            <Button label="Войти" icon="pi pi-sign-in" class="w-full" />
          </RouterLink>
        </div>

        <!-- Generic Error -->
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
import InputText from 'primevue/inputtext';
import { verifyEmail, resendVerification } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';

const route = useRoute();

const isLoading = ref(true);
const success = ref(false);
const error = ref<string | null>(null);
const tokenErrorType = ref<'expired' | 'used' | 'invalid' | 'wrong_type' | null>(null);

const resendEmail = ref('');
const resendLoading = ref(false);
const resendSuccess = ref(false);
const resendError = ref<string | null>(null);

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    isLoading.value = false;
    error.value = 'Отсутствует токен подтверждения';
    return;
  }

  try {
    await verifyEmail(token);
    success.value = true;
    toastHelpers.success('Email подтвержден', 'Теперь вы можете войти в систему.');
  } catch (err: unknown) {
    const apiErr = err instanceof AuthAPIError ? err : null;
    if (apiErr) {
      tokenErrorType.value = apiErr.tokenErrorType;
      if (!tokenErrorType.value) {
        error.value = apiErr.message;
      }
    } else {
      error.value = 'Не удалось подтвердить email';
    }
  } finally {
    isLoading.value = false;
  }
});

async function handleResend() {
  if (!resendEmail.value.trim()) return;
  resendLoading.value = true;
  resendError.value = null;
  resendSuccess.value = false;

  try {
    await resendVerification(resendEmail.value.trim());
    resendSuccess.value = true;
  } catch (err: unknown) {
    const apiErr = err instanceof AuthAPIError ? err : null;
    resendError.value = apiErr?.message || 'Не удалось отправить письмо';
  } finally {
    resendLoading.value = false;
  }
}
</script>
