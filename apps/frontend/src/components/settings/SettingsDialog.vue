<template>
  <Dialog
    v-model:visible="isOpen"
    header="Настройки"
    :style="{ maxWidth: '800px', width: '100%' }"
    :modal="true"
    :closable="true"
    @hide="close"
  >
    <div class="flex gap-6 min-h-[400px]">
      <!-- Left Sidebar Tabs -->
      <div class="w-[180px] shrink-0 space-y-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left"
          :class="[
            activeTab === tab.key
              ? 'bg-purple-500/10 text-theme'
              : 'text-secondary hover:text-theme hover:bg-elevated',
          ]"
          @click="activeTab = tab.key"
        >
          <i :class="[tab.icon, 'text-base']" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Right Content Area -->
      <div class="flex-1 min-w-0">
        <div class="max-h-[60vh] overflow-y-auto pr-2">
          <GeneralTab v-if="activeTab === 'general'" />
          <ProfileTab v-else-if="activeTab === 'profile'" />
          <DataTab v-else-if="activeTab === 'data'" />
          <AboutTab v-else-if="activeTab === 'about'" />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import { useSettingsStore } from '@/stores/ui';
import GeneralTab from './GeneralTab.vue';
import ProfileTab from './ProfileTab.vue';
import DataTab from './DataTab.vue';
import AboutTab from './AboutTab.vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const settingsStore = useSettingsStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const activeTab = computed({
  get: () => settingsStore.activeTab,
  set: (val) => {
    settingsStore.activeTab = val;
  },
});

const tabs = [
  { key: 'general' as const, label: 'Основные', icon: 'pi pi-cog' },
  { key: 'profile' as const, label: 'Профиль', icon: 'pi pi-user' },
  { key: 'data' as const, label: 'Данные', icon: 'pi pi-database' },
  { key: 'about' as const, label: 'О приложении', icon: 'pi pi-info-circle' },
];

function close() {
  isOpen.value = false;
}
</script>
