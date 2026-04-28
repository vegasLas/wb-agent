import type { InAppNotificationType } from '@prisma/client';

export interface InAppNotification {
  id: string;
  userId: number;
  type: InAppNotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsResponse {
  success: boolean;
  data: InAppNotification[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

export interface MarkReadResponse {
  success: boolean;
  data: InAppNotification;
}

export interface MarkAllReadResponse {
  success: boolean;
  data: { markedRead: number };
}
