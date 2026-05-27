import { api } from './api';
import type { ApiResponse } from '@/types';

export interface SavedSearch {
  id: string;
  name: string;
  queryString: string;
  createdAt: string;
}

export const savedSearchesService = {
  create: async (name: string, queryString: string): Promise<SavedSearch> => {
    const res = await api.post<ApiResponse<SavedSearch>>('/saved-searches', { name, queryString });
    return res.data;
  },

  getAll: async (): Promise<SavedSearch[]> => {
    const res = await api.get<ApiResponse<SavedSearch[] | { savedSearches: SavedSearch[] }>>('/saved-searches');
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && 'savedSearches' in data) return data.savedSearches;
    return [];
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<unknown>(`/saved-searches/${id}`);
  },
};
