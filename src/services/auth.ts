import { api } from './api';
import { storage, STORAGE_KEYS } from './storage';
import type { LoginResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    await storage.set(STORAGE_KEYS.accessToken, response.access_token);
    await storage.set(STORAGE_KEYS.refreshToken, response.refresh_token);
    await storage.set(STORAGE_KEYS.user, response.user);
    return response;
  },

  async refresh(): Promise<string | null> {
    const refreshToken = await storage.get<string>(STORAGE_KEYS.refreshToken);
    if (!refreshToken) return null;
    try {
      const res = await api.post<{ access_token: string; token_type: string }>(
        '/auth/refresh',
        { refresh_token: refreshToken },
      );
      await storage.set(STORAGE_KEYS.accessToken, res.access_token);
      return res.access_token;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout', {});
    } finally {
      await storage.remove(STORAGE_KEYS.accessToken);
      await storage.remove(STORAGE_KEYS.refreshToken);
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
