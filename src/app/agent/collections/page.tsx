'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ReceiptText, ChevronLeft, ChevronRight, Inbox, RefreshCw, UserRound,
  BadgeCheck, Wallet,
} from 'lucide-react';
import {
  agentService,
  type Collection,
  type PageMeta,
} from '@/services/agent.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { formatMoney } from '@/lib/money';

function formatDateTime(s: string): string {
  return new Date(s).toLocaleString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Settled / unsettled chip ──────────────────────────────────────────────────────

function SettlementChip({ settlementId }: { settlementId: string | null }) {
  if (settlementId) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
        مُسوّى
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
      غير مُسوّى
    </span>
  );
}

// ── Purpose label ─────────────────────────────────────────────────────────────────

function PurposeLabel({ c }: { c: Collection }) {
  if (c.purpose === 'MEMBERSHIP') {
    const inner = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
        <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          اشتراك عضوية{c.storeName ? ` — ${c.storeName}` : ''}
        </span>
      </span>
    );
    if (c.storeId) {
      return (
        <Link href={`/agent/stores/${c.storeId}`} className="inline-flex max-w-full hover:opacity-80 transition-opacity">
          {inner}
        </Link>
      );
    }
    return inner;
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">
      <Wallet className="w-3.5 h-3.5 shrink-0" />
      شحن محفظة
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="h-4 w-20 bg-slate-200 rounded" />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AgentCollectionsPage() {
  const [rows, setRows]       = useState<Collection[]>([]);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    agentService.getCollections({ page, limit: 20 })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <ReceiptText className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">سجل التحصيل</h1>
          <p className="text-xs text-slate-500">تحصيلاتك النقدية وحالة تسويتها.</p>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-600 mb-4">تعذّر تحميل سجل التحصيل.</p>
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
          <p className="text-sm font-semibold text-slate-700">لا توجد تحصيلات بعد</p>
          <p className="text-xs text-slate-500 mt-1">ستظهر هنا التحصيلات التي تسجّلها.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <UserRound className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{c.sellerName}</p>
                  <p className="text-[11px] text-slate-400">{formatDateTime(c.collectedAt)}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-sm font-extrabold text-teal-700">{formatMoney(c.amount, c.currency)}</p>
                  <div className="mt-1"><SettlementChip settlementId={c.settlementId} /></div>
                </div>
              </div>
              <div className="mt-2.5">
                <PurposeLabel c={c} />
              </div>
              {c.note && (
                <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 line-clamp-2">
                  {c.note}
                </p>
              )}
              {c.receiptUrl && (
                <div className="mt-2">
                  <ContractDoc
                    url={c.receiptUrl}
                    label="عرض الإيصال"
                    emptyLabel="لا يوجد إيصال"
                    expiredLabel="انتهت صلاحية الرابط، أعد تحميل الصفحة."
                    alt={`إيصال تحصيل ${c.sellerName}`}
                    dir="rtl"
                  />
                </div>
              )}
            </div>
          ))}
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
