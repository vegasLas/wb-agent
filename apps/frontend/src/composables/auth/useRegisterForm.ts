import { ref, computed } from 'vue';
import { register } from '@/api/auth/endpoints';
import { AuthAPIError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from '@/utils/validation';

export function useRegisterForm() {
  const form = ref({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    telegramCode: '',
  });

  const touched = ref({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    telegramCode: false,
  });

  const isLoading = ref(false);
  const error = ref<AuthAPIError | null>(null);
  const success = ref(false);

  const fieldErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};

    const nameError = validateName(form.value.name);
    if (nameError) errors.name = nameError;

    const emailError = validateEmail(form.value.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(form.value.password);
    if (passwordError) errors.password = passwordError;

    const confirmError = validateConfirmPassword(
      form.value.password,
      form.value.confirmPassword,
    );
    if (confirmError) errors.confirmPassword = confirmError;

    if (error.value?.code === 'VALIDATION_ERROR') {
      Object.assign(errors, error.value.fieldErrors);
    }

    return errors;
  });

  const isRateLimited = computed(() => error.value?.code === 'RATE_LIMITED');

  const isEmailExists = computed(() => {
    if (error.value?.code !== 'BAD_REQUEST') return false;
    const msg = error.value.message.toLowerCase();
    return msg.includes('уже существует') || msg.includes('already exists');
  });

  const displayError = computed(() => {
    if (!error.value) return null;
    const { code, message } = error.value;

    switch (code) {
      case 'RATE_LIMITED':
        return null;
      case 'VALIDATION_ERROR':
        return 'Проверьте правильность заполнения полей.';
      case 'BAD_REQUEST': {
        const msg = message.toLowerCase();
        if (msg.includes('telegram') && msg.includes('привязан')) {
          return 'Этот Telegram-аккаунт уже привязан к email.';
        }
        if (msg.includes('уже существует') || msg.includes('already exists')) {
          return 'Пользователь с таким email уже существует.';
        }
        if (msg.includes('пароль') && msg.includes('8')) {
          return 'Пароль должен быть не менее 8 символов.';
        }
        return message;
      }
      case 'INTERNAL_ERROR':
        return 'Сервис временно недоступен. Попробуйте позже.';
      default:
        return message || 'Ошибка регистрации';
    }
  });

  function touchAll() {
    touched.value = {
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      telegramCode: true,
    };
  }

  function hasClientErrors() {
    return Object.keys(fieldErrors.value).length > 0;
  }

  async function handleRegister() {
    error.value = null;
    touchAll();

    if (hasClientErrors()) {
      return;
    }

    isLoading.value = true;

    try {
      const payload: {
        name: string;
        email: string;
        password: string;
        telegramCode?: string;
      } = {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
      };
      if (form.value.telegramCode.trim()) {
        payload.telegramCode = form.value.telegramCode.trim();
      }
      await register(payload);
      success.value = true;
      toastHelpers.success(
        'Регистрация успешна',
        'Письмо с подтверждением отправлено на ваш email.',
      );
    } catch (err: unknown) {
      if (err instanceof AuthAPIError) {
        error.value = err;
      } else {
        error.value = new AuthAPIError(500, 'Ошибка регистрации', 'INTERNAL_ERROR');
      }
    } finally {
      isLoading.value = false;
    }
  }

  return {
    form,
    touched,
    isLoading,
    error,
    success,
    fieldErrors,
    isRateLimited,
    isEmailExists,
    displayError,
    touchAll,
    hasClientErrors,
    handleRegister,
  };
}
