import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { authAPI } from '../api';
import { useUserStore } from './user';
import { useAccountSupplierModalStore } from './accountSupplierModal';

export type AuthStep =
  | 'idle'
  | 'phone'
  | 'sms'
  | 'two_factor'
  | 'completed'
  | 'error';

export interface AuthState {
  sessionId: string | null;
  step: AuthStep;
  loading: boolean;
  error: string | null;
  phoneNumber: string;
  smsCode: string;
  twoFactorCode: string;
  supplierName: string | undefined;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const sessionId = ref<string | null>(null);
  const step = ref<AuthStep>('idle');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const phoneNumber = ref('');
  const smsCode = ref('');
  const twoFactorCode = ref('');
  const supplierName = ref<string | undefined>(undefined);

  const userStore = useUserStore();
  const accountSupplierModalStore = useAccountSupplierModalStore();

  // Computed state object for backward compatibility
  const state = computed<AuthState>(() => ({
    sessionId: sessionId.value,
    step: step.value,
    loading: loading.value,
    error: error.value,
    phoneNumber: phoneNumber.value,
    smsCode: smsCode.value,
    twoFactorCode: twoFactorCode.value,
    supplierName: supplierName.value,
  }));

  // Computed
  const isIdle = computed(() => step.value === 'idle');
  const needsPhone = computed(() => step.value === 'phone');
  const needsSMS = computed(() => step.value === 'sms');
  const needsTwoFactor = computed(() => step.value === 'two_factor');
  const isCompleted = computed(() => step.value === 'completed');
  const hasError = computed(() => step.value === 'error');

  // Actions
  async function verifyPhone(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      if (!phoneNumber.value) {
        throw new Error('Phone number is required');
      }

      // Check if phone number already exists in user's accounts
      const existingAccount = userStore.user.accounts.find(
        (account) => account.phoneWb === phoneNumber.value,
      );

      if (existingAccount) {
        error.value = 'Этот номер телефона уже связан с существующим аккаунтом';
        return; // Don't proceed with verification
      }

      const response = await authAPI.verifyPhone(phoneNumber.value);

      if (response.success && response.requiresSMSCode) {
        sessionId.value = response.sessionId; // Store the session ID from response
        step.value = 'sms';
        smsCode.value = ''; // Reset SMS code
      } else {
        throw new Error(response.message || 'Failed to verify phone number');
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to verify phone number';
      error.value = errorMessage;

      // For retryable errors, don't change step
      if (!errorMessage.includes('Неверный номер телефона')) {
        step.value = 'error';
      }
    } finally {
      loading.value = false;
    }
  }

  async function verifySMS(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      if (!smsCode.value || !sessionId.value) {
        throw new Error('SMS code and session are required');
      }

      const response = await authAPI.verifySMS(smsCode.value, sessionId.value);

      if (response.success) {
        if (response.requiresTwoFactor) {
          step.value = 'two_factor';
          twoFactorCode.value = ''; // Reset two-factor code
        } else {
          // Authentication completed
          step.value = 'completed';
          supplierName.value = response.supplierName;
          await handleAuthSuccess();
        }
      } else {
        throw new Error(response.message || 'Failed to verify SMS code');
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to verify SMS code';
      error.value = errorMessage;

      // For retryable errors, clear invalid code and don't change step
      if (errorMessage.includes('Неверный код подтверждения')) {
        smsCode.value = ''; // Clear invalid code
      } else {
        step.value = 'error';
      }
    } finally {
      loading.value = false;
    }
  }

  async function verifyTwoFactor(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      if (!twoFactorCode.value || !sessionId.value) {
        throw new Error('Two-factor code and session are required');
      }

      const response = await authAPI.verifyTwoFactor(
        twoFactorCode.value,
        sessionId.value,
      );

      if (response.success) {
        step.value = 'completed';
        supplierName.value = response.supplierName;
        // Fetch updated user data after successful two-factor verification
        await handleAuthSuccess();
      } else {
        throw new Error(response.message || 'Failed to verify two-factor code');
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to verify two-factor code';
      error.value = errorMessage;

      // For retryable errors, clear invalid code and don't change step
      if (
        errorMessage.includes('Неверный код') ||
        errorMessage.includes('двухфакторной аутентификации')
      ) {
        twoFactorCode.value = ''; // Clear invalid code
      } else {
        step.value = 'error';
      }
    } finally {
      loading.value = false;
    }
  }

  async function cancelAuth(): Promise<void> {
    try {
      if (sessionId.value) {
        await authAPI.cancelAuth(sessionId.value);
      }
    } catch (err) {
      console.error('Failed to cancel auth session:', err);
    } finally {
      resetState();
    }
  }

  async function handleAuthSuccess(): Promise<void> {
    // Refresh user data to get updated supplier info
    await userStore.fetchUser();

    // Reset account supplier modal fields after successful auth
    accountSupplierModalStore.resetAllFields();
    accountSupplierModalStore.initializeSelections();
    // Don't show toast - success message will be shown in modal
    // Reset state after successful auth
    resetState();
  }

  function resetState(): void {
    sessionId.value = null;
    step.value = 'idle';
    loading.value = false;
    error.value = null;
    phoneNumber.value = '';
    smsCode.value = '';
    twoFactorCode.value = '';
    supplierName.value = undefined;
  }

  function setPhoneNumber(phone: string): void {
    phoneNumber.value = phone;
    error.value = null;
  }

  function setSMSCode(code: string): void {
    smsCode.value = code;
    error.value = null;
  }

  function setTwoFactorCode(code: string): void {
    twoFactorCode.value = code;
    error.value = null;
  }

  function clearError(): void {
    error.value = null;
  }

  function startAuth(): void {
    step.value = 'phone';
    error.value = null;
    phoneNumber.value = '';
  }

  return {
    // Individual reactive refs (readonly)
    sessionId: readonly(sessionId),
    step: readonly(step),
    loading: readonly(loading),
    error: readonly(error),
    phoneNumber: readonly(phoneNumber),
    smsCode: readonly(smsCode),
    twoFactorCode: readonly(twoFactorCode),
    supplierName: readonly(supplierName),

    // Computed state object for backward compatibility
    state: readonly(state),

    // Computed
    isIdle,
    needsPhone,
    needsSMS,
    needsTwoFactor,
    isCompleted,
    hasError,

    // Actions
    startAuth,
    verifyPhone,
    verifySMS,
    verifyTwoFactor,
    cancelAuth,
    resetState,
    setPhoneNumber,
    setSMSCode,
    setTwoFactorCode,
    clearError,
  };
});
