import { ref } from 'vue';
import { defineStore } from 'pinia';

export type SettingsTab = 'general' | 'profile' | 'data' | 'about';

export const useSettingsStore = defineStore('settings', () => {
  const showSettingsDialog = ref(false);
  const activeTab = ref<SettingsTab>('general');

  function openSettings(tab: SettingsTab = 'general') {
    activeTab.value = tab;
    showSettingsDialog.value = true;
  }

  return {
    showSettingsDialog,
    activeTab,
    openSettings,
  };
});
