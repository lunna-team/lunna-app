import { api } from './api';
import type {
  Ultrasound, UltrasoundType, FetalPresentation,
  Vaccine, VaccineStatus,
  LabTest, LabTestStatus,
  PaginatedResponse,
} from '../types';

interface UltrasoundCreate {
  type: UltrasoundType;
  date: string;
  ig_weeks: number;
  presentation?: FetalPresentation;
  placenta_location?: string;
  amniotic_fluid_ml?: number;
  fetal_heart_rate?: number;
  notes?: string;
}

interface VaccineCreate {
  vaccine_type: string;
  date: string;
  dose_number: number;
  status: VaccineStatus;
  reactions?: string;
}

interface LabTestCreate {
  type: string;
  name: string;
  date: string;
  result?: string;
  reference_range?: string;
  status: LabTestStatus;
  file_url?: string;
  notes?: string;
}

export const examsService = {
  // Ultrassonografias
  listUltrasounds: (patientId: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Ultrasound>>(
      `/patients/${patientId}/ultrasounds${query}`,
    );
  },

  createUltrasound: (patientId: string, data: UltrasoundCreate) =>
    api.post<Ultrasound>(`/patients/${patientId}/ultrasounds`, data),

  // Vacinas
  listVaccines: (patientId: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Vaccine>>(
      `/patients/${patientId}/vaccines${query}`,
    );
  },

  createVaccine: (patientId: string, data: VaccineCreate) =>
    api.post<Vaccine>(`/patients/${patientId}/vaccines`, data),

  updateVaccine: (patientId: string, vaccineId: string, data: { status?: VaccineStatus; reactions?: string }) =>
    api.patch<Vaccine>(`/patients/${patientId}/vaccines/${vaccineId}`, data),

  // Exames laboratoriais
  listLabTests: (patientId: string, params?: { type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.append('type', params.type);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<LabTest>>(
      `/patients/${patientId}/lab-tests${query}`,
    );
  },

  createLabTest: (patientId: string, data: LabTestCreate) =>
    api.post<LabTest>(`/patients/${patientId}/lab-tests`, data),
};
