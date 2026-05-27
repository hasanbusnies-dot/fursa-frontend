import { api } from './api';
import type { ApiResponse, ChatRoom, Message } from '@/types';

export const messagesService = {
  createOrGetRoom: async (listingId: string): Promise<ChatRoom> => {
    const res = await api.post<ApiResponse<ChatRoom>>('/conversations', { listingId });
    return res.data;
  },

  getRoom: async (roomId: string): Promise<ChatRoom> => {
    const res = await api.get<ApiResponse<ChatRoom>>(`/conversations/${roomId}`);
    return res.data;
  },

  getRooms: async (): Promise<ChatRoom[]> => {
    const res = await api.get<ApiResponse<ChatRoom[]>>('/conversations');
    const data = res.data;
    return Array.isArray(data) ? data : [];
  },

  getMessages: async (roomId: string): Promise<Message[]> => {
    const res = await api.get<ApiResponse<Message[]>>(`/conversations/${roomId}/messages`);
    const data = res.data;
    return Array.isArray(data) ? data : [];
  },

  sendMessage: async (roomId: string, content: string): Promise<Message> => {
    const res = await api.post<ApiResponse<Message>>(
      `/conversations/${roomId}/messages`,
      { content },
    );
    return res.data;
  },
};
