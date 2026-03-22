import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { ViewType } from '../types';

export const useViewStore = defineStore('view', () => {
  const currentView = ref<ViewType>('autobookings-main');
  const prevView = ref<ViewType | null>(null);
  const isPrevView = computed(() => prevView.value !== null);

  function setView(view: ViewType) {
    // Don't update prevView if we're going to the same view
    if (view !== currentView.value) {
      prevView.value = currentView.value;
      currentView.value = view;
    }
  }

  function goBack() {
    if (prevView.value) {
      const targetView = prevView.value;
      prevView.value = null; // Clear previous view after going back
      currentView.value = targetView;
    }
  }

  function clearPrevView() {
    prevView.value = null;
  }

  const isForm = computed(() => currentView.value.endsWith('-form'));

  const mainView = computed(() => currentView.value.split('-')[0] as 'triggers' | 'autobookings' | 'reschedules' | 'store' | 'account' | 'report');

  return {
    setView,
    goBack,
    clearPrevView,
    currentView,
    isForm,
    mainView,
    isPrevView,
  };
});
