'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, AlertTriangle, ChevronLeft, Loader2 } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { UserStatusChip } from '@/components/admin/UserStatusChip';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminUsersService,
  displayEmailOf,
  displayPhoneOf,
  isDeleted,
  type AdminUserRow,
  type DeletedFilter,
  type UserStatus,
} from '@/services/admin-users.service';
import type { PageMeta } from '@/services/stores.service';
import { cn } from '@/lib/utils';
import { USER_STATUS_AR, USER_TYPE_AR, UI_AR } from '@/lib/staff-labels';

// ── Filter chips ──────────────────────────────────────────────────────────────────
// Not a work queue: you arrive looking for one specific person, so the default is «الكل»
// rather than a pending bucket. «المحذوفون» flips the backend's `deleted` param instead
// of `status`, since a deleted row's status is BANNED.

type ChipValue = 'ALL' | UserStatus | 'DELETED';

const FILTERS: { value: ChipValue; label: string }[] = [
  { value: 'ALL',                  label: UI_AR.all },
  { value: 'ACTIVE',               label: USER_STATUS_AR.ACTIVE },
  { value: 'SUSPENDED',            label: USER_STATUS_AR.SUSPENDED },
  { value: 'BANNED',               label: USER_STATUS_AR.BANNED },
  { value: 'PENDING_VERIFICATION', label: USER_STATUS_AR.PENDING_VERIFICATION },
  { value: 'DELETED',              label: USER_STATUS_AR.DELETED },
];

function queryFor(chip: ChipValue): { status?: UserStatus; deleted: DeletedFilter } {
  if (chip === 'DELETED') return { deleted: 'only' };
  if (chip === 'ALL') return { deleted: 'exclude' };
  return { status: chip, deleted: 'exclude' };
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  const [term, setTerm]         = useState('');   // what's typed
  const [q, setQ]               = useState('');   // what's sent (debounced)
  const [chip, setChip]         = useState<ChipValue>('ALL');
  const [page, setPage]         = useState(1);
  const [rows, setRows]         = useState<AdminUserRow[]>([]);
  const [meta, setMeta]         = useState<PageMeta | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Debounce the search box — one request per pause, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  // Any change to the query resets to page 1; staying on page 7 of a previous result set
  // shows an empty table and reads as "no matches".
  useEffect(() => { setPage(1); }, [q, chip]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const { status, deleted } = queryFor(chip);
    adminUsersService
      .list({ q: q || undefined, status, deleted, page, limit: 20 })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch((err) => {
        console.error('[AdminUsers] fetch error:', err);
        setError(true);
        setRows([]);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }, [q, chip, page]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  const totalLabel = useMemo(() => {
    if (!meta) return null;
    return `${meta.total} حساب`;
  }, [meta]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
            <p className="text-sm text-gray-500">ابحث عن حساب لمراجعته أو إيقافه.</p>
          </div>
        </div>

        <AdminNav />

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف أو البريد…"
            className="block w-full ps-10 pe-10 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
          />
          {/* Spinner only while a *typed* term is in flight — a plain page load already
              has the skeleton below. */}
          {loading && term && (
            <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white shadow-pebble rounded-card p-1 w-fit max-w-full">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setChip(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                chip === value ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-card shadow-pebble overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-gray-100 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{UI_AR.loadFailed}</p>
            <button onClick={load} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Users className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">لا توجد نتائج.</p>
            <p className="text-xs text-gray-400">
              {q ? `لا يوجد حساب يطابق «${q}».` : 'لا توجد حسابات بهذه الحالة.'}
            </p>
          </div>
        ) : (
          <>
            {totalLabel && <p className="mb-2 text-xs text-gray-500">{totalLabel}</p>}

            {/* Compact table — scanning is the whole job here, so rows beat cards. The
                wrapper scrolls horizontally rather than letting the page do it. */}
            <div className="bg-white rounded-card shadow-pebble overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الاسم</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الهاتف</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">البريد</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">النوع</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الحالة</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الانضمام</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الإعلانات</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => {
                    const phone = displayPhoneOf(u);
                    const email = displayEmailOf(u);
                    const dead  = isDeleted(u);
                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          'border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
                          dead && 'bg-gray-50/60 text-gray-400',
                        )}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${u.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {u.displayName ?? <span className="text-gray-400">بلا اسم</span>}
                          </Link>
                        </td>
                        {/* Tombstoned identifiers are never printed raw — `deleted:<uuid>`
                            in a phone column reads as corrupted data. */}
                        <td className="px-4 py-3" dir="ltr">
                          {phone
                            ? <span className="text-gray-700">{phone}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" dir="ltr">
                          {email
                            ? <span className="text-gray-600">{email}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {USER_TYPE_AR[u.userType] ?? u.userType}
                        </td>
                        <td className="px-4 py-3"><UserStatusChip user={u} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-700">{u.listingCount}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                          >
                            التفاصيل
                            <ChevronLeft className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPrevPage}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {UI_AR.prev}
                </button>
                <span className="text-sm text-gray-600">
                  {UI_AR.page} {meta.page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={!meta.hasNextPage}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {UI_AR.next}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
