export type UserRole = 'patient' | 'doctor' | 'secretary' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinic_id: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient_id?: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  address: string | null;
  phone: string | null;
  email?: string | null;
  website?: string | null;
  timezone: string;
  language: string;
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
  location?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
  patient_status: PatientAppointmentStatus;
  confirmed_at?: string | null;
  reschedule_reason?: string | null;
  reschedule_observation?: string | null;
  new_date?: string | null;
  new_time?: string | null;
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
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureReading {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse_bpm?: number | null;
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

export type BabyNameGender = 'male' | 'female' | 'neutral';

export interface BabyName {
  id: string;
  name: string;
  gender: BabyNameGender;
  origin: string | null;
  meaning: string | null;
  popularity_score: number | null;
  trend: string | null;
  is_favorite: boolean;
  created_at: string;
}

// ─── Fetal Development ───────────────────────────────────────────────────────

export interface FetalDevelopment {
  id: string;
  week: number;
  size_cm: number | null;
  weight_g: number | null;
  description: string;
  highlights: string[];
  image_url: string | null;
  model_url: string | null;
}

// ─── Chat / Messages ─────────────────────────────────────────────────────────

export type MessageSenderRole = 'patient' | 'doctor' | 'secretary' | 'system';

export interface Message {
  id: string;
  patient_id: string;
  sender_id: string;
  sender_role: MessageSenderRole;
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
  dose_number: number | null;
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

// Flat shape used throughout the UI — services are responsible for mapping
// the nested API response (user.name, user.email etc.) into this interface.
export interface PatientDetail {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  prontuario: string;
  edd: string | null;
  current_week: number | null;
  risk_level: RiskLevel;
  // Fields only present in single-patient detail response
  lmp_date?: string | null;
  blood_type?: string | null;
  height_cm?: string | null;
  weight_initial_kg?: string | null;
  imc?: string | null;
  hospital?: string | null;
}

// ─── Prontuário ───────────────────────────────────────────────────────────────
// Maps from ProntuarioResponse { patient_id, dados_clinicos: PatientResponse, user: UserResponse }

export interface PatientProntuario {
  patient_id: string;
  // From dados_clinicos (PatientResponse)
  current_week: number | null;
  edd: string | null;
  lmp_date: string | null;
  blood_type: string | null;
  height_cm: string | null;
  weight_initial_kg: string | null;
  imc: string | null;
  // From user (UserResponse)
  user_name: string;
  user_email: string;
  user_phone: string | null;
  updated_at: string | null;
}

// ─── Doctor Dashboard & Agenda ────────────────────────────────────────────────

export type AgendaView = 'day' | 'week' | 'births';

export interface DoctorDashboard {
  appointments_today: number;
  active_patients: number;
}

// Appointment entry inside day/week agenda view
export interface AgendaAppointment {
  id: string;
  date: string;
  time: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  patient_status: PatientAppointmentStatus;
  location: string | null;
  notes: string | null;
}

// Birth entry inside births view
export interface BirthItem {
  patient_id: string;
  name: string;
  edd: string;
  current_week: number | null;
  risk_level: RiskLevel;
  hospital: string | null;
}

// Unified API response for GET /doctors/{id}/agenda
export interface AgendaResponse {
  view: AgendaView;
  date?: string;
  start?: string;
  appointments?: AgendaAppointment[];
  upcoming_births?: BirthItem[];
}

// ─── Secretary Dashboard ──────────────────────────────────────────────────────

export interface SecretaryDashboard {
  appointments_today: number;
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

// ─── Evolução por Consulta ────────────────────────────────────────────────────

export type EdemaGrade = 'none' | '+' | '++' | '+++';

export interface EvolutionCreate {
  weight_kg?: number;
  fundal_height_cm?: number;
  fetal_heart_rate?: number;
  presentation?: 'cephalic' | 'breech' | 'transverse';
  fetal_movements?: boolean;
  edema?: EdemaGrade;
  bp_systolic?: number;
  bp_diastolic?: number;
  clinical_notes?: string;

  queixas?: string;
  observacoes_medicas?: string;
  pfe_gramas?: number;
  pfe_percentil?: string;
  doppler?: string;
  observacoes_exame_fisico?: string;
  conduta?: string;
}

export interface AppointmentEvolution extends EvolutionCreate {
  id: string;
  appointment_id: string;
  patient_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Anamnese ─────────────────────────────────────────────────────────────────

export type AlcoolFrequencia = 'social' | 'semanal' | 'diario';

export interface AnamneseCreate {
  // Doenças pré-existentes
  has_diabetes?: boolean;
  has_hipertensao?: boolean;
  has_cardiopatia?: boolean;
  has_epilepsia?: boolean;
  has_tireoide?: boolean;
  has_doenca_renal?: boolean;
  has_autoimune?: boolean;
  has_hiv?: boolean;
  has_depressao_ansiedade?: boolean;
  has_asma?: boolean;
  has_trombofilia?: boolean;
  outras_doencas?: string;
  // Alergias
  alergias_medicamentos?: string;
  outras_alergias?: string;
  // Antecedentes familiares
  familiar_diabetes?: boolean;
  familiar_hipertensao?: boolean;
  familiar_gemelaridade?: boolean;
  familiar_malformacoes?: boolean;
  familiar_trombose?: boolean;
  outros_familiares?: string;
  // Hábitos de vida
  tabagismo?: boolean;
  tabagismo_cigarros_dia?: number;
  alcool?: boolean;
  alcool_frequencia?: AlcoolFrequencia;
  drogas_ilicitas?: boolean;
  atividade_fisica?: boolean;
  atividade_fisica_descricao?: string;
  violencia_domestica?: boolean;
  sono_qualidade?: 'boa' | 'regular' | 'ruim';
  estresse_nivel?: 'baixo' | 'moderado' | 'alto';
  exposicao_ocupacional?: string;
  // Antecedentes obstétricos (GESTA)
  gesta?: number;
  para?: number;
  abortos?: number;
  tipo_parto_anterior?: 'normal' | 'cesarea' | 'ambos';
  pre_eclampsia_anterior?: boolean;
  diabetes_gestacional_anterior?: boolean;
  perda_fetal_anterior?: boolean;
  prematuridade_anterior?: boolean;
  intercorrencias_anteriores?: string;
  // Suporte social / Acompanhante
  acompanhante_nome?: string;
  acompanhante_parentesco?: string;
  acompanhante_telefone?: string;
  situacao_conjugal?: 'casada' | 'uniao_estavel' | 'solteira' | 'outro';
}

export interface PatientAnamnesis extends AnamneseCreate {
  id: string;
  patient_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Cartão da Gestante ───────────────────────────────────────────────────────

export interface CardFieldValue {
  label: string;
  value?: string;
  position: number;
}

export interface CardSection {
  id: string;
  doctor_id: string;
  title: string;
  section_type: 'builtin' | 'text' | 'fields';
  builtin_key?: string;
  position: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenderedCardSection {
  section_id: string;
  title: string;
  section_type: 'builtin' | 'text' | 'fields';
  builtin_key?: string;
  position: number;
  visible: boolean;
  content?: string;
  fields?: CardFieldValue[];
  builtin_data?: Record<string, any>;
}

export interface PatientCard {
  patient_id: string;
  doctor_id: string;
  sections: RenderedCardSection[];
}

export interface CardSectionCreate {
  title: string;
  section_type: 'text' | 'fields';
}

export interface CardSectionUpdate {
  title?: string;
  visible?: boolean;
}

export interface CardEntryUpsert {
  content?: string;
  fields?: CardFieldValue[];
}
