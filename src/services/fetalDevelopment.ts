import { api } from './api';
import type { FetalDevelopment } from '../types';

export const fetalDevelopmentService = {
  getWeek: (week: number) =>
    api.get<FetalDevelopment>(`/fetal-development/${week}`),
};
