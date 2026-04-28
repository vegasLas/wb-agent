import type { InAppNotification } from '@/api/notifications';

export interface NotificationsState {
  notifications: InAppNotification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
}
