'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flag, AlertTriangle, ChevronLeft, ImageOff } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { ReportStatusChip, REPORT_STATUS_AR } from '@/components/admin/ReportStatusChip';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminReportsService,
  type QueueStatus,
  type ReportQueueRow,
} from '@/services/reports.service';
import type { PageMeta } from '@/services/stores.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { LISTING_STATUS_AR, UI_AR } from '@/lib/staff-labels';

// Filter chips. Default PENDING — unlike /admin/users this IS a work queue, so it opens
// on "listings awaiting a decision", matching the stores queue.
const FILTERS: { value: QueueStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING',   label: REPORT_STATUS_AR.PENDING },
  { value: 'REVIEWED',  label: REPORT_STATUS_AR.REVIEWED },
  { value: 'ACTIONED',  label: REPORT_STATUS_AR.ACTIONED },
  { value: 'DISMISSED', label: REPORT_STATUS_AR.DISMISSED },
  { value: 'ALL',       label: UI_AR.all },
];

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Thumb({ url, title }: { url: string | null; title: string }) {
  if (!url) {
    return (
      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageOff className="w-4 h-4 text-gray-300" />
      </div>
    );
  }
  // Plain <img>, matching ListingCard: listing media is served from Supabase and the
  // project configures no next/image remotePatterns.
  return (
    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
      <img src={url} alt={title} className="w-full h-full object-cover" />
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  const [filter, setFilter]   = useState<QueueStatus | 'ALL'>('PENDING');
  const [page, setPage]       = useState(1);
  const [rows, setRows]       = useState<ReportQueueRow[]>([]);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  useEffect(() => { setPage(1); }, [filter]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminReportsService
      .queue({ status: filter, page, limit: 20 })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch((err) => {
        console.error('[AdminReports] fetch error:', err);
        setError(true);
        setRows([]);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Flag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">البلاغات</h1>
            <p className="text-sm text-gray-500">بلاغات عن إعلانات مخالفة — مجمّعة حسب الإعلان.</p>
          </div>
        </div>

        <AdminNav />

        <div className="flex flex-wrap gap-1 mb-6 bg-white shadow-pebble rounded-card p-1 w-fit max-w-full">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                filter === value ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-card shadow-pebble overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 border-b border-gray-100 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{UI_AR.loadFailed}</p>
            <button onClick={load} className="text-xs font-semibold text-red-600 hover:text-red-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Flag className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">لا توجد بلاغات.</p>
            <p className="text-xs text-gray-400">لا توجد بلاغات بهذه الحالة.</p>
          </div>
        ) : (
          <>
            {meta && <p className="mb-2 text-xs text-gray-500">{meta.total} إعلان مُبلَّغ عنه</p>}

            <div className="bg-white rounded-card shadow-pebble overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الإعلان</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">البلاغات</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الأسباب</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">حالة الإعلان</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">الحالة</th>
                    <th className="text-start font-semibold text-gray-600 text-xs px-4 py-3">آخر بلاغ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.listingId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {/* listing is null only if the row vanished under us (FK CASCADE) —
                            say so rather than rendering an empty cell. */}
                        {row.listing ? (
                          <div className="flex items-center gap-3 min-w-0">
                            <Thumb url={row.listing.thumbnailUrl} title={row.listing.title} />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/reports/${row.listingId}`}
                                className="block font-semibold text-gray-900 hover:text-red-600 transition-colors truncate max-w-[240px]"
                              >
                                {row.listing.title}
                              </Link>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatMoney(row.listing.price, row.listing.currency)}
                                {row.listing.city ? ` · ${row.listing.city}` : ''}
                              </p>
                              {row.listing.seller.name && (
                                <p className="text-[11px] text-gray-400 truncate max-w-[240px]">
                                  البائع: {row.listing.seller.name}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">الإعلان لم يعد موجوداً</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          {row.reportCount}
                        </span>
                        {row.distinctReporters !== row.reportCount && (
                          <span className="ms-1.5 text-[11px] text-gray-400">{row.distinctReporters} مُبلِّغ</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {row.reasons.map((r) => (
                            <span key={r.value} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                              {r.labelAr}
                              <span className="font-bold text-gray-500">{r.count}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {row.listing ? (LISTING_STATUS_AR[row.listing.status] ?? row.listing.status) : '—'}
                      </td>
                      <td className="px-4 py-3"><ReportStatusChip status={row.queueStatus} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(row.lastReportedAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/reports/${row.listingId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                        >
                          مراجعة
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPrevPage}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {UI_AR.prev}
                </button>
                <span className="text-sm text-gray-600">{UI_AR.page} {meta.page} / {meta.totalPages}</span>
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
