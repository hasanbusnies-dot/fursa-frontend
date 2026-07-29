'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flag, ChevronRight, AlertTriangle, ExternalLink, UserRound, Phone,
  CalendarDays, Loader2, Eye, ShieldX, Ban, ImageOff, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { ReportStatusChip } from '@/components/admin/ReportStatusChip';
import { DismissReportsModal, ActionListingModal } from '@/components/admin/ReportResolveModals';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminReportsService,
  isAlreadyResolved,
  type ListingAction,
  type ReportsDetail,
} from '@/services/reports.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { LISTING_STATUS_AR, UI_AR } from '@/lib/staff-labels';

function formatDateTime(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return `${t.toLocaleDateString('ar', { day: '2-digit', month: 'long', year: 'numeric' })} — ${t.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}`;
}

function Card({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white shadow-pebble rounded-card p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function AdminReportDetailPage() {
  const params = useParams<{ listingId: string }>();
  const listingId = params?.listingId;
  const router = useRouter();
  const { user: admin, isAuthenticated } = useAdminAuthStore();

  const [mounted, setMounted]   = useState(false);
  const [detail, setDetail]     = useState<ReportsDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [actioning, setActioning]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || admin?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, admin, router]);

  const load = useCallback(() => {
    if (!listingId) return;
    setLoading(true);
    setError(false);
    adminReportsService.getDetail(listingId)
      .then(setDetail)
      .catch((err) => {
        console.error('[AdminReportDetail] fetch error:', err);
        setError(true);
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!mounted || admin?.userType !== 'ADMIN') return;
    load();
  }, [mounted, admin, load]);

  // Both actions resolve EVERY open report in one call, and both refetch afterwards: the
  // response reports counts, but the listing's own status also moved.
  const resolve = async (
    resolution: 'DISMISSED' | 'ACTIONED',
    listingAction: ListingAction,
    note?: string,
  ) => {
    if (!listingId) return;
    setBusy(true);
    try {
      const res = await adminReportsService.resolve(listingId, { resolution, listingAction, note });
      if (resolution === 'ACTIONED') {
        toast.success(`تم إغلاق ${res.reportsResolved} بلاغ وإشعار ${res.reportersNotified} مُبلِّغ.`);
      } else {
        toast.success(`تم إهمال ${res.reportsResolved} بلاغ.`);
      }
      setDismissing(false);
      setActioning(false);
      load();
    } catch (err) {
      if (isAlreadyResolved(err)) {
        toast.error('لا توجد بلاغات مفتوحة — تمت معالجتها بالفعل.');
        load();
      } else {
        toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!mounted || !isAuthenticated || admin?.userType !== 'ADMIN') return null;

  const listing = detail?.listing;
  const canResolve = !!detail && detail.openCount > 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {detail && listing && dismissing && (
        <DismissReportsModal
          listingTitle={listing.title}
          openCount={detail.openCount}
          onClose={() => setDismissing(false)}
          onConfirm={(note) => resolve('DISMISSED', 'NONE', note)}
        />
      )}
      {detail && listing && actioning && (
        <ActionListingModal
          listingTitle={listing.title}
          openCount={detail.openCount}
          onClose={() => setActioning(false)}
          onConfirm={(action, note) => resolve('ACTIONED', action, note)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Flag className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {listing?.title ?? (loading ? '…' : 'مراجعة البلاغات')}
            </h1>
            <p className="text-sm text-gray-500">كل البلاغات على هذا الإعلان.</p>
          </div>
        </div>

        <AdminNav />

        <Link href="/admin/reports" className="inline-flex items-center gap-1 mb-5 text-xs font-semibold text-red-600 hover:text-red-700">
          <ChevronRight className="w-4 h-4" />
          العودة إلى البلاغات
        </Link>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-56" />
            ))}
          </div>
        ) : error || !detail || !listing ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{UI_AR.loadFailed}</p>
            <p className="text-xs text-gray-400">قد يكون الإعلان محذوفاً أو لا توجد بلاغات عليه.</p>
            <button onClick={load} className="text-xs font-semibold text-red-600 hover:text-red-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Listing */}
            <Card title="الإعلان المُبلَّغ عنه" icon={Flag}>
              <div className="flex flex-col sm:flex-row gap-4">
                {listing.images[0] ? (
                  // Plain <img>, matching ListingCard — no next/image remotePatterns configured.
                  <div className="w-full sm:w-40 h-40 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full sm:w-40 h-40 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <ImageOff className="w-6 h-6 text-gray-300" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-gray-900 break-words">{listing.title}</p>
                  <p className="mt-1 text-lg font-extrabold text-blue-700">
                    {formatMoney(listing.price, listing.currency)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {listing.city && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{listing.city}</span>
                    )}
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDateTime(listing.createdAt)}</span>
                    {listing.listingNumber != null && (
                      <span className="text-gray-400">رقم الإعلان: {String(listing.listingNumber)}</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {LISTING_STATUS_AR[listing.status] ?? listing.status}
                    </span>
                    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      {detail.reportCount} بلاغ
                    </span>
                    {detail.openCount > 0 && (
                      <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                        {detail.openCount} مفتوح
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/listings/${listing.id}`}
                    target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    عرض الإعلان
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Seller — cross-links into the user-moderation screen */}
            <Card title="البائع" icon={UserRound}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-gray-900">{listing.seller.name ?? 'بلا اسم'}</span>
                <span className="flex items-center gap-1 text-gray-600" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {listing.seller.phone}
                </span>
                {listing.seller.deletedAt && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-800 text-white">محذوف</span>
                )}
              </div>
              <Link
                href={`/admin/users/${listing.seller.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                ملف المستخدم وإجراءات الإشراف
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Link>
            </Card>

            {/* Reports */}
            <Card title={`البلاغات (${detail.reportCount})`} icon={Eye}>
              <div className="space-y-3">
                {detail.reports.map((r) => (
                  <div key={r.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* reasonLabelAr is served by the backend — never re-labelled here. */}
                      <span className="text-sm font-semibold text-gray-900">{r.reasonLabelAr}</span>
                      <ReportStatusChip status={r.status} />
                      <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
                    </div>
                    {r.details && (
                      <p className="mt-1.5 text-sm text-gray-700 break-words whitespace-pre-line bg-gray-50 rounded-xl px-3 py-2">
                        {r.details}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      المُبلِّغ: {r.reporter.name ?? r.reporter.phone}
                    </p>
                    {r.resolutionNote && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        ملاحظة الإدارة: {r.resolutionNote}
                        {r.reviewedBy && ` — ${r.reviewedBy.name ?? r.reviewedBy.phone}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <Card title="القرار" icon={ShieldX}>
              {!canResolve ? (
                <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    لا توجد بلاغات مفتوحة على هذا الإعلان — تمت معالجتها بالفعل.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    القرار يُطبَّق على كل البلاغات المفتوحة ({detail.openCount}) دفعة واحدة.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActioning(true)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      اتخاذ إجراء على الإعلان
                    </button>
                    <button
                      onClick={() => setDismissing(true)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold disabled:opacity-60 transition-colors"
                    >
                      <ShieldX className="w-4 h-4" />
                      إهمال البلاغات
                    </button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
