<template>
  <OverlayBadge
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

  <Popover ref="dropdownRef">
    <NotificationDropdown />
  </Popover>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import OverlayBadge from 'primevue/overlaybadge';
import Popover from 'primevue/popover';
import { useNotificationsStore } from '@/stores/notifications';
import NotificationDropdown from './NotificationDropdown.vue';

const notificationsStore = useNotificationsStore();
const dropdownRef = ref<InstanceType<typeof Popover> | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

function toggleDropdown(event: MouseEvent) {
  dropdownRef.value?.toggle(event);
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
