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
      await api.post('/recommendations/view', { listingId }, { realm: 'user' });
    } catch {
      // fire-and-forget
    }
  },

  getRecent: async (): Promise<Listing[]> => {
    const res = await api.get<ApiResponse<unknown>>('/recommendations/recent', { realm: 'user' });
    return parseListings(res.data);
  },

  /**
   * @param limit 1–20. OMITTED means "don't send the param at all", so the backend's
   *   own default (3) applies — which is what keeps the header popover and the mobile
   *   homepage section on 3 without either of them naming a number. Only the "view all"
   *   page passes one. Values outside 1–20 are rejected by the backend's query schema,
   *   so don't invent them client-side.
   */
  getSuggested: async (limit?: number): Promise<Listing[]> => {
    const qs = limit != null ? `?limit=${limit}` : '';
    const res = await api.get<ApiResponse<unknown>>(`/recommendations/suggested${qs}`, { realm: 'user' });
    return parseListings(res.data);
  },

  removeFromHistory: async (listingId: string): Promise<void> => {
    await api.delete(`/recommendations/history/${listingId}`, { realm: 'user' });
  },
};
