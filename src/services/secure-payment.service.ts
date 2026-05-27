import { api } from './api';
import type { ApiResponse, Listing, User } from '@/types';

export type TransactionStatus =
  | 'PENDING'
  | 'PAYMENT_RECEIVED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface SecureTransaction {
  id: string;
  listingId: string;
  listing?: Listing;
  buyerId: string;
  buyer?: User;
  sellerId: string;
  seller?: User;
  amount: number;
  currency: 'SYP' | 'USD';
  status: TransactionStatus;
  trackingNumber?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

type TxEnvelope =
  | SecureTransaction[]
  | { transactions: SecureTransaction[] }
  | { data: SecureTransaction[] };

function extractList(raw: unknown): SecureTransaction[] {
  if (Array.isArray(raw)) return raw as SecureTransaction[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.transactions)) return obj.transactions as SecureTransaction[];
    if (Array.isArray(obj.data))         return obj.data         as SecureTransaction[];
  }
  return [];
}

export const securePaymentService = {
  getBuyingTransactions: async (): Promise<SecureTransaction[]> => {
    const res = await api.get<ApiResponse<TxEnvelope>>('/secure-payment/buying');
    return extractList(res.data);
  },

  getSellingTransactions: async (): Promise<SecureTransaction[]> => {
    const res = await api.get<ApiResponse<TxEnvelope>>('/secure-payment/selling');
    return extractList(res.data);
  },

  confirmDelivery: async (id: string): Promise<SecureTransaction> => {
    const res = await api.patch<ApiResponse<SecureTransaction>>(`/secure-payment/${id}/confirm-delivery`, {});
    return res.data;
  },

  markAsShipped: async (id: string, trackingNumber?: string): Promise<SecureTransaction> => {
    const res = await api.patch<ApiResponse<SecureTransaction>>(`/secure-payment/${id}/ship`, { trackingNumber });
    return res.data;
  },

  cancelTransaction: async (id: string, reason?: string): Promise<SecureTransaction> => {
    const res = await api.patch<ApiResponse<SecureTransaction>>(`/secure-payment/${id}/cancel`, { reason });
    return res.data;
  },
};
