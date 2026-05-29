export const GESTATIONAL_WEEKS_TOTAL = 42;

export const GLUCOSE_LIMITS = {
  fasting: 95,
  postMeal: 140,
} as const;

export const BLOOD_PRESSURE_LIMITS = {
  hypertensionSystolic: 140,
  hypertensionDiastolic: 90,
} as const;

export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  SECRETARY: 'secretary',
  ADMIN: 'admin',
} as const;

export interface ExamPreset {
  name: string;
  type: string;
}

export const EXAMES_PRIMEIRO_TRIMESTRE: ExamPreset[] = [
  { name: 'Hemograma completo', type: 'blood' },
  { name: 'Tipagem sanguínea e Rh', type: 'blood' },
  { name: 'Glicemia de jejum', type: 'blood' },
  { name: 'VDRL (Sífilis)', type: 'serology' },
  { name: 'Anti-HIV 1 e 2', type: 'serology' },
  { name: 'Toxoplasmose IgG e IgM', type: 'serology' },
  { name: 'Rubéola IgG', type: 'serology' },
  { name: 'Hepatite B (HBsAg)', type: 'serology' },
  { name: 'Hepatite C (Anti-HCV)', type: 'serology' },
  { name: 'TSH (Tireoide)', type: 'blood' },
  { name: 'Urina tipo I', type: 'urine' },
  { name: 'Urocultura', type: 'urine' },
  { name: 'Parasitológico de fezes', type: 'other' },
];

export const EXAMES_SEGUNDO_TRIMESTRE: ExamPreset[] = [
  { name: 'Glicemia de jejum (2º tri)', type: 'blood' },
  { name: 'TOTG 75g (diabetes gestacional)', type: 'blood' },
  { name: 'Hemograma (2º tri)', type: 'blood' },
  { name: 'VDRL (2º tri)', type: 'serology' },
  { name: 'Urocultura (2º tri)', type: 'urine' },
];

export const EXAMES_TERCEIRO_TRIMESTRE: ExamPreset[] = [
  { name: 'Hemograma (3º tri)', type: 'blood' },
  { name: 'Coagulograma', type: 'blood' },
  { name: 'Estreptococo B (35-37 sem)', type: 'culture' },
  { name: 'VDRL (3º tri)', type: 'serology' },
  { name: 'Anti-HIV (3º tri)', type: 'serology' },
  { name: 'Urina tipo I (3º tri)', type: 'urine' },
];
