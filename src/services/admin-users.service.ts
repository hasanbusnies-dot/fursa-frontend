import { api } from './api';
import type { PageMeta } from './stores.service';

// ── Admin user moderation (ADMIN, /api/v1/admin/users) ────────────────────────────
// Backend: modules/admin/admin-users.{routes,controller,service}.ts. Four endpoints,
// one envelope: { success, message, data, meta? } — `meta` is a SIBLING of `data`, not
// nested inside it, so the list parser reads both off the root.

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type UserType = 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN' | 'FIELD_AGENT' | 'ACCOUNTANT';
export type AgentStatus = 'ACTIVE' | 'SUSPENDED';
export type WalletStatus = 'ACTIVE' | 'FROZEN';

/** Soft-deleted visibility. Backend defaults to 'exclude' — dead rows stay out of the
 *  everyday moderation list unless asked for. */
export type DeletedFilter = 'exclude' | 'include' | 'only';

/** The append-only history vocabulary (validated in Zod, not a DB enum). */
export type UserStatusAction = 'SUSPEND' | 'BAN' | 'REACTIVATE' | 'SOFT_DELETE' | 'RESTORE';

/** Fields present on BOTH the list row and the detail payload. */
interface AdminUserBase {
  id: string;
  phone: string;
  email: string | null;
  userType: UserType;
  status: UserStatus;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Server-resolved: individual "first last" OR corporate companyName. Null when the
   *  user has neither profile yet — render the phone instead, never a blank cell. */
  displayName: string | null;
  deletedAt: string | null;
  statusReason: string | null;
  statusChangedAt: string | null;
}

export interface AdminUserRow extends AdminUserBase {
  listingCount: number;
}

export interface UserStatusEvent {
  id: string;
  action: UserStatusAction;
  fromStatus: UserStatus;
  toStatus: UserStatus;
  reason: string | null;
  createdAt: string;
  details: unknown;
  actor: { id: string; phone: string; name: string | null } | null;
}

export interface AdminUserDetail extends AdminUserBase {
  statusChangedBy: { id: string; phone: string; name: string | null } | null;
  /** FIELD_AGENT only, null for everyone else. A SECOND, INDEPENDENT switch: reactivating
   *  the account does NOT flip this. Read-only here — no endpoint writes it (see
   *  admin.routes.ts); the panel shows it so an "unfrozen" agent who still cannot work
   *  doesn't look like a bug. */
  agentProfile: { status: AgentStatus; region: string | null; hiredAt: string; note?: string } | null;
  store: { id: string; name: string; status: string } | null;
  stores: { id: string; name: string; status: string }[];
  /** Balance is PRESERVED through freeze and delete — only wallet.status moves. */
  wallet: { status: WalletStatus; balances: { currency: string; balance: string }[] } | null;
  /** Keyed by ListingStatus (ACTIVE, SOLD, …). Absent keys mean zero. */
  listingCounts: Record<string, number>;
  activeSessions: number;
  statusHistory: UserStatusEvent[];
}

/** PATCH /status and DELETE both return the mutated row (never 204). */
export interface AdminUserMutationResult {
  id: string;
  phone: string;
  email: string | null;
  userType: UserType;
  status: UserStatus;
  deletedAt: string | null;
  statusReason: string | null;
  statusChangedAt: string | null;
  displayName: string | null;
}

export interface AdminUserDeleteResult extends AdminUserMutationResult {
  /** The identifiers the tombstone released back into circulation — the operator's
   *  receipt of exactly what a future registrant can now claim. */
  freedIdentifiers: { phone: string; email: string | null };
}

export interface AdminUsersPage {
  data: AdminUserRow[];
  meta: PageMeta;
}

export interface AdminUsersQuery {
  q?: string;
  status?: UserStatus;
  userType?: UserType;
  deleted?: DeletedFilter;
  page?: number;
  limit?: number;
}

// ── Tombstone sentinels ───────────────────────────────────────────────────────────
// On soft delete the backend rewrites phone/email (both @unique) so the identifiers are
// freed for a future registrant — a recycled Syrian number must not be locked forever by
// a dead row. The formats are keyed on the uuid, so they can never collide:
//   phone → `deleted:<id>`
//   email → `deleted+<id>@deleted.forsa.invalid`   (.invalid = RFC 2606, unroutable)
// `deletedAt` is the authoritative signal; these prefixes are a belt-and-braces guard so
// a raw sentinel can never leak into a table cell.

