import { api } from './api';
import type {
  PatientDetail, PatientProntuario,
  DoctorDashboard, AgendaView, AgendaResponse,
  SecretaryDashboard,
  PaginatedResponse, RiskLevel,
  PatientAnamnesis, AnamneseCreate,
} from '../types';

// API-level shape for PatientListItemResponse (user.name is nested)
interface PatientListItemRaw {
  id: string;
  user_id: string;
  prontuario: string;
  current_week: number | null;
  edd: string;
  risk_level: string;
  user: { id: string; name: string; email: string; phone: string | null; avatar_url: string | null };
}

// API-level shape for PatientDetailResponse
interface PatientDetailRaw extends PatientListItemRaw {
  lmp_date: string | null;
  blood_type: string | null;
  height_cm: string | null;
  weight_initial_kg: string | null;
  imc: string | null;
  hospital: string | null;
}

// API-level shape for ProntuarioResponse
interface ProntuarioRaw {
  patient_id: string;
  dados_clinicos: {
    current_week: number | null;
    edd: string | null;
    lmp_date: string | null;
    blood_type: string | null;
    height_cm: string | null;
    weight_initial_kg: string | null;
    imc: string | null;
  };
  user: { name: string; email: string; phone: string | null };
  updated_at: string | null;
}

function flattenPatient(raw: PatientListItemRaw): PatientDetail {
  return {
    id: raw.id,
    user_id: raw.user_id,
    name: raw.user.name,
    email: raw.user.email,
    phone: raw.user.phone,
    avatar_url: raw.user.avatar_url,
    prontuario: raw.prontuario,
    edd: raw.edd ?? null,
    current_week: raw.current_week,
    risk_level: (raw.risk_level as RiskLevel) ?? 'low',
  };
}

function flattenPatientDetail(raw: PatientDetailRaw): PatientDetail {
  return {
    ...flattenPatient(raw),
    lmp_date: raw.lmp_date,
    blood_type: raw.blood_type,
    height_cm: raw.height_cm,
    weight_initial_kg: raw.weight_initial_kg,
    imc: raw.imc,
    hospital: raw.hospital,
  };
}

function flattenProntuario(raw: ProntuarioRaw): PatientProntuario {
  return {
    patient_id: raw.patient_id,
    current_week: raw.dados_clinicos.current_week ?? null,
    edd: raw.dados_clinicos.edd ?? null,
    lmp_date: raw.dados_clinicos.lmp_date ?? null,
    blood_type: raw.dados_clinicos.blood_type ?? null,
    height_cm: raw.dados_clinicos.height_cm ?? null,
    weight_initial_kg: raw.dados_clinicos.weight_initial_kg ?? null,
    imc: raw.dados_clinicos.imc ?? null,
    user_name: raw.user.name,
    user_email: raw.user.email,
    user_phone: raw.user.phone ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

interface PatientUpdate {
  height_cm?: string;
  weight_initial_kg?: string;
  imc?: string;
  blood_type?: string;
  risk_level?: RiskLevel;
  hospital?: string;
  acompanhante?: string;
  number_of_fetuses?: number;
  parity?: string;
  cesarean_predicted?: boolean;
  lmp_date?: string;
  edd?: string;
}

export const patientsService = {
  // ── Paciente ────────────────────────────────────────────────────────────────
  getPatient: async (patientId: string): Promise<PatientDetail> => {
    const raw = await api.get<PatientDetailRaw>(`/patients/${patientId}`);
    return flattenPatientDetail(raw);
  },

  getProntuario: async (patientId: string): Promise<PatientProntuario> => {
    const raw = await api.get<ProntuarioRaw>(`/patients/${patientId}/prontuario`);
    return flattenProntuario(raw);
  },

  updateProntuario: (patientId: string, data: PatientUpdate) =>
    api.put<ProntuarioRaw>(`/patients/${patientId}/prontuario`, data),

  // ── Médico ──────────────────────────────────────────────────────────────────
  getDoctorPatients: async (
    doctorId: string,
    params?: { search?: string; risk_level?: RiskLevel; limit?: number; offset?: number },
  ): Promise<PaginatedResponse<PatientDetail>> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.risk_level) qs.append('risk_level', params.risk_level);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    const raw = await api.get<{ total: number; limit: number; offset: number; data: PatientListItemRaw[] }>(
      `/doctors/${doctorId}/patients${query}`,
    );
    return { ...raw, data: raw.data.map(flattenPatient) };
  },

  getDoctorDashboard: (doctorId: string) =>
    api.get<DoctorDashboard>(`/doctors/${doctorId}/dashboard`),

  getDoctorAgenda: (doctorId: string, view: AgendaView, date?: string) => {
    const qs = new URLSearchParams({ view });
    if (date) qs.append('date', date);
    return api.get<AgendaResponse>(`/doctors/${doctorId}/agenda?${qs}`);
  },

  // ── Secretária ──────────────────────────────────────────────────────────────
  getSecretaryDashboard: () =>
    api.get<SecretaryDashboard>('/secretary/dashboard'),

  // ── Anamnese ────────────────────────────────────────────────────────────────
  getAnamnesis: (patientId: string) =>
    api.get<PatientAnamnesis>(`/patients/${patientId}/anamnesis`),

  saveAnamnesis: (patientId: string, data: AnamneseCreate) =>
    api.post<PatientAnamnesis>(`/patients/${patientId}/anamnesis`, data),
};
