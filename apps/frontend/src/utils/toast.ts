import { useToast } from 'primevue/usetoast';
import type { ToastServiceMethods } from 'primevue/toastservice';

let toastInstance: ToastServiceMethods | null = null;

export function initToast(toast: ToastServiceMethods) {
  toastInstance = toast;
}

export function useAppToast(): ToastServiceMethods {
  // Try to get toast from component context first
  try {
    return useToast();
  } catch {
    // Fallback to stored instance if available
    if (toastInstance) {
      return toastInstance;
    }
    // Return a no-op toast if not available
    return {
      add: () => {},
      remove: () => {},
      removeGroup: () => {},
      removeAllGroups: () => {},
    };
  }
}

// Helper functions for direct use
export const toastHelpers = {
  success: (summary: string, detail?: string) => {
    if (toastInstance) {
      toastInstance.add({ severity: 'success', summary, detail, life: 3000 });
    }
  },
  error: (summary: string, detail?: string) => {
    if (toastInstance) {
      toastInstance.add({ severity: 'error', summary, detail, life: 5000 });
    }
  },
  info: (summary: string, detail?: string) => {
    if (toastInstance) {
      toastInstance.add({ severity: 'info', summary, detail, life: 3000 });
    }
  },
  warn: (summary: string, detail?: string) => {
    if (toastInstance) {
      toastInstance.add({ severity: 'warn', summary, detail, life: 3000 });
    }
  },
};
