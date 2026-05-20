import { api } from './api';
import { storage, STORAGE_KEYS } from './storage';
import type { LoginResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    await storage.set(STORAGE_KEYS.accessToken, response.access_token);
    await storage.set(STORAGE_KEYS.user, response.user);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout', {});
    } finally {
      await storage.remove(STORAGE_KEYS.accessToken);
      await storage.remove(STORAGE_KEYS.user);
    }
  },

  async getStoredUser(): Promise<User | null> {
    return storage.get<User>(STORAGE_KEYS.user);
  },

  async getStoredToken(): Promise<string | null> {
    return storage.get<string>(STORAGE_KEYS.accessToken);
  },
};
