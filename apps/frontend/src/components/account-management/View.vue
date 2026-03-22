<template>
  <!-- Main Account & Supplier Selection Modal -->
  <BaseModal
    v-model="isOpen"
    title="Управление аккаунтами"
    size="2xl"
    @close="closeModal"
  >
    <div class="space-y-6">
      <!-- Show Terms Modal Content -->
      <div v-if="showTermsModal">
        <TermsContent @agreed="showTermsModal = false" @cancel="closeModal" />
      </div>

      <!-- Show Auth Modal Content -->
      <div v-else-if="showAuthModal">
        <AuthCard @cancel="showAuthModal = false" />
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Current Selection Summary -->
        <CurrentSelectionSummary
          :selected-account="selectedAccount"
          :selected-supplier="selectedSupplier"
        />

        <!-- Account Selection -->
        <AccountSelection
          class="mb-4"
          :accounts="userStore.user.accounts"
          :has-accounts="hasAccounts"
          :temp-selected-account-id="tempSelectedAccountId"
          @select-account="selectTempAccount"
          @add-account="startAuth"
          @remove-account="removeAccount"
        />

        <!-- Supplier Selection -->
        <SupplierSelection
          :temp-selected-account="tempSelectedAccount || null"
          :temp-selected-supplier-id="tempSelectedSupplierId"
          :refreshing-suppliers="refreshingSuppliers"
          @select-supplier="selectTempSupplier"
          @refresh="refreshSuppliers"
        />
      </div>
    </div>

    <!-- Main Footer -->
    <template v-if="!showTermsModal && !showAuthModal" #footer>
      <div class="flex justify-between">
        <BaseButton variant="ghost" @click="closeModal"> Отмена </BaseButton>
        <BaseButton
          :disabled="!canSave"
          :loading="saving"
          color="primary"
          size="lg"
          class="px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          @click="saveSelection"
        >
          Сохранить выбор
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { BaseButton, BaseModal } from '../ui';
import TermsContent from './TermsContent.vue';
import AuthCard from './AuthCard.vue';
import CurrentSelectionSummary from './CurrentSelectionSummary.vue';
import AccountSelection from './AccountSelection.vue';
import SupplierSelection from './SupplierSelection.vue';
import { useUserStore } from '../../stores/user';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';

// Props
interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Use store for all modal logic
const userStore = useUserStore();
const accountSupplierModalStore = useAccountSupplierModalStore();

// Destructure store reactive state and computed
const {
  // State
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
} = storeToRefs(accountSupplierModalStore);

// Get methods directly from store
const {
  selectTempAccount,
  selectTempSupplier,
  refreshSuppliers,
  saveSelection,
  startAuth,
  initializeSelections,
  removeAccount,
} = accountSupplierModalStore;

// Modal state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Initialize temp selections when modal opens, reset when closed
watch(isOpen, async (newValue) => {
  if (newValue) {
    initializeSelections();
    // await checkAndRefreshSuppliers()
  } else {
    // Reset all fields when modal is closed
    accountSupplierModalStore.resetAllFields();
  }
});

function closeModal() {
  isOpen.value = false;
}
</script>
