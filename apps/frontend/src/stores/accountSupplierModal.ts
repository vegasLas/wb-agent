import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './user';
import { useAccountsStore } from './accounts';
import { userAPI } from '../api';

export const useAccountSupplierModalStore = defineStore(
  'accountSupplierModal',
  () => {
    const userStore = useUserStore();
    const accountsStore = useAccountsStore();

    // Modal states
    const showModal = ref(false);
    const showAuthModal = ref(false);
    const showTermsModal = ref(false);
    const saving = ref(false);
    const refreshingSuppliers = ref(false);

    // Temporary selection state (for preview before saving)
    const tempSelectedAccountId = ref<string | null>(null);
    const tempSelectedSupplierId = ref<string | null>(null);

    // Computed properties
    const hasAccounts = computed(() => userStore.user.accounts.length > 0);
    const selectedAccount = computed(() => userStore.selectedAccount);
    const selectedSupplier = computed(() => userStore.activeSupplier);

    const tempSelectedAccount = computed(() =>
      tempSelectedAccountId.value
        ? userStore.user.accounts.find(
            (acc) => acc.id === tempSelectedAccountId.value,
          )
        : null,
    );

    const canSave = computed(() => {
      return (
        tempSelectedAccountId.value &&
        tempSelectedSupplierId.value &&
        (tempSelectedAccountId.value !== userStore.user.selectedAccountId ||
          tempSelectedSupplierId.value !==
            selectedAccount.value?.selectedSupplierId)
      );
    });

    // Functions
    async function selectTempAccount(accountId: string) {
      tempSelectedAccountId.value = accountId;
      // Reset supplier selection when account changes
      tempSelectedSupplierId.value = null;

      // Check if account needs supplier refresh
      const account = userStore.user.accounts.find(
        (acc) => acc.id === accountId,
      );
      if (
        account &&
        (account.suppliers.length === 0 ||
          account.suppliers.some(
            (s) => !s.supplierName || s.supplierName.trim() === '',
          ))
      ) {
        await refreshSuppliers();
      } else if (account && account.suppliers.length > 0) {
        // Auto-select first supplier if available and no refresh needed
        tempSelectedSupplierId.value =
          account.selectedSupplierId || account.suppliers[0].supplierId;
      }
    }

    function selectTempSupplier(supplierId: string) {
      tempSelectedSupplierId.value = supplierId;
    }

    async function refreshSuppliers() {
      if (!tempSelectedAccountId.value) return;

      refreshingSuppliers.value = true;
      try {
        await accountsStore.refreshAccountSuppliers(
          tempSelectedAccountId.value,
        );

        // Re-select first supplier if current selection is no longer valid
        const account = userStore.user.accounts.find(
          (acc) => acc.id === tempSelectedAccountId.value,
        );
        if (account && account.suppliers.length > 0) {
          const currentSupplierExists = account.suppliers.some(
            (s) => s.supplierId === tempSelectedSupplierId.value,
          );
          if (!currentSupplierExists) {
            tempSelectedSupplierId.value =
              account.selectedSupplierId || account.suppliers[0].supplierId;
          }
        }
      } catch (error) {
        console.error('Error refreshing suppliers:', error);
      } finally {
        refreshingSuppliers.value = false;
      }
    }

    async function saveSelection() {
      if (!tempSelectedAccountId.value || !tempSelectedSupplierId.value) return;

      saving.value = true;
      try {
        // Update selected account if changed
        if (tempSelectedAccountId.value !== userStore.user.selectedAccountId) {
          await userAPI.updateSelectedAccount(tempSelectedAccountId.value);
          userStore.user.selectedAccountId = tempSelectedAccountId.value;
        }

        // Update supplier for the account if changed
        if (
          tempSelectedSupplierId.value !==
          selectedAccount.value?.selectedSupplierId
        ) {
          await accountsStore.selectSupplierForAccount(
            tempSelectedAccountId.value,
            tempSelectedSupplierId.value,
          );
        }

        return true;
      } catch (error) {
        console.error('Error saving selection:', error);
        return false;
      } finally {
        saving.value = false;
      }
    }

    function startAuth() {
      if (!userStore.user?.agreeTerms) {
        showTermsModal.value = true;
        return;
      }
      showAuthModal.value = true;
    }

    function initializeSelections() {
      tempSelectedAccountId.value = userStore.user.selectedAccountId || null;
      tempSelectedSupplierId.value =
        selectedAccount.value?.selectedSupplierId || null;
    }

    function resetAllFields() {
      // Reset modal states
      showAuthModal.value = false;
      showTermsModal.value = false;
      saving.value = false;
      refreshingSuppliers.value = false;

      // Reset temporary selections
      tempSelectedAccountId.value = null;
      tempSelectedSupplierId.value = null;
    }

    async function removeAccount(accountId: string) {
      try {
        // Show confirmation dialog
        const confirmed = confirm(
          'Вы уверены, что хотите удалить этот аккаунт ?',
        );

        if (!confirmed) return;

        // Remove account via API
        await accountsStore.deleteAccount(accountId);

        // If removed account was selected, clear selection
        if (tempSelectedAccountId.value === accountId) {
          tempSelectedAccountId.value = null;
          tempSelectedSupplierId.value = null;
        }

        // Refresh user data
        await userStore.fetchUser();
      } catch (error) {
        console.error('Error removing account:', error);
      }
    }

    return {
      // State
      showModal,
      showAuthModal,
      showTermsModal,
      saving,
      refreshingSuppliers,
      tempSelectedAccountId,
      tempSelectedSupplierId,

      // Computed
      hasAccounts,
      selectedAccount,
      selectedSupplier,
      tempSelectedAccount,
      canSave,

      // Methods
      selectTempAccount,
      selectTempSupplier,
      refreshSuppliers,
      saveSelection,
      startAuth,
      initializeSelections,
      resetAllFields,
      removeAccount,
    };
  },
);
