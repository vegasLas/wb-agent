import apiClient from '../client';
import type {
  ListNotificationsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  MarkAllReadResponse,
} from './types';

export const notificationsAPI = {
  async fetchNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<ListNotificationsResponse> {
    const response = await apiClient.get<ListNotificationsResponse>('/notifications', {
      params: {
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
        unreadOnly: params?.unreadOnly ?? false,
      },
    });
    return response.data;
  },

  async fetchUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  async markRead(id: string): Promise<MarkReadResponse> {
    const response = await apiClient.patch<MarkReadResponse>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead(): Promise<MarkAllReadResponse> {
    const response = await apiClient.patch<MarkAllReadResponse>('/notifications/read-all');
    return response.data;
  },

  async deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/notifications/${id}`,
    );
    return response.data;
  },
};
