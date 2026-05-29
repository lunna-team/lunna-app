import { api } from './api';
import type { Medication, PaginatedResponse } from '../types';

export interface MedicationCreate {
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
}

export interface MedicationUpdate {
  name?: string;
  dosage?: string;
  frequency?: string;
  end_date?: string;
  instructions?: string;
  active?: boolean;
}

export const medicationsService = {
  list: (
    patientId: string,
    params?: { active?: boolean; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.append('active', String(params.active));
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Medication>>(
      `/patients/${patientId}/medications${query}`,
    );
  },

  create: (patientId: string, data: MedicationCreate) =>
    api.post<Medication>(`/patients/${patientId}/medications`, data),

  update: (medicationId: string, data: MedicationUpdate) =>
    api.patch<Medication>(`/patients/medications/${medicationId}`, data),
};
