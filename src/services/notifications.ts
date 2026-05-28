import { api } from './api';
import type { Notification, PaginatedResponse } from '../types';

export const notificationsService = {
  list: (
    userId: string,
    params?: { unread_only?: boolean; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.unread_only !== undefined) qs.append('unread_only', String(params.unread_only));
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Notification>>(
      `/users/${userId}/notifications${query}`,
    );
  },

  markRead: (notificationId: string) =>
    api.patch<Notification>(`/notifications/${notificationId}/read`),
};
