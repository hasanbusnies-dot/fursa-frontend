import { api, ApiError } from './api';
import type { PageMeta } from './stores.service';

// ── Listing reports (الإبلاغ عن إعلان مخالف) ──────────────────────────────────────
// Backend: modules/reports/*. Reporting is logged-in only (router-level requireAuth);
// that plus @@unique(reporterId, listingId) and a 20/hour per-USER limiter is the abuse
// control, which is why there is no anonymous path.

export const REPORT_REASONS = [
  'SPAM',
  'FAKE_LISTING',
  'INAPPROPRIATE_CONTENT',
  'WRONG_CATEGORY',
  'PRICE_MANIPULATION',
  'OTHER',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * Arabic labels are SERVED, not hardcoded here.
 *
 * GET /reports/reasons returns [{ value, labelAr }] — the same {value,label} shape the
 * catalog uses, and for the same reason: a parallel copy in the frontend silently drifts
 * from the backend's wording. It already did once (this file used to hardcode «محتوى
 * مخالف» while the backend said «محتوى غير لائق»), and the aggregated admin queue embeds
 * the backend's labels in its own payload, so the two surfaces would have disagreed about
 * the same report. Render what is served.
 */
export interface ReportReasonOption {
  value: ReportReason;
  labelAr: string;
}

// The backend rejects a details string shorter than 10 chars — optional, but NOT
// "any length". Mirrored so the user gets Arabic instead of an English 400.
export const REPORT_DETAILS_MIN = 10;
export const REPORT_DETAILS_MAX = 1000;

/** PENDING is the creation default; RESOLVED is deprecated (never written again). */
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED' | 'ACTIONED';

