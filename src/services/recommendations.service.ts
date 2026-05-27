import { api } from './api';
import type { ApiResponse, Listing } from '@/types';

function extractListing(item: unknown): Listing | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  if (obj.listing && typeof obj.listing === 'object') return obj.listing as Listing;
  if ('title' in obj && 'price' in obj) return obj as unknown as Listing;
  return null;
}

function parseListings(raw: unknown): Listing[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.listings))  items = obj.listings;
    else if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
  }
  return items.map(extractListing).filter((l): l is Listing => l !== null);
}

export const recommendationsService = {
  trackView: async (listingId: string): Promise<void> => {
    try {
      await api.post('/recommendations/view', { listingId });
    } catch {
      // fire-and-forget
    }
  },

  getRecent: async (): Promise<Listing[]> => {
    const res = await api.get<ApiResponse<unknown>>('/recommendations/recent');
    return parseListings(res.data);
  },

  getSuggested: async (): Promise<Listing[]> => {
    const res = await api.get<ApiResponse<unknown>>('/recommendations/suggested');
    return parseListings(res.data);
  },

  removeFromHistory: async (listingId: string): Promise<void> => {
    await api.delete(`/recommendations/history/${listingId}`);
  },
};