const TOMBSTONE_PHONE_PREFIX = 'deleted:';
const TOMBSTONE_EMAIL_PREFIX = 'deleted+';

export function isDeleted(u: { deletedAt: string | null }): boolean {
  return !!u.deletedAt;
}

/** The phone to SHOW — null once tombstoned, so callers render «محذوف» not `deleted:uuid`. */
export function displayPhoneOf(u: { phone: string; deletedAt: string | null }): string | null {
  if (isDeleted(u) || u.phone.startsWith(TOMBSTONE_PHONE_PREFIX)) return null;
  return u.phone;
}

/** The email to SHOW — null once tombstoned. */
export function displayEmailOf(u: { email: string | null; deletedAt: string | null }): string | null {
  if (!u.email) return null;
  if (isDeleted(u) || u.email.startsWith(TOMBSTONE_EMAIL_PREFIX)) return null;
  return u.email;
}

/** Moderation is refused server-side (403) for ADMIN targets and for self. Mirrored in the
 *  UI so the buttons never appear — the server check is the control, this is the courtesy. */
export function canModerate(target: { id: string; userType: UserType }, actingAdminId?: string): boolean {
  if (target.userType === 'ADMIN') return false;
  if (actingAdminId && target.id === actingAdminId) return false;
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────────

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1, // unknown total → infer "is there a next page?"
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

/** Pull data[] + meta off the envelope root. Mirrors parsePage() in stores.service.ts;
 *  the backend always sends meta here, the fallback is defensive only. */
function parsePage(res: unknown, page: number, limit: number): AdminUsersPage {
  const r = (res ?? {}) as { data?: AdminUserRow[]; items?: AdminUserRow[]; meta?: PageMeta };
  const items = Array.isArray(r.data) ? r.data
    : Array.isArray(r.items) ? r.items
    : Array.isArray(res) ? (res as AdminUserRow[])
    : [];
  return { data: items, meta: r.meta ?? deriveMeta(items.length, page, limit) };
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

export const adminUsersService = {
  /** Paginated + searchable. `q` matches phone, email, first/last name and companyName
   *  (backend ORs them, case-insensitive) — send the raw term, never pre-parse it. */
  list: async (query: AdminUsersQuery = {}): Promise<AdminUsersPage> => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query.q) qs.set('q', query.q);
    if (query.status) qs.set('status', query.status);
    if (query.userType) qs.set('userType', query.userType);
    if (query.deleted) qs.set('deleted', query.deleted);

    const res = await api.get<unknown>(`/admin/users?${qs.toString()}`);
    return parsePage(res, page, limit);
  },

  getUser: async (id: string): Promise<AdminUserDetail> => {
    const res = await api.get<unknown>(`/admin/users/${id}`);
    return unwrap<AdminUserDetail>(res);
  },

  /** Freeze / ban / reactivate. `reason` is REQUIRED by the backend for SUSPENDED and
   *  BANNED (400 otherwise) and ignored for ACTIVE.
   *
   *  ACTIVE on a soft-deleted account performs a full RESTORE — it clears deletedAt and
   *  puts the tombstoned phone/email back, which is why DELETE has no sibling un-delete
   *  route. That restore 409s if the original number has since been claimed by someone
   *  else; surface the server message rather than swallowing it. */
  updateStatus: async (
    id: string,
    payload: { status: Exclude<UserStatus, 'PENDING_VERIFICATION'>; reason?: string },
  ): Promise<AdminUserMutationResult> => {
    const res = await api.patch<unknown>(`/admin/users/${id}/status`, payload);
    return unwrap<AdminUserMutationResult>(res);
  },

  /** SOFT delete: nothing is removed. Sets deletedAt + status BANNED, tombstones the
   *  identifiers, freezes store + wallet, hides listings; the accounting ledger is
   *  untouched. `reason` is always required.
   *
   *  DELETE carries a JSON body, which api.delete() has no body parameter for — it is
   *  passed through ApiOptions (extends RequestInit), which request() spreads into fetch. */
  softDelete: async (id: string, reason: string): Promise<AdminUserDeleteResult> => {
    const res = await api.delete<unknown>(`/admin/users/${id}`, {
      body: JSON.stringify({ reason }),
    });
    return unwrap<AdminUserDeleteResult>(res);
  },
};
