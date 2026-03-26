import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { supplierAPI } from '../api';
import type { ApiKeyStatus } from '../types';

export const useSupplierApiKeyStore = defineStore('supplierApiKey', () => {
  // State
  const status = ref<ApiKeyStatus | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const saving = ref(false);

  // Getters
  const isValid = computed(() => status.value?.valid || false);

  const statusMessage = computed(() => status.value?.message || '');

  // Actions
  async function checkStatus() {
    try {
      loading.value = true;
      error.value = null;
      const data = await supplierAPI.checkApiKeyStatus();
      status.value = data;
      isFetched.value = true;
      return data;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check API key status';
      error.value = errorMsg;
      status.value = { valid: false, message: 'Failed to check status' };
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateApiKey(apiKey: string) {
    try {
      saving.value = true;
      error.value = null;
      await supplierAPI.updateSupplierApiKey(apiKey);
      // Re-check status after update
      await checkStatus();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update API key';
      error.value = errorMsg;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function deleteApiKey() {
    try {
      loading.value = true;
      error.value = null;
      await supplierAPI.deleteSupplierApiKey();
      // Clear status after delete
      status.value = null;
      isFetched.value = false;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete API key';
      error.value = errorMsg;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearStatus() {
    status.value = null;
    isFetched.value = false;
    error.value = null;
  }

  return {
    // State
    status: readonly(status),
    loading: readonly(loading),
    error: readonly(error),
    isFetched: readonly(isFetched),
    saving: readonly(saving),

    // Getters
    isValid,
    statusMessage,

    // Actions
    checkStatus,
    updateApiKey,
    deleteApiKey,
    clearStatus,
  };
});
