<template>
  <div class="w-full sm:w-[360px] sm:max-w-[90vw] flex flex-col">
    <!-- Header -->
    <div
      v-if="!isMobile"
      class="flex items-center justify-between px-4 py-3"
    >
      <h3 class="text-sm font-semibold text-theme">
        Уведомления
      </h3>
      <div class="flex items-center gap-2">
        <Button
          v-if="notificationsStore.hasUnread"
          label="Прочитать все"
          severity="primary"
          text
          size="small"
          class="text-xs"
          @click="handleMarkAllRead"
        />
        <span class="text-xs text-muted">
          {{ notificationsStore.unreadCount }} новых
        </span>
      </div>
    </div>

    <!-- Mobile header is rendered by Drawer, show only actions here -->
    <div
      v-else
      class="flex items-center justify-end px-4 py-2"
    >
      <Button
        v-if="notificationsStore.hasUnread"
        label="Прочитать все"
        severity="primary"
        text
        size="small"
        class="text-xs"
        @click="handleMarkAllRead"
      />
      <span class="text-xs text-muted ml-2">
        {{ notificationsStore.unreadCount }} новых
      </span>
    </div>

    <Divider class="!m-0" />

    <!-- Content -->
    <div class="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
      <div
        v-if="notificationsStore.loading && !notificationsStore.isFetched"
        class="py-8 flex justify-center"
      >
        <Skeleton
          width="8rem"
          height="1.5rem"
        />
      </div>

      <div
        v-else-if="notificationsStore.notifications.length === 0"
        class="py-10 flex flex-col items-center gap-3 text-center px-4"
      >
        <Avatar
          icon="pi pi-bell"
          shape="circle"
          class="bg-elevated text-muted"
        />
        <p class="text-sm text-secondary">
          Нет уведомлений
        </p>
      </div>

      <div
        v-else
        class="divide-y divide-deep-border/50"
      >
        <NotificationItem
          v-for="notification in notificationsStore.notifications"
          :key="notification.id"
          :notification="notification"
          @mark-read="handleMarkRead"
          @navigate="handleNavigate"
        />
      </div>
    </div>

    <!-- Footer -->
    <template v-if="notificationsStore.notifications.length > 0">
      <Divider class="!m-0" />
      <div class="px-4 py-2.5 flex justify-center">
        <Button
          label="Показать все"
          severity="secondary"
          text
          size="small"
          class="text-xs"
          @click="handleViewAll"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMediaQuery } from '@vueuse/core';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Skeleton from 'primevue/skeleton';
import Avatar from 'primevue/avatar';
import { useNotificationsStore } from '@/stores/notifications';
import NotificationItem from './NotificationItem.vue';

const notificationsStore = useNotificationsStore();
const router = useRouter();
const isMobile = useMediaQuery('(max-width: 1023px)');

onMounted(() => {
  notificationsStore.fetchNotifications({ limit: 20 });
});

async function handleMarkRead(id: string) {
  await notificationsStore.markRead(id);
}

async function handleMarkAllRead() {
  await notificationsStore.markAllRead();
}

function handleNavigate(link: string | null | undefined) {
  if (link) {
    router.push(link);
  }
}

function handleViewAll() {
  // TODO: Navigate to a dedicated notifications page if implemented
  notificationsStore.fetchNotifications({ limit: 50 });
}
</script>
