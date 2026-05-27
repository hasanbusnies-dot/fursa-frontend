import { api } from './api';
import type { ApiResponse, Listing, User } from '@/types';

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTERED'
  | 'WITHDRAWN';

export interface Offer {
  id: string;
  listingId: string;
  listing?: Listing;
  buyerId: string;
  buyer?: User;
  amount: number;
  counterAmount?: number | null;
  currency: 'SYP' | 'USD';
  status: OfferStatus;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
}

type OffersEnvelope =
  | Offer[]
  | { offers: Offer[] }
  | { data: Offer[] };

function extractList(raw: unknown): Offer[] {
  if (Array.isArray(raw)) return raw as Offer[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.offers)) return obj.offers as Offer[];
    if (Array.isArray(obj.data))   return obj.data   as Offer[];
  }
  return [];
}

export const offersService = {
  createOffer: async (
    listingId: string,
    amount: number,
    currency: 'SYP' | 'USD',
  ): Promise<Offer> => {
    const res = await api.post<ApiResponse<Offer>>('/offers', { listingId, amount, currency });
    return res.data;
  },

  getSellerOffers: async (): Promise<Offer[]> => {
    const res = await api.get<ApiResponse<OffersEnvelope>>('/offers/me/seller');
    return extractList(res.data);
  },

  getBuyerOffers: async (): Promise<Offer[]> => {
    const res = await api.get<ApiResponse<OffersEnvelope>>('/offers/me/buyer');
    return extractList(res.data);
  },

  updateStatus: async (id: string, status: OfferStatus): Promise<Offer> => {
    const res = await api.patch<ApiResponse<Offer>>(`/offers/${id}`, { status });
    return res.data;
  },

  counter: async (id: string, counterAmount: number): Promise<Offer> => {
    const res = await api.patch<ApiResponse<Offer>>(`/offers/${id}`, { counterAmount, status: 'COUNTERED' });
    return res.data;
  },

  reOffer: async (id: string, amount: number): Promise<Offer> => {
    const res = await api.patch<ApiResponse<Offer>>(`/offers/${id}`, { amount, status: 'PENDING' });
    return res.data;
  },
};
