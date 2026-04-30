import { useConfirm } from 'primevue/useconfirm';

// Global confirm reference (set by ConfirmDialog)
let confirmRef: ReturnType<typeof useConfirm> | null = null;

/**
 * Set the global confirm instance (called from App.vue)
 */
export function setConfirmInstance(instance: ReturnType<typeof useConfirm>) {
  confirmRef = instance;
}

/**
 * Get the confirm instance
 */
export function getConfirm() {
  return confirmRef;
}

/**
 * Show confirmation dialog that returns a Promise
 * Shows a PrimeVue confirmation dialog or falls back to native confirm
 */
export function confirmPromise(options: {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
}): Promise<boolean> {
  const confirm = getConfirm();
  
  if (confirm) {
    // Use PrimeVue ConfirmDialog
    return new Promise((resolve) => {
      confirm.require({
        header: options.header,
        message: options.message,
        acceptLabel: options.acceptLabel || 'Да',
        rejectLabel: options.rejectLabel || 'Нет',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
  
  // Fallback to native confirm
  return Promise.resolve(window.confirm(`${options.header}\n\n${options.message}`));
}

/**
 * Show confirmation dialog with callbacks
 * For use in components where you don't need a Promise
 */
export function showConfirm(options: {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  accept?: () => void;
  reject?: () => void;
}): void {
  const confirm = getConfirm();
  
  if (confirm) {
    confirm.require({
      header: options.header,
      message: options.message,
      acceptLabel: options.acceptLabel || 'Да',
      rejectLabel: options.rejectLabel || 'Нет',
      accept: options.accept,
      reject: options.reject,
    });
  } else {
    // Fallback to native confirm
    const confirmed = window.confirm(`${options.header}\n\n${options.message}`);
    if (confirmed && options.accept) {
      options.accept();
    } else if (!confirmed && options.reject) {
      options.reject();
    }
  }
}
