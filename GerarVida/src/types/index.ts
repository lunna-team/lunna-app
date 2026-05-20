export type UserRole = 'patient' | 'doctor' | 'secretary' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinic_id: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PatientAppointmentStatus = 'pending' | 'confirmed' | 'reschedule_requested' | 'reschedule_approved';
export type AppointmentType = 'routine' | 'ultrasound' | 'lab' | 'follow_up' | 'emergency';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  date: string;
  time: string;
  datetime: string;
  duration_minutes: number;
  type: AppointmentType;
  location?: string;
  notes?: string;
  status: AppointmentStatus;
  patient_status: PatientAppointmentStatus;
  confirmed_at?: string;
  reschedule_reason?: string;
  reschedule_observation?: string;
  new_date?: string;
  new_time?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  data: T[];
}

export type VitalClassification = 'Normal' | 'Atenção' | 'Alto';
export type GlucoseMoment = 'fasting' | 'after_meal' | 'random';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Contraction {
  id: string;
  patient_id: string;
  duration_seconds: number;
  interval_minutes?: number;
  session_date: string;
  created_at: string;
  updated_at: string;
}

export interface GlucoseReading {
  id: string;
  patient_id: string;
  value_mg_dl: number;
  moment: GlucoseMoment;
  classification: VitalClassification;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureReading {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse_bpm?: number;
  moment: TimeOfDay;
  classification: VitalClassification;
  created_at: string;
  updated_at: string;
}
