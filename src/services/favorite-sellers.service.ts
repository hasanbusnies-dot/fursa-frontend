import { api } from './api';
import type { ApiResponse, User } from '@/types';

type ToggleResult =
  | { isFavorited: boolean }
  | { favorited: boolean }
  | boolean;

function extractFavorited(data: ToggleResult): boolean {
  if (typeof data === 'boolean') return data;
  if ('isFavorited' in data) return data.isFavorited;
  if ('favorited'   in data) return data.favorited;
  return false;
}

// Backend may return flat User objects OR join-records like { id, seller: {...} }.
function extractSeller(item: unknown): User | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  // Join-record shape: { id: "...", seller: { id: "...", email: "..." } }
  if (obj.seller && typeof obj.seller === 'object') return obj.seller as User;
  // Also handle { id, user: {...} } variant
  if (obj.user   && typeof obj.user   === 'object') return obj.user   as User;
  // Already a flat User
  if ('email' in obj) return obj as unknown as User;
  return null;
}

type SellersEnvelope =
  | unknown[]
  | { sellers: unknown[] }
  | { favoriteSellers: unknown[] }
  | { data: unknown[] };

export const favoriteSellersService = {
  check: async (sellerId: string): Promise<boolean> => {
    try {
      const res = await api.get<ApiResponse<{ isFavorited: boolean } | { favorited: boolean }>>(
        `/favorite-sellers/check/${sellerId}`,
      );
      return extractFavorited(res.data as ToggleResult);
    } catch {
      return false;
    }
  },

  toggle: async (sellerId: string): Promise<boolean> => {
    const res = await api.post<ApiResponse<ToggleResult>>('/favorite-sellers/toggle', { sellerId });
    return extractFavorited(res.data);
  },

  getAll: async (): Promise<User[]> => {
    const res = await api.get<ApiResponse<SellersEnvelope>>('/favorite-sellers');
    const raw = res.data;

    let items: unknown[] = [];
    if (Array.isArray(raw))                              items = raw;
    else if (raw && 'sellers'         in raw)            items = (raw as { sellers: unknown[] }).sellers;
    else if (raw && 'favoriteSellers' in raw)            items = (raw as { favoriteSellers: unknown[] }).favoriteSellers;
    else if (raw && 'data'            in raw)            items = (raw as { data: unknown[] }).data;

    return items.map(extractSeller).filter((s): s is User => s !== null);
  },
};
