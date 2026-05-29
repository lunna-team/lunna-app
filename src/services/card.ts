import { api } from './api';
import type {
  CardSection, PatientCard, CardSectionCreate,
  CardSectionUpdate, CardEntryUpsert,
} from '../types';

export const cardService = {
  // Template do médico
  getTemplate: (doctorId: string) =>
    api.get<CardSection[]>(`/doctors/${doctorId}/card-template`),

  addSection: (doctorId: string, data: CardSectionCreate) =>
    api.post<CardSection>(`/doctors/${doctorId}/card-template/sections`, data),

  updateSection: (doctorId: string, sectionId: string, data: CardSectionUpdate) =>
    api.patch<CardSection>(`/doctors/${doctorId}/card-template/sections/${sectionId}`, data),

  moveSection: (doctorId: string, sectionId: string, direction: 'up' | 'down') =>
    api.post<CardSection[]>(`/doctors/${doctorId}/card-template/sections/${sectionId}/move`, { direction }),

  deleteSection: (doctorId: string, sectionId: string) =>
    api.delete<void>(`/doctors/${doctorId}/card-template/sections/${sectionId}`),

  // Cartão por paciente
  getPatientCard: (patientId: string) =>
    api.get<PatientCard>(`/patients/${patientId}/card`),

  saveSectionContent: (patientId: string, sectionId: string, data: CardEntryUpsert) =>
    api.put<void>(`/patients/${patientId}/card/sections/${sectionId}`, data),
};
