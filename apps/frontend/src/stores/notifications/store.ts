import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { notificationsAPI } from '@/api/notifications';
import { toastHelpers } from '@/utils/ui';
import type { InAppNotification } from '@/api/notifications';

export const useNotificationsStore = defineStore('notifications', () => {
  // State
  const notifications = ref<InAppNotification[]>([]);
  const unreadCount = ref(0);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

  // Getters
  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.readAt),
  );

  const hasUnread = computed(() => unreadCount.value > 0);

  // Actions
  async function fetchNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await notificationsAPI.fetchNotifications(params);
      notifications.value = response.data;
      total.value = response.meta.total;
      isFetched.value = true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch notifications';
      error.value = errorMsg;
      toastHelpers.error('Ошибка загрузки уведомлений', errorMsg);
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount(): Promise<void> {
    try {
      const response = await notificationsAPI.fetchUnreadCount();
      unreadCount.value = response.data.count;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch unread count';
      console.error('[NotificationsStore] fetchUnreadCount error:', errorMsg);
    }
  }

  async function markRead(id: string): Promise<void> {
    const notification = notifications.value.find((n) => n.id === id);
    const previousReadAt = notification?.readAt;

    // Optimistic update
    if (notification) {
      notification.readAt = new Date().toISOString();
    }
    if (unreadCount.value > 0) {
      unreadCount.value -= 1;
    }

    try {
      await notificationsAPI.markRead(id);
    } catch (err: unknown) {
      // Rollback on failure
      if (notification) {
        notification.readAt = previousReadAt ?? undefined;
      }
      if (previousReadAt === null || previousReadAt === undefined) {
        unreadCount.value += 1;
      }
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to mark notification as read';
      toastHelpers.error('Ошибка', errorMsg);
    }
  }

  async function markAllRead(): Promise<void> {
    const previousNotifications = notifications.value.map((n) => ({
      id: n.id,
      readAt: n.readAt,
    }));
    const previousUnreadCount = unreadCount.value;

    // Optimistic update
    notifications.value.forEach((n) => {
      n.readAt = new Date().toISOString();
    });
    unreadCount.value = 0;

    try {
      await notificationsAPI.markAllRead();
    } catch (err: unknown) {
      // Rollback on failure
      notifications.value.forEach((n) => {
        const prev = previousNotifications.find((p) => p.id === n.id);
        if (prev) {
          n.readAt = prev.readAt ?? undefined;
        }
      });
      unreadCount.value = previousUnreadCount;
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to mark all as read';
      toastHelpers.error('Ошибка', errorMsg);
    }
  }

  async function deleteNotification(id: string): Promise<void> {
    const previousNotifications = [...notifications.value];
    const previousTotal = total.value;
    const previousUnreadCount = unreadCount.value;
    const wasUnread = notifications.value.find((n) => n.id === id)?.readAt == null;

    // Optimistic update
    notifications.value = notifications.value.filter((n) => n.id !== id);
    if (total.value > 0) {
      total.value -= 1;
    }
    if (wasUnread && unreadCount.value > 0) {
      unreadCount.value -= 1;
    }

    try {
      await notificationsAPI.deleteNotification(id);
    } catch (err: unknown) {
      // Rollback on failure
      notifications.value = previousNotifications;
      total.value = previousTotal;
      unreadCount.value = previousUnreadCount;
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to delete notification';
      toastHelpers.error('Ошибка удаления', errorMsg);
    }
  }

  function $reset(): void {
    notifications.value = [];
    unreadCount.value = 0;
    total.value = 0;
    loading.value = false;
    error.value = null;
    isFetched.value = false;
  }

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    isFetched,
    unreadNotifications,
    hasUnread,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    $reset,
  };
});
