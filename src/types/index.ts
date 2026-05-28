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

// ─── Announcements ───────────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  clinic_id: string;
  category: string;
  title: string;
  short_description: string;
  full_description: string;
  expires_at: string | null;
  is_new: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Baby Names ──────────────────────────────────────────────────────────────

export interface BabyName {
  id: string;
  name: string;
  gender: 'M' | 'F';
  origin: string;
  meaning: string;
  popularity_score: number;
  trend: string;
  is_favorite: boolean;
  created_at: string;
}

// ─── Fetal Development ───────────────────────────────────────────────────────

export interface FetalDevelopment {
  id: string;
  week: number;
  size_cm: number;
  weight_g: number;
  description: string;
  highlights: string[];
  image_url: string | null;
  model_url: string | null;
}

// ─── Chat / Messages ─────────────────────────────────────────────────────────

export interface Message {
  id: string;
  patient_id: string;
  sender_id: string;
  sender_role: UserRole | 'system';
  content: string;
  read: boolean;
  created_at: string;
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export type UltrasoundType = 'obstetric' | 'morphology' | 'detailed';
export type FetalPresentation = 'cephalic' | 'breech' | 'transverse';
export type VaccineStatus = 'scheduled' | 'completed' | 'missed';
export type LabTestStatus = 'pending' | 'completed' | 'abnormal';

export interface Ultrasound {
  id: string;
  patient_id: string;
  type: UltrasoundType;
  date: string;
  ig_weeks: number;
  presentation: FetalPresentation | null;
  placenta_location: string | null;
  amniotic_fluid_ml: number | null;
  fetal_heart_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface Vaccine {
  id: string;
  patient_id: string;
  vaccine_type: string;
  date: string;
  dose_number: number;
  status: VaccineStatus;
  reactions: string | null;
  created_at: string;
}

export interface LabTest {
  id: string;
  patient_id: string;
  type: string;
  name: string;
  date: string;
  result: string | null;
  reference_range: string | null;
  status: LabTestStatus;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Patient (doctor/secretary view) ─────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PatientDetail {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  prontuario: string | null;
  lmp_date: string | null;
  edd: string | null;
  current_week: number | null;
  risk_level: RiskLevel;
  blood_type: string | null;
  height_cm: number | null;
  weight_initial_kg: number | null;
  allergies: string | null;
  chronic_diseases: string | null;
}

export interface WeightEntry {
  week: number;
  weight_kg: number;
  recorded_at: string;
}

export interface UterineHeightEntry {
  week: number;
  height_cm: number;
  recorded_at: string;
}

export interface PatientProntuario {
  patient_id: string;
  current_week: number | null;
  edd: string | null;
  lmp_date: string | null;
  blood_type: string | null;
  allergies: string | null;
  fetal_position: string | null;
  weight_history: WeightEntry[];
  uterine_height_history: UterineHeightEntry[];
  complications: Array<{ description: string; severity: 'low' | 'medium' | 'high'; week: number }>;
}

// ─── Doctor Dashboard & Agenda ────────────────────────────────────────────────

export type AgendaView = 'day' | 'week' | 'births';

export interface DoctorDashboard {
  today_appointments: number;
  active_patients: number;
  pending_exams: number;
}

export interface AgendaItem {
  id: string;
  hora: string;
  duration_minutes: number;
  patient_name: string;
  patient_id: string;
  type: AppointmentType;
  gestational_week: number | null;
  status: 'done' | 'now' | 'next' | 'confirmed' | 'pending';
  edd?: string;
  hospital?: string;
}

// ─── Secretary Dashboard ──────────────────────────────────────────────────────

export interface SecretaryDashboard {
  today_appointments: number;
  confirmed: number;
  pending: number;
  total_patients: number;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}
