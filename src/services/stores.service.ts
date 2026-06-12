import { api } from './api';
import type { CreateListingPayload, ListingCreatedResponse } from './listings.service';

// ── Store domain (AP-M2 / AP-M3) ────────────────────────────────────────────────
// Agent-registered corporate stores that go through admin approval. Shared by the
// FIELD_AGENT panel (register + my-stores + detail/membership/listings) and the
// ADMIN review queue.
//
// Paths are relative to NEXT_PUBLIC_API_URL (already ends in /api/v1) → /agent/...
// and /admin/.... Methods propagate ApiError so callers can branch on `.status`
// (400 missing-photo / non-corporate phone, 403 role/cap, 409 not-approved,
// 422 insufficient-balance / second-free).

export type StoreStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type CompanyType =
  | 'REAL_ESTATE_AGENCY'
  | 'CAR_SHOWROOM'
  | 'STORE'
  | 'SERVICES'
  | 'OTHER';

/** A store document. `url` is a ready-to-use signed (time-limited) URL. */
export interface StoreDocument {
  id: string;
  type: string;          // 'CONTRACT' is the photographed signed paper contract
  capturedAt: string;
  url: string;
}

/** A registered store. Fields are read defensively in the UI — the backend may nest
 *  owner / registering-agent or name the signed contract URL differently, so optional
 *  shapes here are deliberate. */
export interface Store {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  governorate?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  companyType?: CompanyType | null;
  status: StoreStatus;
  rejectionReason?: string | null;
  createdAt: string;

  // Set on the registration response: true ⇒ the backend emailed the owner a
  // single-use 24h password-setup link (owner-onboarding, AP-M2.1).
  ownerOnboarded?: boolean;

  // Documents (incl. the CONTRACT photo). Each `url` is a ready-to-use signed URL.
  // `contractUrlOf()` pulls the CONTRACT one. Same shape on every store endpoint.
  documents?: StoreDocument[];

  // Owner / registering-agent may arrive nested (admin list) instead of flat.
  owner?: { id?: string; name?: string; phone?: string } | null;
  agent?: { id?: string; name?: string; phone?: string } | null;
  registeredBy?: { id?: string; name?: string; phone?: string } | null;
}

