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
