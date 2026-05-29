import { api } from './api';
import type { Appointment, AppointmentEvolution, EvolutionCreate, PaginatedResponse } from '../types';

export const appointmentsService = {
  listPatientAppointments: (
    patientId: string,
    params?: { status?: string; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Appointment>>(
      `/patients/${patientId}/appointments${query}`,
    );
  },

  getAppointment: (appointmentId: string) =>
    api.get<Appointment>(`/appointments/${appointmentId}`),

  confirmAppointment: (appointmentId: string) =>
    api.patch<Appointment>(`/appointments/${appointmentId}/confirm`),

  requestReschedule: (appointmentId: string, reason: string, observation?: string) =>
    api.post<Appointment>(`/appointments/${appointmentId}/reschedule-request`, {
      reason,
      observation,
    }),

  cancelAppointment: (appointmentId: string, reason: string) =>
    api.delete<void>(`/appointments/${appointmentId}?reason=${encodeURIComponent(reason)}`),

  saveEvolution: (appointmentId: string, data: EvolutionCreate) =>
    api.post<AppointmentEvolution>(`/appointments/${appointmentId}/evolution`, data),

  getEvolution: (appointmentId: string) =>
    api.get<AppointmentEvolution>(`/appointments/${appointmentId}/evolution`),

  getPatientEvolutions: (patientId: string) =>
    api.get<AppointmentEvolution[]>(`/patients/${patientId}/evolutions`),
};
