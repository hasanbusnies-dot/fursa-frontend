'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarClock, ChevronLeft, ChevronRight, AlertTriangle, Inbox,
  CalendarDays, ReceiptText, UserCog, Phone,
} from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  adminRenewalsService,
  type RenewalRow,
  type RenewalState,
  type RenewalStateFilter,
  type RenewalsSummary,
} from '@/services/renewals.service';
import type { PageMeta } from '@/services/stores.service';
import { cn } from '@/lib/utils';

const FILTERS: { value: RenewalStateFilter; label: string }[] = [
  { value: 'all',      label: 'Tümü' },
  { value: 'upcoming', label: 'Yaklaşan' },
  { value: 'lapsed',   label: 'Gecikmiş' },
  { value: 'active',   label: 'Aktif' },
  { value: 'none',     label: 'Aboneliksiz' },
];

const STATE_META: Record<RenewalState, { label: string; badge: string; accent: string }> = {
  LAPSED:   { label: 'Gecikmiş',    badge: 'bg-red-100 text-red-700',     accent: 'text-red-600'   },
  UPCOMING: { label: 'Yaklaşan',    badge: 'bg-amber-100 text-amber-800', accent: 'text-amber-600' },
  ACTIVE:   { label: 'Aktif',       badge: 'bg-green-100 text-green-700', accent: 'text-green-600' },
  NONE:     { label: 'Aboneliksiz', badge: 'bg-gray-200 text-gray-600',   accent: 'text-gray-500'  },
};

const CAMPAIGN_LABEL: Record<string, string> = {
  FULL_PRICE:       'Tam fiyat',
  DISCOUNT_33:      '%33 indirim',
  FIRST_MONTH_FREE: 'İlk ay ücretsiz',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function actionLine(r: RenewalRow): string {
  if (r.state === 'LAPSED')   return r.daysOverdue   != null ? `${r.daysOverdue} gün gecikmiş`  : 'Süresi dolmuş';
  if (r.state === 'NONE')     return 'Abonelik yok';
  return r.daysRemaining != null ? `${r.daysRemaining} gün kaldı` : '—';
}

// ── Summary cards ───────────────────────────────────────────────────────────────

const SUMMARY_CARDS: { key: keyof RenewalsSummary; label: string; cls: string }[] = [
  { key: 'upcoming', label: 'Yaklaşan',    cls: 'text-amber-600' },
  { key: 'lapsed',   label: 'Gecikmiş',    cls: 'text-red-600'   },
  { key: 'active',   label: 'Aktif',       cls: 'text-green-600' },
  { key: 'none',     label: 'Aboneliksiz', cls: 'text-gray-500'  },
  { key: 'total',    label: 'Toplam',      cls: 'text-blue-600'  },
];

function SummaryHeader({ summary }: { summary: RenewalsSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {SUMMARY_CARDS.map(({ key, label, cls }) => (
        <div key={key} className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className={cn('text-2xl font-extrabold leading-none', cls)}>{summary[key] ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────────

function RenewalRowCard({ r }: { r: RenewalRow }) {
  const meta = STATE_META[r.state] ?? STATE_META.NONE;
  const agent = r.registeredByAgent ?? null;
  const campaign = r.currentCampaign ? (CAMPAIGN_LABEL[r.currentCampaign] ?? r.currentCampaign) : null;

  return (
    <Link
      href={`/admin/stores/${r.storeId}`}
      className="block bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{r.name}</h3>
          <p className={cn('text-sm font-extrabold mt-0.5', meta.accent)}>{actionLine(r)}</p>
        </div>
        <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.badge)}>
          {meta.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
        {r.paidUntil && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Ödendi: {formatDate(r.paidUntil)}
          </span>
        )}
        {(campaign || r.lastChargeAt) && (
          <span className="flex items-center gap-1.5">
            <ReceiptText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {[campaign, r.lastChargeAt ? `Son ödeme: ${formatDate(r.lastChargeAt)}` : null]
              .filter(Boolean).join(' · ')}
          </span>
        )}
        {agent && (agent.name || agent.phone) && (
          <span className="flex items-center gap-1.5">
            <UserCog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {agent.name ?? '—'}
            {agent.phone && (
              <span className="flex items-center gap-1 text-gray-400">
                <Phone className="w-3 h-3 shrink-0" />
                {agent.phone}
              </span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminRenewalsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [filter, setFilter]   = useState<RenewalStateFilter>('all');
  const [rows, setRows]       = useState<RenewalRow[]>([]);
  const [summary, setSummary] = useState<RenewalsSummary | null>(null);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminRenewalsService.list({ state: filter, page, limit: 20 })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
        if (res.summary) setSummary(res.summary); // page-independent — keep the last good one
      })
      .catch((err) => {
        console.error('[AdminRenewals] fetch error:', err);
        setError(true);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  const pickFilter = (f: RenewalStateFilter) => { setFilter(f); setPage(1); };

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <CalendarClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yenilemeler</h1>
            <p className="text-sm text-gray-500">Onaylı mağazaların abonelik yenileme durumları.</p>
          </div>
        </div>

        <AdminNav />

        {/* Summary header — platform totals, independent of filter/page */}
        {summary && <SummaryHeader summary={summary} />}

        {/* State filter chips */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => pickFilter(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                filter === value ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-24" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Yenilemeler yüklenemedi.</p>
            <button onClick={load} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              Tekrar dene
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Inbox className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Bu durumda mağaza yok.</p>
            <p className="text-xs text-gray-400">Filtreyi değiştirmeyi deneyin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => <RenewalRowCard key={r.storeId} r={r} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && meta && (meta.hasPrevPage || meta.hasNextPage) && (
          <div className="flex items-center justify-between gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPrevPage}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Önceki
            </button>
            <span className="text-xs text-gray-500">Sayfa {meta.page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              Sonraki
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
