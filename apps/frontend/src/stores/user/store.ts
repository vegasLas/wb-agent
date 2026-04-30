import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { userAPI } from '@/api';
import type { User } from './types';
import { confirmPromise } from '@/utils/ui';

export const useUserStore = defineStore('user', () => {
  const user = ref<User>({
    name: '',
    subscriptionTier: 'FREE',
    subscriptionExpiresAt: null,
    payments: [],
    agreeTerms: false,
    supplierApiKey: undefined,
    selectedAccountId: undefined,
    accounts: [],
  });
  const isFetched = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notFound = ref(false);

  // Computed properties for subscription status
  const subscriptionActive = computed(() => {
    if (!user.value.subscriptionExpiresAt) return false;
    return new Date(user.value.subscriptionExpiresAt) > new Date();
  });

  // Check if user is authenticated (has valid user data)
  const isAuthenticated = computed(() => {
    return isFetched.value && !notFound.value && user.value.id !== undefined;
  });

  // Reset user state (for logout)
  function reset() {
    user.value = {
      name: '',
      subscriptionTier: 'FREE',
      subscriptionExpiresAt: null,
      payments: [],
      agreeTerms: false,
      supplierApiKey: undefined,
      selectedAccountId: undefined,
      accounts: [],
    };
    isFetched.value = false;
    error.value = null;
    notFound.value = false;
  }

  // Subscription tier computed properties
  const subscriptionTier = computed(() => user.value.subscriptionTier ?? 'FREE');
  const isFree = computed(() => subscriptionTier.value === 'FREE');
  const isPro = computed(() => subscriptionTier.value === 'PRO' || subscriptionTier.value === 'MAX');
  const isMax = computed(() => subscriptionTier.value === 'MAX');
  const isOnTrial = computed(() => !!user.value.isTrial);
  const trialRemainingDays = computed(() => {
    if (!user.value.trialExpiresAt) return 0;
    const expirationDate = new Date(user.value.trialExpiresAt);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  });
  const maxAccounts = computed(() => user.value.maxAccounts ?? 1);
  const canAddAccount = computed(() => (user.value.accounts?.length ?? 0) < maxAccounts.value);

  const subscriptionRemainingDays = computed(() => {
    if (!user.value.subscriptionExpiresAt) return 0;
    const expirationDate = new Date(user.value.subscriptionExpiresAt);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  });

  // Computed to get selected account
  const selectedAccount = computed(() => {
    if (!user.value.selectedAccountId) return null;
    return (
      user.value.accounts.find(
        (account) => account.id === user.value.selectedAccountId,
      ) || null
    );
  });

  // Computed to check if selected account has suppliers
  const hasValidSupplier = computed(() => {
    if (!selectedAccount.value) return false;
    return (
      selectedAccount.value.selectedSupplierId &&
      selectedAccount.value.suppliers.some(
        (s) => s.supplierId === selectedAccount.value?.selectedSupplierId,
      )
    );
  });

  // Computed to get the active supplier from selected account
  const activeSupplier = computed(() => {
    if (!selectedAccount.value?.selectedSupplierId) return null;
    return (
      selectedAccount.value.suppliers.find(
        (s) => s.supplierId === selectedAccount.value?.selectedSupplierId,
      ) || null
    );
  });

  // Computed to get all suppliers from all accounts
  const allSuppliers = computed(() => {
    const suppliers: Array<{
      supplierId: string;
      supplierName: string;
      accountId: string;
    }> = [];
    user.value.accounts.forEach((account) => {
      account.suppliers.forEach((supplier) => {
        suppliers.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          accountId: account.id,
        });
      });
    });
    return suppliers;
  });

  // Method to get supplier info by ID from all accounts
  function getSupplierById(supplierId: string) {
    return (
      allSuppliers.value.find(
        (supplier) => supplier.supplierId === supplierId,
      ) || null
    );
  }

  // Method to get accountId by supplierId
  function getAccountIdBySupplierId(supplierId: string): string | null {
    const supplier = getSupplierById(supplierId);
    return supplier?.accountId || null;
  }

  async function fetchUser(): Promise<User | null> {
    loading.value = true;
    notFound.value = false;
    try {
      const data = await userAPI.fetchUser();
      user.value = data as User;
      console.log('[USER STORE DEBUG] fetched user:', {
        subscriptionTier: user.value.subscriptionTier,
        trialUsedAt: user.value.trialUsedAt,
        isTrial: user.value.isTrial,
        isFree: isFree.value,
      });
      return data as User;
    } catch (err) {
      error.value = 'Failed to fetch user data';
      notFound.value = true;
      throw err;
    } finally {
      isFetched.value = true;
      loading.value = false;
    }
  }

  async function logout() {
    const confirmed = await confirmPromise({
      header: 'Выход из аккаунта',
      message: 'Ваши автобронирования не будут активны, чтобы увидеть их снова, вам нужно будет авторизоваться в тот же аккаунт WB с которого вы создавали автобронирования. \n Вы уверены, что хотите выйти из всех аккаунтов WB ?',
    });

    if (confirmed) {
      try {
        await userAPI.logout();
        // Clear all accounts and reset selected account
        user.value.accounts = [];
        user.value.selectedAccountId = undefined;
        return true;
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    return false;
  }

  async function agreeToTerms() {
    try {
      const response = await userAPI.agreeToTerms();
      if (response.success) {
        user.value.agreeTerms = true;
      }
      return response;
    } catch (error) {
      console.error('Failed to agree to terms:', error);
      throw error;
    }
  }

  return {
    user,
    loading,
    error,
    notFound,
    subscriptionActive,
    subscriptionRemainingDays,
    subscriptionTier,
    isFree,
    isPro,
    isMax,
    isOnTrial,
    trialRemainingDays,
    maxAccounts,
    canAddAccount,
    selectedAccount,
    hasValidSupplier,
    activeSupplier,
    allSuppliers,
    isFetched,
    isAuthenticated,

    fetchUser,
    getSupplierById,
    getAccountIdBySupplierId,
    reset,
    logout,
    agreeToTerms,
  };
});
