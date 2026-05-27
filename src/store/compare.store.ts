import { create } from 'zustand';
import type { Listing } from '@/types';

interface CompareStore {
  items: Listing[];
  /** Returns false (and does NOT mutate) when the list is already at capacity (3). */
  addItem: (listing: Listing) => boolean;
  removeItem: (listingId: string) => void;
  clearItems: () => void;
}

export const useCompareStore = create<CompareStore>()((set, get) => ({
  items: [],

  addItem: (listing) => {
    const { items } = get();
    if (items.length >= 3) return false;
    if (items.some((i) => i.id === listing.id)) return true; // already present
    set({ items: [...items, listing] });
    return true;
  },

  removeItem: (listingId) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== listingId) })),

  clearItems: () => set({ items: [] }),
}));
