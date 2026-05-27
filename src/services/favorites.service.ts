import { api } from './api';
import type { ApiResponse, Listing } from '@/types';

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

// Backend may return flat Listing objects OR join-records like { id, listing: {...} }.
// This extracts the real Listing in either case.
function extractListing(item: unknown): Listing | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  // Join-record shape: { id: "...", listing: { id: "...", title: "..." } }
  if (obj.listing && typeof obj.listing === 'object') return obj.listing as Listing;
  // Already a flat Listing
  if ('title' in obj && 'price' in obj) return obj as unknown as Listing;
  return null;
}

type FavoritesEnvelope =
  | unknown[]
  | { favorites: unknown[] }
  | { data: unknown[] };

export const favoritesService = {
  check: async (listingId: string): Promise<boolean> => {
    try {
      const res = await api.get<ApiResponse<{ isFavorited: boolean } | { favorited: boolean }>>(
        `/favorites/check/${listingId}`,
      );
      return extractFavorited(res.data as ToggleResult);
    } catch {
      return false;
    }
  },

  toggle: async (listingId: string): Promise<boolean> => {
    const res = await api.post<ApiResponse<ToggleResult>>('/favorites/toggle', { listingId });
    return extractFavorited(res.data);
  },

  getAll: async (): Promise<Listing[]> => {
    const res = await api.get<ApiResponse<FavoritesEnvelope>>('/favorites');
    const raw = res.data;

    let items: unknown[] = [];
    if (Array.isArray(raw))                         items = raw;
    else if (raw && 'favorites' in raw)             items = (raw as { favorites: unknown[] }).favorites;
    else if (raw && 'data'      in raw)             items = (raw as { data: unknown[] }).data;

    return items.map(extractListing).filter((l): l is Listing => l !== null);
  },
};
