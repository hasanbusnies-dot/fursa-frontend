import { api } from './api';
import type { PageMeta } from './stores.service';

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
  accountName?: string | null; // recipient/holder name (null while coming soon)
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
  accountName?: string | null; // recipient/holder name shown above the account line
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

/** A row in the ACCOUNTANT transfer queue (/accounting/transfers). Like the admin
 *  row, plus the verification outcome (status + who confirmed/rejected + when). */
export interface AccountingTransferRow {
  id: string;
  user: { id?: string; name?: string | null; phone?: string | null } | null;
  method: TransferMethod;
  currency?: string;
  amount: string;            // STRING
  receivingAccount: string;
  referenceCode: string;
  userReference?: string | null;
  proofUrl?: string | null;  // signed, time-limited proof screenshot URL
  status: TransferStatus;
  confirmedById?: string | null;
  confirmedByName?: string | null; // who confirmed/rejected — audit column
  confirmedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface AccountingTransfersPage {
  data: AccountingTransferRow[];
  meta: PageMeta;
}

/** Result of confirming an accounting transfer (credits the wallet). */
export interface AccountingConfirmResult {
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

// ── Accounting service (ACCOUNTANT/ADMIN, /api/v1/accounting) ────────────────────────

export const accountingTransfersService = {
  /** The accounting transfer queue. No status ⇒ pending; 'ALL' ⇒ full history; or a
   *  specific status. Paginated. */
  list: async (
    status: TransferStatus | 'ALL' = 'PENDING_VERIFICATION',
    page = 1,
    limit = 20,
  ): Promise<AccountingTransfersPage> => {
    const qs = new URLSearchParams({ status, page: String(page), limit: String(limit) });
    const res = await api.get<unknown>(`/accounting/transfers?${qs.toString()}`);
    const r = (res ?? {}) as { data?: AccountingTransferRow[]; items?: AccountingTransferRow[]; meta?: PageMeta };
    const items = Array.isArray(r.data) ? r.data
      : Array.isArray(r.items) ? r.items
      : Array.isArray(res) ? (res as AccountingTransferRow[]) : [];
    const meta: PageMeta = r.meta ?? {
      total: items.length, page, limit,
      totalPages: items.length < limit ? page : page + 1,
      hasNextPage: items.length >= limit,
      hasPrevPage: page > 1,
    };
    return { data: items, meta };
  },

  /** Confirm a transfer → credits the user's wallet (same chokepoint as admin). */
  confirm: async (id: string): Promise<AccountingConfirmResult> => {
    const res = await api.post<unknown>(`/accounting/transfers/${id}/confirm`, {});
    return unwrap<AccountingConfirmResult>(res);
  },

  /** Reject a transfer with a reason. */
  reject: async (id: string, reason: string): Promise<void> => {
    await api.post<unknown>(`/accounting/transfers/${id}/reject`, { reason });
  },
};
