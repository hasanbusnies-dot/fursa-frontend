'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Rocket, Zap, ImageOff, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertTriangle, Inbox, Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useStoreGate } from '@/store/store-gate.store';
import { StoreGateBlock } from '@/components/account/StoreGateNotice';
import {
  dopingsService,
  type MyActiveDopingRow,
  type DopingReceipt,
  type MyDopingsMeta,
} from '@/services/dopings.service';
import { DopingPurchaseModal } from '@/components/dopings/DopingPurchaseModal';
import { dopingMeta, endsSoon, timeLeftAr } from '@/lib/dopings';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

// «تعزيزاتي» — the doping visibility hub. Two honest surfaces:
//  - ACTIVE: what is live right now, grouped by listing, soonest expiry first
//    (backend order is the contract — never re-sorted here).
//  - HISTORY: purchase RECEIPTS (moment + cost). The coverage window is not stored
//    backend-side, so the UI speaks strictly in purchase tense — no "active until".

type Tab = 'active' | 'history';

function formatDateAr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Active tab ────────────────────────────────────────────────────────────────

function ActiveCard({ row, onBoost }: { row: MyActiveDopingRow; onBoost: (r: MyActiveDopingRow) => void }) {
  const soon = endsSoon(row.soonestExpiry);
  return (
    <div className="flex gap-4 items-start bg-white rounded-2xl border border-gray-200 p-4">
      <Link href={`/listings/${row.listing.id}`} className="shrink-0">
        <div className="w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {row.listing.imageUrl ? (
            <img src={row.listing.imageUrl} alt={row.listing.title} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-300" />
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/listings/${row.listing.id}`}
            className="text-sm font-semibold text-gray-900 leading-snug hover:text-orange-600 transition-colors line-clamp-2"
          >
            {row.listing.title}
          </Link>
          {soon && (
            <span className="shrink-0 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
              ينتهي قريباً
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
          {row.dopings.map((d) => {
            const meta = dopingMeta(d.type);
            const MetaIcon = meta.icon;
            return (
              <span
                key={d.type}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full',
                  meta.iconBg, meta.iconColor,
                )}
              >
                <MetaIcon className="w-3 h-3" />
                {meta.label}
                <span className={cn('font-normal', endsSoon(d.expiresAt) ? 'text-amber-600 font-semibold' : 'text-gray-500')}>
                  · {timeLeftAr(d.expiresAt)}
                </span>
              </span>
            );
          })}
        </div>

        <button
          onClick={() => onBoost(row)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm hover:from-orange-600 hover:to-pink-600 transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          تعزيز إضافي
        </button>
      </div>
    </div>
  );
}

// ── History tab (purchase receipts — purchase tense only) ─────────────────────

function ReceiptRow({ r }: { r: DopingReceipt }) {
  const meta = dopingMeta(r.type);
  const MetaIcon = meta.icon;
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.iconBg)}>
        <MetaIcon className={cn('w-[18px] h-[18px]', meta.iconColor)} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
        {r.listingTitle ? (
          <Link href={`/listings/${r.listingId}`} className="text-xs text-gray-500 hover:text-orange-600 transition-colors line-clamp-1">
            {r.listingTitle}
          </Link>
        ) : (
          <p className="text-xs text-gray-400 italic">إعلان محذوف</p>
        )}
      </div>
      <div className="shrink-0 text-end">
        <p className="text-sm font-bold text-gray-900">{formatMoney(r.amount, r.currency)}</p>
        <p className="text-[11px] text-gray-400">تاريخ الشراء: {formatDateAr(r.purchasedAt)}</p>
      </div>
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Pager({ meta, onPage }: { meta: MyDopingsMeta; onPage: (p: number) => void }) {
  if (!meta.hasNextPage && !meta.hasPrevPage) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(meta.page - 1)}
        disabled={!meta.hasPrevPage}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        aria-label="الصفحة السابقة"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-500 px-2">صفحة {meta.page}</span>
      <button
        onClick={() => onPage(meta.page + 1)}
        disabled={!meta.hasNextPage}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        aria-label="الصفحة التالية"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-gray-200">
      {tab === 'active' ? (
        <>
          <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">لا توجد تعزيزات فعّالة حالياً</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">عزّز أحد إعلاناتك ليظهر لعدد أكبر من المشترين.</p>
          <Link
            href="/account/listings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm hover:from-orange-600 hover:to-pink-600 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            إعلاناتي
          </Link>
        </>
      ) : (
        <>
          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">لا توجد مشتريات بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر إيصالات شراء التعزيزات هنا.</p>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyDopingsPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const gate            = useStoreGate();

  const [tab, setTab] = useState<Tab>('active');

  const [activeRows, setActiveRows] = useState<MyActiveDopingRow[]>([]);
  const [activeMeta, setActiveMeta] = useState<MyDopingsMeta | null>(null);
  const [activePage, setActivePage] = useState(1);

  const [historyRows, setHistoryRows] = useState<DopingReceipt[]>([]);
  const [historyMeta, setHistoryMeta] = useState<MyDopingsMeta | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const [boostTarget, setBoostTarget] = useState<MyActiveDopingRow | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    const req = tab === 'active'
      ? dopingsService.getMyActive(activePage).then(({ rows, meta }) => { setActiveRows(rows); setActiveMeta(meta); })
      : dopingsService.getMyHistory(historyPage).then(({ rows, meta }) => { setHistoryRows(rows); setHistoryMeta(meta); });
    req.catch(() => setError(true)).finally(() => setLoading(false));
  }, [tab, activePage, historyPage]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  if (!isAuthenticated) return null;

  // The dopings router is requireApprovedStore'd server-side too.
  if (gate.locked || (gate.gated && gate.loading)) return <StoreGateBlock surface="dopings" />;

  const meta = tab === 'active' ? activeMeta : historyMeta;
  const isEmpty = tab === 'active' ? activeRows.length === 0 : historyRows.length === 0;

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">تعزيزاتي</h1>
            <p className="text-sm text-gray-500">التعزيزات الفعّالة وسجل مشترياتك.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {([['active', 'الفعّالة'], ['history', 'سجل المشتريات']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-200">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600 mb-3">تعذّر تحميل البيانات</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : isEmpty ? (
          <EmptyState tab={tab} />
        ) : tab === 'active' ? (
          <div className="space-y-3">
            {activeRows.map((row) => (
              <ActiveCard key={row.listing.id} row={row} onBoost={setBoostTarget} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {historyRows.map((r) => (
              <ReceiptRow key={r.id} r={r} />
            ))}
          </div>
        )}

        {!loading && !error && meta && (
          <Pager
            meta={meta}
            onPage={(p) => (tab === 'active' ? setActivePage(p) : setHistoryPage(p))}
          />
        )}
      </div>

      {/* «تعزيز إضافي» — the renewal path reuses the full purchase flow. Reload on close:
          a completed purchase changes what this page shows. */}
      {boostTarget && (
        <DopingPurchaseModal
          isOpen
          onClose={() => { setBoostTarget(null); load(); }}
          listingId={boostTarget.listing.id}
          listingTitle={boostTarget.listing.title}
        />
      )}
    </>
  );
}
