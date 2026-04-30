import { ref, computed } from 'vue';
import { forgotPassword } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';
import { validateEmail } from '@/utils/validation';

export function useForgotPasswordForm() {
  const email = ref('');
  const touched = ref(false);
  const isLoading = ref(false);
  const error = ref<AuthAPIError | null>(null);
  const success = ref(false);

  const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');

  const fieldErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};

    if (touched.value) {
      const emailError = validateEmail(email.value);
      if (emailError) errors.email = emailError;
    }

    if (error.value?.code === 'VALIDATION_ERROR') {
      Object.assign(errors, error.value.fieldErrors);
    }

    return errors;
  });

  const displayError = computed(() => {
    if (!error.value) return null;
    const { code } = error.value;
    if (code === 'RATE_LIMITED') return null;
    if (code === 'VALIDATION_ERROR')
      return 'Проверьте правильность заполнения полей.';
    if (code === 'INTERNAL_ERROR')
      return 'Сервис временно недоступен. Попробуйте позже.';
    return error.value.message || 'Ошибка отправки';
  });

  async function handleSubmit() {
    error.value = null;
    touched.value = true;

    if (Object.keys(fieldErrors.value).length > 0) {
      return;
    }

    isLoading.value = true;

    try {
      await forgotPassword(email.value.trim());
      success.value = true;
      toastHelpers.success(
        'Письмо отправлено',
        'Если пользователь существует, письмо для сброса пароля отправлено.',
      );
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

  return {
    email,
    touched,
    isLoading,
    error,
    success,
    isRateLimited,
    fieldErrors,
    displayError,
    handleSubmit,
  };
}
