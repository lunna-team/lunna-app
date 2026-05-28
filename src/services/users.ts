import { api } from './api';
import type { User, Clinic } from '../types';

export const usersService = {
  getUser: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  updateUser: (userId: string, data: { name?: string; phone?: string; avatar_url?: string }) =>
    api.put<User>(`/users/${userId}`, data),

  getClinic: (userId: string) =>
    api.get<Clinic>(`/users/${userId}/clinic`),
};
