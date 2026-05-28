import { api } from './api';
import type { Announcement, PaginatedResponse } from '../types';

export const announcementsService = {
  list: (
    clinicId: string,
    params?: { category?: string; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.append('category', params.category);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Announcement>>(
      `/clinics/${clinicId}/announcements${query}`,
    );
  },

  markRead: (clinicId: string, announcementId: string) =>
    api.patch<void>(`/clinics/${clinicId}/announcements/${announcementId}/read`),
};
