import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { resetPassword } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';
import { validatePassword, validateConfirmPassword } from '@/utils/validation';

export function useResetPasswordForm() {
  const route = useRoute();

  const token = ref((route.query.token as string) || '');
  const password = ref('');
  const confirmPassword = ref('');
  const isLoading = ref(false);
  const error = ref<AuthAPIError | null>(null);
  const success = ref(false);
  const tokenErrorType = ref<'expired' | 'used' | 'invalid' | 'wrong_type' | null>(
    null,
  );

  const touched = ref({
    password: false,
    confirmPassword: false,
  });

  const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');

  const fieldErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};

    if (touched.value.password) {
      const pwdError = validatePassword(password.value);
      if (pwdError) errors.password = pwdError;
    }

    if (touched.value.confirmPassword) {
      const confirmError = validateConfirmPassword(
        password.value,
        confirmPassword.value,
      );
      if (confirmError) errors.confirmPassword = confirmError;
    }

    if (error.value?.code === 'VALIDATION_ERROR') {
      Object.assign(errors, error.value.fieldErrors);
    }

    return errors;
  });

  const displayError = computed(() => {
    if (!error.value || tokenErrorType.value) return null;
    const { code } = error.value;
    if (code === 'RATE_LIMITED') return null;
    if (code === 'VALIDATION_ERROR')
      return 'Проверьте правильность заполнения полей.';
    if (code === 'INTERNAL_ERROR')
      return 'Сервис временно недоступен. Попробуйте позже.';
    return error.value.message || 'Ошибка сброса пароля';
  });

  async function handleSubmit() {
    error.value = null;
    tokenErrorType.value = null;
    touched.value = { password: true, confirmPassword: true };

    if (Object.keys(fieldErrors.value).length > 0) {
      return;
    }

    if (!token.value) {
      error.value = new AuthAPIError(
        400,
        'Отсутствует токен сброса пароля',
        'BAD_REQUEST',
      );
      return;
    }

    isLoading.value = true;

    try {
      await resetPassword(token.value, password.value);
      success.value = true;
      toastHelpers.success(
        'Пароль изменен',
        'Теперь вы можете войти с новым паролем.',
      );
    } catch (err: unknown) {
      if (err instanceof AuthAPIError) {
        error.value = err;
        tokenErrorType.value = err.tokenErrorType;
      } else {
        error.value = new AuthAPIError(
          500,
          'Ошибка сброса пароля',
          'INTERNAL_ERROR',
        );
      }
    } finally {
      isLoading.value = false;
    }
  }

  return {
    token,
    password,
    confirmPassword,
    isLoading,
    error,
    success,
    tokenErrorType,
    isRateLimited,
    fieldErrors,
    displayError,
    handleSubmit,
  };
}
