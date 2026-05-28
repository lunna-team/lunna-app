import { api } from './api';
import type { User, Clinic } from '../types';

export const usersService = {
  getUser: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  updateUser: (userId: string, data: { name?: string; phone?: string; avatar_url?: string }) =>
    api.put<User>(`/users/${userId}`, data),

  getClinic: (userId: string) =>
    api.get<Clinic>(`/users/${userId}/clinic`),

  updatePushToken: (userId: string, pushToken: string) =>
    api.patch<void>(`/users/${userId}/push-token`, { push_token: pushToken }),

  updateOnboarding: (userId: string, completed: boolean) =>
    api.patch<void>(`/users/${userId}/onboarding`, { completed }),
};
