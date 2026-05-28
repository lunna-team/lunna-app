import { api } from './api';
import type { BabyName, PaginatedResponse } from '../types';

export const babyNamesService = {
  list: (params?: { gender?: 'M' | 'F'; search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.gender) qs.append('gender', params.gender);
    if (params?.search) qs.append('search', params.search);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<BabyName>>(`/baby-names${query}`);
  },

  listFavorites: (patientId: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<BabyName>>(
      `/patients/${patientId}/baby-names/favorites${query}`,
    );
  },

  addFavorite: (patientId: string, nameId: string) =>
    api.post<{ patient_id: string; baby_name_id: string }>(
      `/patients/${patientId}/baby-names/${nameId}/favorite`,
      {},
    ),

  removeFavorite: (patientId: string, nameId: string) =>
    api.delete<void>(`/patients/${patientId}/baby-names/${nameId}/favorite`),
};
