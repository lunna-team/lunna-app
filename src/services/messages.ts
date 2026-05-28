import { api } from './api';
import { API_BASE_URL } from '../config';
import type { Message, PaginatedResponse } from '../types';

export const messagesService = {
  list: (
    patientId: string,
    params?: { limit?: number; offset?: number; before_id?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    if (params?.before_id) qs.append('before_id', params.before_id);
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Message>>(
      `/patients/${patientId}/messages${query}`,
    );
  },

  send: (patientId: string, content: string) =>
    api.post<Message>(`/patients/${patientId}/messages`, { content }),

  markRead: (patientId: string) =>
    api.patch<void>(`/patients/${patientId}/messages/read`),

  connectWS: (
    patientId: string,
    token: string,
    onMessage: (msg: Message) => void,
    onClose?: (code: number) => void,
  ): WebSocket => {
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(
      `${wsBase}/patients/${patientId}/ws/chat?token=${token}`,
    );
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data) as Message);
      } catch {
        // mensagem malformada — ignorar
      }
    };
    ws.onclose = (e) => onClose?.(e.code);
    return ws;
  },
};
