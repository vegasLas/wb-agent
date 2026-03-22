import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';

export interface User {
  name: string;
  autobookingCount: number;
  subscriptionExpiresAt: string | null;
  payments: Payment[];
  agreeTerms: boolean;
  supplierApiKey?: string;
  selectedAccountId?: string;
  accounts: Account[];
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface Account {
  id: string;
  phoneWb: string;
  suppliers: Supplier[];
  selectedSupplierId?: string;
  wbCookies?: boolean;
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User>({
    name: '',
    autobookingCount: 0,
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
      const response = await api.get('/user/me');

      if (!response.data) {
        throw new Error('Failed to fetch user data');
      }

      user.value = response.data;
      return response.data;
    } catch (err) {
      error.value = 'Failed to fetch user data';
      notFound.value = true;
      throw err;
    } finally {
      isFetched.value = true;
      loading.value = false;
    }
  }

  function decreaseAutobookingCount() {
    user.value.autobookingCount--;
  }

  function increaseAutobookingCount() {
    user.value.autobookingCount++;
  }

  async function logout() {
    // Note: doAction would need to be imported from a utility
    // For now, simplified version
    const confirmed = confirm(
      'Ваши автобронирования не будут активны, чтобы увидеть их снова, вам нужно будет авторизоваться в тот же аккаунт WB с которого вы создавали автобронирования. \n Вы уверены, что хотите выйти из всех аккаунтов WB ?',
    );

    if (confirmed) {
      try {
        await api.post('/auth/logout');
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
      const response = await api.post('/user/agree-terms');
      if (response.data.success) {
        user.value.agreeTerms = true;
      }
      return response.data;
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
    selectedAccount,
    hasValidSupplier,
    activeSupplier,
    allSuppliers,
    isFetched,

    fetchUser,
    decreaseAutobookingCount,
    increaseAutobookingCount,
    getSupplierById,
    getAccountIdBySupplierId,

    logout,
    agreeToTerms,
  };
});