export interface Report {
  id: string;
  listingId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface CreateReportPayload {
  reason: ReportReason;
  /** Omit entirely when blank — never send '' (min(10) would reject it). */
  details?: string;
}

/** 409: already reported this listing (@@unique). Expected outcome, own copy. */
export function isAlreadyReported(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

/** 400: reporting your own listing. The button is hidden for owners; belt-and-braces. */
export function isOwnListing(err: unknown): boolean {
  return err instanceof ApiError && err.status === 400;
}

/** 429: the per-user limiter (20/hour). The server's message is already Arabic. */
export function isRateLimited(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

export const reportsService = {
  /** The reason picker vocabulary. Static server-side — safe to fetch per dialog open. */
  getReasons: async (): Promise<ReportReasonOption[]> => {
    const res = await api.get<unknown>('/reports/reasons');
    return unwrap<ReportReasonOption[]>(res) ?? [];
  },

  /** 201 on success. Throws: 404 gone, 400 own listing, 409 duplicate, 429 rate limited. */
  create: async (listingId: string, payload: CreateReportPayload): Promise<Report> => {
    const body: CreateReportPayload = {
      reason: payload.reason,
      ...(payload.details?.trim() ? { details: payload.details.trim() } : {}),
    };
    const res = await api.post<unknown>(`/reports/${listingId}`, body);
    return unwrap<Report>(res);
  },
};

// ── Admin queue (ADMIN, /api/v1/admin/reports) ────────────────────────────────────

/** The roll-up badge on a queue row: anything still open outranks a finished verdict. */
export type QueueStatus = 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

/** Statuses an admin can move reports TO. PENDING is the default and RESOLVED deprecated,
 *  so neither is settable. */
export const REPORT_RESOLUTIONS = ['REVIEWED', 'DISMISSED', 'ACTIONED'] as const;
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];

/** What to do with the reported listing itself; delegates to existing moderation. */
export const LISTING_ACTIONS = ['NONE', 'REJECT', 'DELETE'] as const;
export type ListingAction = (typeof LISTING_ACTIONS)[number];

export interface ReportedSeller {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  deletedAt: string | null;
}

export interface QueueListing {
  id: string;
  listingNumber: number | string | null;
  title: string;
  status: string;
  price: string;
  currency: string;
  city: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  seller: ReportedSeller;
}

export interface ReportQueueRow {
  listingId: string;
  reportCount: number;
  distinctReporters: number;
  lastReportedAt: string;
  /** Sorted heaviest-first; labelAr comes from the backend. */
  reasons: { value: ReportReason; labelAr: string; count: number }[];
  queueStatus: QueueStatus;
  /** null when the listing row vanished (FK CASCADE) — render "no longer exists". */
  listing: QueueListing | null;
}

export interface ReportsQueuePage {
  data: ReportQueueRow[];
  meta: PageMeta;
}

export interface ReportDetailEntry {
  id: string;
  reason: ReportReason;
  reasonLabelAr: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
  reporter: { id: string; phone: string; name: string | null };
  reviewedBy: { id: string; phone: string; name: string | null } | null;
}

export interface ReportsDetail {
  listing: {
    id: string;
    listingNumber: number | string | null;
    title: string;
    description: string | null;
    status: string;
    price: string;
    currency: string;
    city: string | null;
    createdAt: string;
    images: string[];
    seller: ReportedSeller & { email: string | null };
  };
  reportCount: number;
  /** Reports still awaiting a decision. Zero ⇒ the resolve call would 409. */
  openCount: number;
  reports: ReportDetailEntry[];
}

export interface ResolveReportsPayload {
  resolution: ReportResolution;
  /** ACTIONED requires REJECT or DELETE; REVIEWED/DISMISSED require NONE (server-refined). */
  listingAction?: ListingAction;
  note?: string;
}

export interface ResolveReportsResult {
  listingId: string;
  resolution: ReportResolution;
  reportsResolved: number;
  listingAction: ListingAction;
  listingStatus: string;
  reportersNotified: number;
}

export interface AdminReportsQuery {
  /** Filters the REPORTS; a listing surfaces when it has >=1 report in that state. */
  status?: QueueStatus | 'ALL';
  reason?: ReportReason;
  page?: number;
  limit?: number;
}

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1,
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

function parsePage(res: unknown, page: number, limit: number): ReportsQueuePage {
  const r = (res ?? {}) as { data?: ReportQueueRow[]; items?: ReportQueueRow[]; meta?: PageMeta };
  const items = Array.isArray(r.data) ? r.data
    : Array.isArray(r.items) ? r.items
    : Array.isArray(res) ? (res as ReportQueueRow[])
    : [];
  return { data: items, meta: r.meta ?? deriveMeta(items.length, page, limit) };
}

/** 409 on resolve: every report on the listing was already closed by someone else. */
export function isAlreadyResolved(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export const adminReportsService = {
  /** Aggregated BY LISTING — ten reports on one listing is ONE row with count 10.
   *  Defaults to PENDING server-side: this IS a work queue. */
  queue: async (query: AdminReportsQuery = {}): Promise<ReportsQueuePage> => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query.status) qs.set('status', query.status);
    if (query.reason) qs.set('reason', query.reason);

    const res = await api.get<unknown>(`/admin/reports?${qs.toString()}`);
    return parsePage(res, page, limit);
  },

  /** Every report on one listing. 404 when the listing is gone OR has no reports. */
  getDetail: async (listingId: string): Promise<ReportsDetail> => {
    const res = await api.get<unknown>(`/admin/reports/${listingId}`);
    return unwrap<ReportsDetail>(res);
  },

  /**
   * Resolves EVERY open report on the listing in one call — ten reports is one decision.
   *
   * The listing action is delegated server-side to the existing moderation paths
   * (updateStatus REJECTED / adminRemove), so the seller still gets the same Arabic
   * notification they would from /admin/listings. Reporters are notified on ACTIONED
   * only — a "we dismissed your report" message invites an argument and gives the user
   * nothing to act on.
   */
  resolve: async (listingId: string, payload: ResolveReportsPayload): Promise<ResolveReportsResult> => {
    const body: ResolveReportsPayload = {
      resolution: payload.resolution,
      listingAction: payload.listingAction ?? 'NONE',
      ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
    };
    const res = await api.patch<unknown>(`/admin/reports/${listingId}`, body);
    return unwrap<ResolveReportsResult>(res);
  },
};
