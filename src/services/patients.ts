import { api } from './api';
import type {
  PatientDetail, PatientProntuario,
  DoctorDashboard, AgendaView, AgendaItem,
  SecretaryDashboard,
  PaginatedResponse, RiskLevel,
} from '../types';

interface PatientUpdate {
  height_cm?: number;
  weight_initial_kg?: number;
  blood_type?: string;
  allergies?: string;
  risk_level?: RiskLevel;
  fetal_position?: string;
}

export const patientsService = {
  // ── Paciente ────────────────────────────────────────────────────────────────
  getPatient: (patientId: string) =>
    api.get<PatientDetail>(`/patients/${patientId}`),

  getProntuario: (patientId: string) =>
    api.get<PatientProntuario>(`/patients/${patientId}/prontuario`),

  updateProntuario: (patientId: string, data: PatientUpdate) =>
    api.put<PatientProntuario>(`/patients/${patientId}/prontuario`, data),

  // ── Médico ──────────────────────────────────────────────────────────────────
  getDoctorPatients: (
    doctorId: string,
    params?: { search?: string; risk_level?: RiskLevel; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.risk_level) qs.append('risk_level', params.risk_level);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<PatientDetail>>(
      `/doctors/${doctorId}/patients${query}`,
    );
  },

  getDoctorDashboard: (doctorId: string) =>
    api.get<DoctorDashboard>(`/doctors/${doctorId}/dashboard`),

  getDoctorAgenda: (doctorId: string, view: AgendaView, date?: string) => {
    const qs = new URLSearchParams({ view });
    if (date) qs.append('date', date);
    return api.get<PaginatedResponse<AgendaItem>>(
      `/doctors/${doctorId}/agenda?${qs}`,
    );
  },

  // ── Secretária ──────────────────────────────────────────────────────────────
  getSecretaryDashboard: () =>
    api.get<SecretaryDashboard>('/secretary/dashboard'),
};
