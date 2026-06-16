import { api } from './api';

// ── Manual transfer top-up (AP-M6) ─────────────────────────────────────────────────
// User transfers money to our Sham-Cash (etc.) account, tags it with a referenceCode,
// then claims it; an admin matches the code + proof against the real account and
// confirms, which credits the wallet. Money fields are STRINGS — render via
// src/lib/money.ts, never Number().

export type TransferMethod = 'SHAM_CASH' | 'MTN_CASH' | 'SYRIATEL_CASH';

export type TransferStatus =
  | 'INITIATED'              // created, user hasn't claimed yet
  | 'PENDING_VERIFICATION'   // user claimed → in the admin queue
  | 'CONFIRMED'              // admin confirmed → wallet credited
  | 'REJECTED';

/** A row in the method picker. Sham Cash isActive; MTN/Syriatel come as comingSoon. */
export interface TransferMethodOption {
  method: TransferMethod;
  label: string;
  address: string;
  qrUrl?: string | null;
  isActive: boolean;
  comingSoon: boolean;
}

/** Result of initiating a transfer — what the instructions screen renders. */
export interface TransferInitiated {
  transferId: string;
  method: TransferMethod;
  amount: string;            // STRING
  currency: string;
  receivingAccount: string;
  qrUrl?: string | null;
  referenceCode: string;     // the user MUST put this in their transfer note
  instructions: string;
  methods?: TransferMethodOption[];
}

/** A row in the user's own transfer history. */
export interface TransferHistoryRow {
  id: string;
  status: TransferStatus;
  amount: string;            // STRING
  currency?: string;
  method: TransferMethod;
  referenceCode: string;
  createdAt: string;
  proofUrl?: string | null;  // signed, time-limited proof screenshot URL
}

/** A row in the admin verification queue. */
export interface AdminTransferRow {
  id: string;
  user: { id?: string; name?: string; phone?: string; email?: string } | null;
  method: TransferMethod;
  receivingAccount: string;
  amount: string;            // STRING
  currency?: string;
  referenceCode: string;
  userReference?: string | null;
  claimedAt: string;
  proofUrl?: string | null;  // signed, time-limited proof screenshot URL
}

export interface ConfirmTransferResult {
  transfer: AdminTransferRow;
  balanceAfter?: string;     // STRING — the credited wallet's new balance
  currency?: string;
}

export interface ClaimTransferInput {
  receipt?: File;            // optional proof screenshot (multipart "receipt")
  userReference?: string;    // optional note
}

// ── Envelope helper (value may be at root or under `data`) ──────────────────────────

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

/** Pull a list out of {data:[]} | {items:[]} | [] tolerantly. */
function unwrapList<T>(res: unknown): T[] {
  const r = (res ?? {}) as { data?: T[]; items?: T[] };
  if (Array.isArray(r.data)) return r.data;
  if (Array.isArray(r.items)) return r.items;
  if (Array.isArray(res)) return res as T[];
  return [];
}

// ── User service ──────────────────────────────────────────────────────────────────

export const walletTransfersService = {
  /** The method picker (Sham Cash active; MTN/Syriatel coming soon). */
  getMethods: async (): Promise<TransferMethodOption[]> => {
    const res = await api.get<unknown>('/wallet/transfers/methods');
    return unwrapList<TransferMethodOption>(res);
  },

  /** Initiate a transfer → receiving account + referenceCode + instructions. */
  initiate: async (input: { method: TransferMethod; amount: string; currency: string }): Promise<TransferInitiated> => {
    const res = await api.post<unknown>('/wallet/transfers', input);
    return unwrap<TransferInitiated>(res);
  },

  /** "I transferred" → INITIATED → PENDING_VERIFICATION. Multipart so the optional
   *  proof screenshot rides along under "receipt". Propagates ApiError(409) if already
   *  claimed. */
  claim: async (id: string, input: ClaimTransferInput = {}): Promise<TransferHistoryRow> => {
    const fd = new FormData();
    if (input.receipt)        fd.append('receipt', input.receipt);
    if (input.userReference)  fd.append('userReference', input.userReference);
    const res = await api.uploadForm<unknown>(`/wallet/transfers/${id}/claim`, fd);
    return unwrap<TransferHistoryRow>(res);
  },

  /** The user's own transfer history, newest-first (backend order). */
  getHistory: async (): Promise<TransferHistoryRow[]> => {
    const res = await api.get<unknown>('/wallet/transfers');
    return unwrapList<TransferHistoryRow>(res);
  },
};

// ── Admin service ───────────────────────────────────────────────────────────────────

export const adminTransfersService = {
  /** The verification queue (defaults to PENDING_VERIFICATION). */
  list: async (status: TransferStatus = 'PENDING_VERIFICATION'): Promise<AdminTransferRow[]> => {
    const qs = new URLSearchParams({ status });
    const res = await api.get<unknown>(`/admin/transfers?${qs.toString()}`);
    return unwrapList<AdminTransferRow>(res);
  },

  /** Confirm a transfer → credits the user's wallet. Returns the transfer + new balance. */
  confirm: async (id: string): Promise<ConfirmTransferResult> => {
    const res = await api.post<unknown>(`/admin/transfers/${id}/confirm`, {});
    return unwrap<ConfirmTransferResult>(res);
  },

  /** Reject a transfer with a reason. */
  reject: async (id: string, reason: string): Promise<AdminTransferRow> => {
    const res = await api.post<unknown>(`/admin/transfers/${id}/reject`, { reason });
    return unwrap<AdminTransferRow>(res);
  },
};
