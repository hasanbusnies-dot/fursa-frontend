'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Loader2, AlertTriangle, Inbox, UserRound, CalendarDays,
  Banknote, ReceiptText, ArrowRight, Phone,
} from 'lucide-react';
import {
  accountingService,
  type SettlementDetail,
  type SettlementCollection,
} from '@/services/accounting.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { CopyableId } from '@/components/accounting/CopyableId';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { VERIFICATION_STATUS_AR, UI_AR } from '@/lib/staff-labels';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: VERIFICATION_STATUS_AR.PENDING_VERIFICATION, cls: 'bg-amber-100 text-amber-800' },
  VERIFIED:             { label: VERIFICATION_STATUS_AR.VERIFIED,             cls: 'bg-green-100 text-green-700' },
  REJECTED:             { label: VERIFICATION_STATUS_AR.REJECTED,             cls: 'bg-red-100 text-red-700'     },
};

function formatDateTime(s?: string | null): string {
  if (!s) return '—';
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('ar', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Settled-collection row (read-only — already verified & settled) ─────────────────

function CollectionRow({ c }: { c: SettlementCollection }) {
  const meta = STATUS_META[c.verificationStatus] ?? { label: c.verificationStatus, cls: 'bg-gray-100 text-gray-500' };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-extrabold text-gray-900 tabular-nums" dir="ltr">{formatMoney(c.amount, c.currency)}</p>
          {c.sellerName && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 text-gray-400" /> {c.sellerName}
            </p>
          )}
        </div>
        <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>{meta.label}</span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
        <CalendarDays className="w-3.5 h-3.5" /> {formatDateTime(c.collectedAt)}
      </p>

      <div className="mt-3">
        <ContractDoc
          url={c.receiptUrl ?? null}
          label="عرض الإيصال"
          emptyLabel="لا يوجد إيصال"
          expiredLabel="انتهت صلاحية الرابط، حدّث الصفحة."
          alt="إيصال التحصيل"
          dir="ltr"
        />
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SettlementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [detail, setDetail]   = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true); setError(false); setNotFound(false);
    accountingService.getSettlement(id)
      .then(setDetail)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Link href="/accounting/settlements" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="w-4 h-4" /> التسويات
      </Link>

      {loading ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 animate-pulse h-40 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-48" />)}
          </div>
        </>
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">لم يتم العثور على التسوية.</p>
        </div>
      ) : error || !detail ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">تعذّر تحميل التسوية.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">{UI_AR.retry}</button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                  <Banknote className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{detail.agentName || 'مندوب'}</h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 shrink-0" /> {formatDateTime(detail.settledAt)}
                    </p>
                    {detail.agentPhone && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3 shrink-0" /> {detail.agentPhone}
                      </p>
                    )}
                  </div>
                  {detail.agentCode && <div className="mt-1"><CopyableId id={detail.agentCode} /></div>}
                </div>
              </div>
              <span className="text-xl font-extrabold text-gray-900 tabular-nums shrink-0" dir="ltr">
                {formatMoney(detail.amount, detail.currency)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500 mb-0.5">عدد التحصيلات</p>
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ReceiptText className="w-4 h-4 text-gray-400" /> {detail.collectionCount ?? detail.collections.length}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500 mb-0.5">المُستلِم</p>
                <p className="font-bold text-gray-900 truncate">{detail.receivedByName || '—'}</p>
                {detail.receivedByPhone && (
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3 shrink-0" /> {detail.receivedByPhone}
                  </p>
                )}
              </div>
              {detail.note && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-gray-500 mb-0.5">ملاحظة</p>
                  <p className="font-medium text-gray-700 truncate">{detail.note}</p>
                </div>
              )}
            </div>

            <Link
              href={`/accounting/verification/${detail.agentId}?status=all`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <UserRound className="w-4 h-4" /> سجل تحصيلات المندوب الكامل <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Collections covered */}
          <div className="flex items-center gap-2 mb-3">
            <ReceiptText className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">التحصيلات المشمولة</h2>
          </div>

          {detail.collections.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center bg-white border border-gray-200 rounded-2xl">لا تحصيلات في هذه التسوية.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {detail.collections.map((c) => <CollectionRow key={c.id} c={c} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
