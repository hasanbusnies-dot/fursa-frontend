import { api } from './api';
import type { ApiResponse, ChatRoom, Message } from '@/types';

// Every call pins realm: 'user' — messaging is a consumer feature, and the Header's
// unread poll runs on /admin pathnames too (admins keep consumer chrome). Unpinned,
// that poll resolved to the empty admin realm and hard-redirect-looped /admin/login.
export const messagesService = {
  createOrGetRoom: async (listingId: string): Promise<ChatRoom> => {
    const res = await api.post<ApiResponse<ChatRoom>>('/conversations', { listingId }, { realm: 'user' });
    return res.data;
  },

  getRoom: async (roomId: string): Promise<ChatRoom> => {
    const res = await api.get<ApiResponse<ChatRoom>>(`/conversations/${roomId}`, { realm: 'user' });
    return res.data;
  },

  getRooms: async (): Promise<ChatRoom[]> => {
    const res = await api.get<ApiResponse<ChatRoom[]>>('/conversations', { realm: 'user' });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  },

  getMessages: async (roomId: string): Promise<Message[]> => {
    const res = await api.get<ApiResponse<Message[]>>(`/conversations/${roomId}/messages`, { realm: 'user' });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  },

  sendMessage: async (roomId: string, content: string): Promise<Message> => {
    const res = await api.post<ApiResponse<Message>>(
      `/conversations/${roomId}/messages`,
      { content },
      { realm: 'user' },
    );
    return res.data;
  },
};
