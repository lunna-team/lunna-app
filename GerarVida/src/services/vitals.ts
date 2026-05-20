import { api } from './api';
import type {
  Contraction, GlucoseReading, BloodPressureReading,
  PaginatedResponse, VitalClassification, GlucoseMoment, TimeOfDay,
} from '../types';

function classifyGlucose(value: number, moment: GlucoseMoment): VitalClassification {
  if (moment === 'fasting') {
    if (value < 95) return 'Normal';
    if (value < 126) return 'Atenção';
    return 'Alto';
  }
  if (value < 140) return 'Normal';
  if (value < 200) return 'Atenção';
  return 'Alto';
}

function classifyBloodPressure(systolic: number, diastolic: number): VitalClassification {
  if (systolic >= 140 || diastolic >= 90) return 'Alto';
  if (systolic >= 120 || diastolic >= 80) return 'Atenção';
  return 'Normal';
}

export const vitalsService = {
  // Contrações
  createContraction: (
    patientId: string,
    data: { duration_seconds: number; interval_minutes?: number; session_date: string },
  ) => api.post<Contraction>(`/patients/${patientId}/contractions`, data),

  listContractions: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<Contraction>>(
      `/patients/${patientId}/contractions?limit=${limit}&offset=${offset}`,
    ),

  getContractionStats: (patientId: string) =>
    api.get<{ patient_id: string; total_contractions: number; average_duration_seconds: number }>(
      `/patients/${patientId}/contractions/stats`,
    ),

  clearContractionSession: (patientId: string) =>
    api.delete<void>(`/patients/${patientId}/contractions/session`),

  // Glicose
  createGlucose: (
    patientId: string,
    data: { value_mg_dl: number; moment: GlucoseMoment; notes?: string },
  ) => {
    const classification = classifyGlucose(data.value_mg_dl, data.moment);
    return api.post<GlucoseReading>(`/patients/${patientId}/glucose-readings`, {
      ...data,
      classification,
    });
  },

  listGlucoseReadings: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<GlucoseReading>>(
      `/patients/${patientId}/glucose-readings?limit=${limit}&offset=${offset}`,
    ),

  getGlucoseStats: (patientId: string) =>
    api.get<{ total_readings: number; average: number }>(
      `/patients/${patientId}/glucose-readings/stats`,
    ),

  getGlucoseChart: (patientId: string, days = 30) =>
    api.get<{ data: { timestamp: string; value: number; moment: string }[]; normal_limit: number; hypertension_limit: number }>(
      `/patients/${patientId}/glucose-readings/chart?days=${days}`,
    ),

  // Pressão arterial
  createBloodPressure: (
    patientId: string,
    data: { systolic: number; diastolic: number; pulse_bpm?: number; moment: TimeOfDay },
  ) => {
    const classification = classifyBloodPressure(data.systolic, data.diastolic);
    return api.post<BloodPressureReading>(`/patients/${patientId}/blood-pressure`, {
      ...data,
      classification,
    });
  },

  listBloodPressureReadings: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<BloodPressureReading>>(
      `/patients/${patientId}/blood-pressure?limit=${limit}&offset=${offset}`,
    ),

  getBloodPressureStats: (patientId: string) =>
    api.get<{ total_readings: number; average_systolic: number; average_diastolic: number }>(
      `/patients/${patientId}/blood-pressure/stats`,
    ),

  getBloodPressureChart: (patientId: string, days = 30) =>
    api.get<{ data: { timestamp: string; systolic: number; diastolic: number }[]; hypertension_limit: number; normal_systolic: number; normal_diastolic: number }>(
      `/patients/${patientId}/blood-pressure/chart?days=${days}`,
    ),
};
