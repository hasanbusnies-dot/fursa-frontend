'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock, ChevronLeft, ChevronRight, Inbox, RefreshCw, CalendarDays,
  ReceiptText,
} from 'lucide-react';
import {
  agentRenewalsService,
  type RenewalRow,
  type RenewalState,
  type RenewalStateFilter,
} from '@/services/renewals.service';
import {
  MEMBERSHIP_CAMPAIGNS,
  type MembershipCampaign,
  type PageMeta,
} from '@/services/stores.service';
import { cn } from '@/lib/utils';

const FILTERS: { value: RenewalStateFilter; label: string }[] = [
  { value: 'all',      label: 'الكل' },
  { value: 'upcoming', label: 'قريبة' },
  { value: 'lapsed',   label: 'منتهية' },
  { value: 'active',   label: 'نشطة' },
  { value: 'none',     label: 'بدون اشتراك' },
];

const STATE_META: Record<RenewalState, { label: string; badge: string; accent: string }> = {
  LAPSED:   { label: 'منتهٍ',          badge: 'bg-red-100 text-red-700 border-red-200',       accent: 'text-red-600'   },
  UPCOMING: { label: 'قريب الانتهاء',  badge: 'bg-amber-100 text-amber-800 border-amber-200', accent: 'text-amber-600' },
  ACTIVE:   { label: 'نشط',            badge: 'bg-green-100 text-green-700 border-green-200', accent: 'text-green-600' },
  NONE:     { label: 'بدون اشتراك',    badge: 'bg-slate-200 text-slate-600 border-slate-300', accent: 'text-slate-500' },
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar-SY', { day: '2-digit', month: 'long', year: 'numeric' });
}

function campaignLabel(c?: string | null): string | null {
  if (!c) return null;
  return MEMBERSHIP_CAMPAIGNS[c as MembershipCampaign]?.label ?? c;
}

/** The actionable number — what the agent acts on. */
function actionLine(r: RenewalRow): string {
  if (r.state === 'LAPSED')   return r.daysOverdue   != null ? `متأخر ${r.daysOverdue} يوم`  : 'منتهٍ';
  if (r.state === 'NONE')     return 'لا اشتراك';
  return r.daysRemaining != null ? `متبقي ${r.daysRemaining} يوم` : '—';
}

// ── Row ─────────────────────────────────────────────────────────────────────────

function RenewalCard({ r }: { r: RenewalRow }) {
  const meta = STATE_META[r.state] ?? STATE_META.NONE;
  const campaign = campaignLabel(r.currentCampaign);

  return (
    <Link
      href={`/agent/stores/${r.storeId}`}
      className="block bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{r.name}</h3>
          <p className={cn('text-sm font-extrabold mt-0.5', meta.accent)}>{actionLine(r)}</p>
        </div>
        <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border', meta.badge)}>
          {meta.label}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
        {r.paidUntil && (
          <p className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            مدفوع حتى {formatDate(r.paidUntil)}
          </p>
        )}
        {(campaign || r.lastChargeAt) && (
          <p className="flex items-center gap-1.5">
            <ReceiptText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {[campaign, r.lastChargeAt ? `آخر دفعة ${formatDate(r.lastChargeAt)}` : null]
              .filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AgentRenewalsPage() {
  const [filter, setFilter]   = useState<RenewalStateFilter>('all');
  const [rows, setRows]       = useState<RenewalRow[]>([]);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    agentRenewalsService.list({ state: filter, page, limit: 20 })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const pickFilter = (f: RenewalStateFilter) => { setFilter(f); setPage(1); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <CalendarClock className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">التجديدات</h1>
          <p className="text-xs text-slate-500">اشتراكات متاجرك المنتهية والقريبة من الانتهاء.</p>
        </div>
      </div>

      {/* State filter chips */}
      <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => pickFilter(value)}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
              filter === value ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-600 mb-4">تعذّر تحميل التجديدات.</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">لا توجد متاجر في هذه الحالة</p>
          <p className="text-xs text-slate-500 mt-1">جرّب تغيير الفلتر أعلاه.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => <RenewalCard key={r.storeId} r={r} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && meta && (meta.hasPrevPage || meta.hasNextPage) && (
        <div className="flex items-center justify-between gap-3 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!meta.hasPrevPage}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
          <span className="text-xs text-slate-500">صفحة {meta.page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasNextPage}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
