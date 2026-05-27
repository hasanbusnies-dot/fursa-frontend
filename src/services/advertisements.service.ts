import { api } from './api';
import type { ApiResponse, Advertisement } from '@/types';

export interface CreateAdPayload {
  companyName: string;
  mediaUrl: string | null;
  mediaType: 'IMAGE' | 'GIF' | 'VIDEO' | 'TEXT';
  targetUrl: string;
  isActive?: boolean;
  // TEXT-type design fields
  adText?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
}

export const advertisementsService = {
  // Public — homepage hero
  getActive: async (): Promise<Advertisement[]> => {
    const res = await api.get<ApiResponse<Advertisement[]>>('/advertisements');
    return Array.isArray(res.data) ? res.data : [];
  },

  // Admin — all ads regardless of active state
  getAll: async (): Promise<Advertisement[]> => {
    const res = await api.get<ApiResponse<Advertisement[]>>('/admin/advertisements');
    return Array.isArray(res.data) ? res.data : [];
  },

  create: async (payload: CreateAdPayload): Promise<Advertisement> => {
    const res = await api.post<ApiResponse<Advertisement>>('/admin/advertisements', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<CreateAdPayload>): Promise<Advertisement> => {
    const res = await api.put<ApiResponse<Advertisement>>(`/admin/advertisements/${id}`, payload);
    return res.data;
  },

  toggleActive: async (id: string, isActive: boolean): Promise<void> => {
    await api.patch<unknown>(`/admin/advertisements/${id}`, { isActive });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<unknown>(`/admin/advertisements/${id}`);
  },
};
