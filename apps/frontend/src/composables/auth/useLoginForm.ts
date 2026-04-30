import { ref, computed } from 'vue';
import { useBrowserAuthStore } from '@/stores/auth';
import { resendVerification } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { validateEmail } from '@/utils/validation';

export function useLoginForm() {
  const authStore = useBrowserAuthStore();

  const rememberMe = ref(false);
  const emailForm = ref({ email: '', password: '' });

  const touched = ref({ email: false, password: false });

  const resendLoading = ref(false);
  const resendSuccess = ref(false);
  const resendError = ref<string | null>(null);

  const isEmailNotVerified = computed(
    () => authStore.errorCode === 'EMAIL_NOT_VERIFIED',
  );
  const isRateLimited = computed(() => authStore.errorCode === 'RATE_LIMITED');

  const fieldErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};

    if (touched.value.email) {
      const emailError = validateEmail(emailForm.value.email);
      if (emailError) errors.email = emailError;
    }

    if (touched.value.password && !emailForm.value.password) {
      errors.password = 'Введите пароль';
    }

    if (authStore.error?.code === 'VALIDATION_ERROR') {
      Object.assign(errors, authStore.error.fieldErrors);
    }

    return errors;
  });

  const displayError = computed(() => {
    if (!authStore.error) return null;

    const { code, message } = authStore.error;

    switch (code) {
      case 'EMAIL_NOT_VERIFIED':
        return 'Email не подтвержден. Пожалуйста, проверьте почту и перейдите по ссылке.';
      case 'RATE_LIMITED':
        return null;
      case 'UNAUTHORIZED':
        return 'Неверные учетные данные';
      case 'INTERNAL_ERROR':
        return 'Сервис временно недоступен. Попробуйте позже.';
      case 'VALIDATION_ERROR':
        return 'Проверьте правильность заполнения полей.';
      default:
        return message || 'Ошибка входа';
    }
  });

  function touchAll() {
    touched.value = { email: true, password: true };
  }

  function hasClientErrors() {
    return Object.keys(fieldErrors.value).length > 0;
  }

  async function handleResendVerification() {
    if (!emailForm.value.email) {
      resendError.value = 'Введите email, чтобы отправить письмо повторно.';
      return;
    }
    resendLoading.value = true;
    resendError.value = null;
    resendSuccess.value = false;

    try {
      await resendVerification(emailForm.value.email.trim());
      resendSuccess.value = true;
    } catch (err: unknown) {
      const apiErr = err instanceof AuthAPIError ? err : null;
      resendError.value = apiErr?.message || 'Не удалось отправить письмо';
    } finally {
      resendLoading.value = false;
    }
  }

  return {
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
  };
}
