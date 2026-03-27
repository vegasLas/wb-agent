import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './user';
import { accountsAPI } from '../api';
import type { Account, Supplier } from './user';

export const useAccountsStore = defineStore('accounts', () => {
  const userStore = useUserStore();

  // Computed getters that use userStore.user.accounts instead of local state
  const accounts = computed(() => userStore.user.accounts || []);
  const selectedAccountId = computed(() => userStore.user.selectedAccountId);

  const selectedAccount = computed(() =>
    accounts.value.find((acc) => acc.id === selectedAccountId.value),
  );

  const allSuppliers = computed(() =>
    accounts.value.flatMap((acc) =>
      acc.suppliers.map((sup) => ({
        ...sup,
        accountId: acc.id,
        accountPhone: acc.phoneWb,
      })),
    ),
  );

  const selectedAccountSuppliers = computed(
    () =>
      accounts.value.find((acc) => acc.id === selectedAccountId.value)
        ?.suppliers || [],
  );

  const accountsWithSuppliers = computed(() =>
    accounts.value.filter((acc) => acc.suppliers.length > 0),
  );

  const totalSuppliers = computed(() =>
    accounts.value.reduce((total, acc) => total + acc.suppliers.length, 0),
  );

  const activeSuppliers = computed(
    () => accounts.value.filter((acc) => acc.selectedSupplierId).length,
  );

  // Actions
  async function selectSupplierForAccount(
    accountId: string,
    supplierId: string,
  ) {
    try {
      // Update backend
      await accountsAPI.updateAccountSupplier(accountId, supplierId);

      // Update local state in userStore
      const account = userStore.user.accounts.find(
        (acc) => acc.id === accountId,
      );
      if (account) {
        account.selectedSupplierId = supplierId;
      }

      // Refresh user data to ensure sync
      await userStore.fetchUser();
    } catch (error) {
      console.error('Error selecting supplier:', error);
      throw error;
    }
  }

  async function refreshAccountSuppliers(accountId: string) {
    try {
      const result = await accountsAPI.refreshAccountSuppliers(accountId);

      if (result.success) {
        // Refresh user data to get updated suppliers from server
        await userStore.fetchUser();

        return result.suppliers;
      }
    } catch (error) {
      console.error('Error refreshing suppliers:', error);
      throw error;
    }
  }

  async function deleteAccount(accountId: string) {
    try {
      await accountsAPI.deleteAccount(accountId);

      // Refresh user data to get updated accounts list
      await userStore.fetchUser();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  function getSuppliersByAccount(accountId: string): Supplier[] {
    return accounts.value.find((acc) => acc.id === accountId)?.suppliers || [];
  }

  function findAccountBySupplierId(supplierId: string): Account | undefined {
    return accounts.value.find((acc) =>
      acc.suppliers.some((sup) => sup.supplierId === supplierId),
    );
  }

  function getAccountSupplier(
    accountId: string,
    supplierId: string,
  ): Supplier | undefined {
    const account = accounts.value.find((acc) => acc.id === accountId);
    return account?.suppliers.find((sup) => sup.supplierId === supplierId);
  }

  // Check if account has any cookies
  function hasAccountCookies(accountId: string): boolean {
    const account = accounts.value.find((acc) => acc.id === accountId);
    return Boolean(account?.wbCookies);
  }

  // Get current active supplier for account
  function getActiveSupplier(accountId: string): Supplier | undefined {
    const account = accounts.value.find((acc) => acc.id === accountId);
    if (account?.selectedSupplierId) {
      return account.suppliers.find(
        (sup) => sup.supplierId === account.selectedSupplierId,
      );
    }
    return undefined;
  }

  return {
    // Computed getters
    accounts,
    selectedAccountId,
    selectedAccount,
    allSuppliers,
    selectedAccountSuppliers,
    accountsWithSuppliers,
    totalSuppliers,
    activeSuppliers,

    // Actions
    selectSupplierForAccount,
    refreshAccountSuppliers,
    deleteAccount,
    getSuppliersByAccount,
    findAccountBySupplierId,
    getAccountSupplier,
    hasAccountCookies,
    getActiveSupplier,
  };
});
