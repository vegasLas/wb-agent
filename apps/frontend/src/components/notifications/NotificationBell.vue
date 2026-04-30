<template>
  <OverlayBadge
    v-if="notificationsStore.unreadCount > 0"
    :value="notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount"
    severity="danger"
    size="small"
  >
    <Button
      icon="pi pi-bell"
      severity="secondary"
      text
      rounded
      aria-label="Уведомления"
      class="w-9 h-9"
      @click="toggleDropdown"
    />
  </OverlayBadge>
  <Button
    v-else
    icon="pi pi-bell"
    severity="secondary"
    text
    rounded
    aria-label="Уведомления"
    class="w-9 h-9"
    @click="toggleDropdown"
  />

  <!-- Desktop: Popover -->
  <Popover
    v-if="!isMobile"
    ref="dropdownRef"
  >
    <NotificationDropdown />
  </Popover>

  <!-- Mobile: Drawer -->
  <Drawer
    v-else
    v-model:visible="drawerVisible"
    position="right"
    :block-scroll="true"
    :show-close-icon="false"
    :pt="{
      root: { class: 'w-full max-w-[380px]' },
      content: { class: 'p-0' },
    }"
  >
    <template #header>
      <div class="flex items-center justify-between px-4 py-3 border-b border-deep-border">
        <h3 class="text-sm font-semibold text-theme">
          Уведомления
        </h3>
        <button
          class="flex items-center justify-center w-9 h-9 rounded-xl text-secondary hover:text-theme hover:bg-elevated transition-colors"
          @click="drawerVisible = false"
        >
          <i class="pi pi-times text-lg" />
        </button>
      </div>
    </template>
    <NotificationDropdown />
  </Drawer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import Button from 'primevue/button';
import OverlayBadge from 'primevue/overlaybadge';
import Popover from 'primevue/popover';
import Drawer from 'primevue/drawer';
import { useNotificationsStore } from '@/stores/notifications';
import NotificationDropdown from './NotificationDropdown.vue';

const notificationsStore = useNotificationsStore();
const dropdownRef = ref<InstanceType<typeof Popover> | null>(null);
const drawerVisible = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Mobile breakpoint matches Tailwind's lg breakpoint (1024px)
const isMobile = useMediaQuery('(max-width: 1023px)');

function toggleDropdown(event: MouseEvent) {
  if (isMobile.value) {
    drawerVisible.value = !drawerVisible.value;
  } else {
    dropdownRef.value?.toggle(event);
  }
}

onMounted(() => {
  // Fetch unread count on mount
  notificationsStore.fetchUnreadCount();

  // Poll every 30 seconds
  pollInterval = setInterval(() => {
    notificationsStore.fetchUnreadCount();
  }, 30000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>