export interface RegisterStoreInput {
  name: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string; // REQUIRED — backend emails the owner a password-setup link
  address?: string;
  city?: string;
  governorate?: string;
  companyType?: CompanyType;
  contract: File; // the photographed signed paper contract (camera capture)
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StoresPage {
  data: Store[];
  meta: PageMeta;
}

export interface UpdateStatusInput {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string; // required on REJECT (enforced by the UI + backend 400)
}

/** Response of resend-setup-link. 409 (owner already activated) is thrown as ApiError. */
export interface ResendSetupLinkResult {
  resent: boolean;
}

// ── Membership (AP-M3) ────────────────────────────────────────────────────────────

export type MembershipCampaign = 'FULL_PRICE' | 'FIRST_MONTH_FREE' | 'DISCOUNT_33';
export type MembershipMethod = 'ONLINE' | 'CASH' | 'FREE';

/** Membership block returned inside the store detail. */
export interface Membership {
  status?: string | null;          // e.g. ACTIVE / EXPIRED / NONE
  paidUntil?: string | null;
  daysRemaining?: number | null;
  campaign?: MembershipCampaign | null;
  badge?: boolean;                 // true ⇒ member-active (the "verified" badge)
  // Month-by-month renewal rule: an ACTIVE membership is only renewable within its
  // final N days (backend default 7). renewAllowed false ⇒ a charge would 409.
  // NOTE: separate from the AP-M4 dashboard's UPCOMING state (≤14 days) — gate
  // buttons on this flag only, never derive from daysRemaining.
  renewAllowed?: boolean;
  renewableFrom?: string | null;   // when the window opens; null when already renewable
}

/** A single membership charge in the store's history. Amounts are money STRINGS. */
export interface MembershipCharge {
  id: string;
  campaign?: string | null;
  method?: string | null;
  amount?: string | null;          // STRING
  currency?: string | null;        // USD
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
  // CASH charges carry the funding collection + its signed receipt-photo URL.
  // receiptUrl is short-lived (5-min TTL) — render on load, never cache.
  agentCashCollectionId?: string | null;
  receiptUrl?: string | null;
}

/** Store detail = the store + its membership block + charge history. */
export interface StoreDetail extends Store {
  membership?: Membership | null;
  charges?: MembershipCharge[];
}

export interface ChargeMembershipInput {
  campaign: MembershipCampaign;
  method: MembershipMethod;
  idempotencyKey: string;          // client-generated UUID per attempt
  paymentRef?: string;
  agentCashCollectionId?: string;  // required for CASH (from the prior topup)
}

// Campaign pricing (USD, money-STRINGS). NOTE: the GET membership block does not
// return the price, so these mirror the AP-M3 contract: full 75, 33%-off 50.25,
// first month free 0. If the backend makes these configurable, surface them from
// the API instead of this map.
export const MEMBERSHIP_CAMPAIGNS: Record<
  MembershipCampaign,
  { label: string; price: string; currency: 'USD' }
> = {
  FULL_PRICE:       { label: 'السعر الكامل',        price: '75',    currency: 'USD' },
  DISCOUNT_33:      { label: 'خصم 33٪',             price: '50.25', currency: 'USD' },
  FIRST_MONTH_FREE: { label: 'الشهر الأول مجاناً',  price: '0',     currency: 'USD' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

function unwrap<T>(res: unknown): T | undefined {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1, // unknown total → infer "is there a next page?"
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

/** Pull the data[] + meta out of whatever envelope the backend returns. */
function parsePage(res: unknown, page: number, limit: number): StoresPage {
  const r = (res ?? {}) as { data?: Store[]; items?: Store[]; meta?: PageMeta };
  const items = Array.isArray(r.data) ? r.data
    : Array.isArray(r.items) ? r.items
    : Array.isArray(res) ? (res as Store[])
    : [];
  const meta = r.meta ?? deriveMeta(items.length, page, limit);
  return { data: items, meta };
}

/** The signed contract-photo URL from the store's documents[] (ready for <img src>). */
export function contractUrlOf(store: Store): string | null {
  return store.documents?.find((d) => d.type === 'CONTRACT')?.url ?? null;
}

/** The owner's user id — needed to fund the owner's USD wallet for a CASH charge.
 *  Read defensively: the backend may expose it under owner.id / owner.userId /
 *  ownerUserId / ownerId. Returns null when it can't be resolved (caller falls back
 *  to a phone lookup). */
export function ownerUserIdOf(store: Store): string | null {
  const s = store as Store & {
    ownerUserId?: string; ownerId?: string;
    owner?: { id?: string; userId?: string } | null;
  };
  return s.owner?.id ?? s.owner?.userId ?? s.ownerUserId ?? s.ownerId ?? null;
}

/** Whether the store owner still needs to set their password (account not yet
 *  activated via the emailed link). The store/detail response may not expose this
 *  yet — read defensively across likely keys and DEFAULT TO pending (show the resend
 *  button) when unknown, relying on the resend endpoint's 409 to correct an
 *  owner who has already activated. */
export function ownerPendingOf(store: Store): boolean {
  const s = store as Store & {
    ownerActivated?: boolean;
    ownerIsVerified?: boolean;
    owner?: { isVerified?: boolean; activated?: boolean; passwordSetAt?: string | null } | null;
  };
  const activated =
    s.owner?.isVerified ??
    s.owner?.activated ??
    s.ownerActivated ??
    s.ownerIsVerified ??
    (s.owner?.passwordSetAt != null ? true : undefined);
  return typeof activated === 'boolean' ? !activated : true;
}

/** Pull the membership charge history out of whatever key the detail uses. */
export function chargesOf(detail: StoreDetail): MembershipCharge[] {
  const d = detail as StoreDetail & {
    chargeHistory?: MembershipCharge[];
    membershipCharges?: MembershipCharge[];
    history?: MembershipCharge[];
  };
  return d.charges ?? d.chargeHistory ?? d.membershipCharges ?? d.history ?? [];
}

// ── Agent service (FIELD_AGENT) ───────────────────────────────────────────────────

export const agentStoresService = {
  /** Register a store from the field: multipart with the photographed contract.
   *  Propagates ApiError(400) for missing photo / non-corporate owner phone. */
  registerStore: async (input: RegisterStoreInput): Promise<Store> => {
    const fd = new FormData();
    fd.append('name', input.name);
    fd.append('ownerName', input.ownerName);
    fd.append('ownerPhone', input.ownerPhone);
    fd.append('ownerEmail', input.ownerEmail); // required — drives owner-onboarding email
    if (input.address)     fd.append('address', input.address);
    if (input.city)        fd.append('city', input.city);
    if (input.governorate) fd.append('governorate', input.governorate);
    if (input.companyType) fd.append('companyType', input.companyType);
    fd.append('contract', input.contract); // the file field name the backend expects

    const res = await api.uploadForm<unknown>('/agent/stores', fd);
    return unwrap<Store>(res) as Store;
  },

  /** The agent's own registered stores, newest-first. */
  getStores: async (q: { page?: number; limit?: number } = {}): Promise<StoresPage> => {
    const page  = q.page  ?? 1;
    const limit = q.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await api.get<unknown>(`/agent/stores?${qs.toString()}`);
    return parsePage(res, page, limit);
  },

  /** One of the agent's own stores: detail + membership block + charge history. */
  getStore: async (id: string): Promise<StoreDetail> => {
    const res = await api.get<unknown>(`/agent/stores/${id}`);
    return unwrap<StoreDetail>(res) as StoreDetail;
  },

  /** Charge (activate / renew) a store's membership. For CASH the caller must first
   *  fund the owner's USD wallet via agentService.createTopup and pass the resulting
   *  collection id as agentCashCollectionId. Propagates ApiError: 422 insufficient
   *  USD / second free, 403 frozen, 409 store not APPROVED. */
  chargeMembership: async (id: string, input: ChargeMembershipInput): Promise<StoreDetail> => {
    const res = await api.post<unknown>(`/agent/stores/${id}/membership/charge`, input);
    return unwrap<StoreDetail>(res) as StoreDetail;
  },

  /** Resend the owner's single-use password-setup link (agent, own store).
   *  Propagates ApiError: 409 if the owner has already activated their account. */
  resendOwnerSetupLink: async (id: string): Promise<ResendSetupLinkResult> => {
    const res = await api.post<unknown>(`/agent/stores/${id}/owner/resend-setup-link`, {});
    return (unwrap<ResendSetupLinkResult>(res) as ResendSetupLinkResult) ?? { resent: true };
  },

  /** Create a listing on behalf of the store owner (AP-M3b). Same payload as the
   *  regular listing form; cap is the owner's (member-active ⇒ unlimited, else 403). */
  createListing: async (
    id: string,
    payload: CreateListingPayload,
  ): Promise<ListingCreatedResponse> => {
    const res = await api.post<unknown>(`/agent/stores/${id}/listings`, payload);
    return unwrap<ListingCreatedResponse>(res) as ListingCreatedResponse;
  },
};

// ── Admin service (ADMIN) ─────────────────────────────────────────────────────────

export const adminStoresService = {
  /** All stores, optionally filtered by status. */
  getStores: async (
    q: { status?: StoreStatus; page?: number; limit?: number } = {},
  ): Promise<StoresPage> => {
    const page  = q.page  ?? 1;
    const limit = q.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.status) qs.set('status', q.status);
    const res = await api.get<unknown>(`/admin/stores?${qs.toString()}`);
    return parsePage(res, page, limit);
  },

  /** Full store detail (admin view): status, contract, membership block, charge
   *  history with signed CASH receipt URLs, registering agent. Same shape as the
   *  agent detail endpoint. */
  getStore: async (id: string): Promise<StoreDetail> => {
    const res = await api.get<unknown>(`/admin/stores/${id}`);
    return unwrap<StoreDetail>(res) as StoreDetail;
  },

  /** Approve / reject a store. rejectionReason is required when status is REJECTED. */
  updateStatus: async (id: string, input: UpdateStatusInput): Promise<Store> => {
    const res = await api.patch<unknown>(`/admin/stores/${id}/status`, input);
    return unwrap<Store>(res) as Store;
  },

  /** Resend the owner's single-use password-setup link (admin override).
   *  Propagates ApiError: 409 if the owner has already activated their account. */
  resendOwnerSetupLink: async (id: string): Promise<ResendSetupLinkResult> => {
    const res = await api.post<unknown>(`/admin/stores/${id}/owner/resend-setup-link`, {});
    return (unwrap<ResendSetupLinkResult>(res) as ResendSetupLinkResult) ?? { resent: true };
  },
};

// ── Owner service (CORPORATE store owner, AP-M2.4) ─────────────────────────────────

export interface OwnerChargeMembershipInput {
  idempotencyKey: string; // client-generated UUID per attempt
  paymentRef?: string;
}

export const ownerStoreService = {
  /** The logged-in owner's own store: same detail shape as the agent endpoint
   *  (status, membership block, charge history with signed receipts, documents).
   *  Propagates ApiError(404) when the corporate user has no store. */
  getStore: async (): Promise<StoreDetail> => {
    const res = await api.get<unknown>('/owner/store');
    return unwrap<StoreDetail>(res) as StoreDetail;
  },

  /** Self-serve membership payment: always FULL_PRICE / ONLINE, debited from the
   *  owner's USD wallet (funded via the consumer online top-up). Propagates ApiError:
   *  422 insufficient USD balance, 409 store not APPROVED, 403 wallet frozen. */
  chargeMembership: async (input: OwnerChargeMembershipInput): Promise<StoreDetail> => {
    const res = await api.post<unknown>('/owner/store/membership/charge', {
      campaign: 'FULL_PRICE',
      ...input,
    });
    return unwrap<StoreDetail>(res) as StoreDetail;
  },
};
