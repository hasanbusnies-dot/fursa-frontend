'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store, PlusCircle, AlertTriangle, UserRound, CalendarDays, Phone, ChevronLeft,
} from 'lucide-react';
import {
  agentStoresService,
  contractUrlOf,
  type Store as StoreModel,
  type StoreStatus,
} from '@/services/stores.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { cn } from '@/lib/utils';

// Status badge styling — PENDING amber / APPROVED green / REJECTED red / SUSPENDED gray.
const STATUS_META: Record<StoreStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  APPROVED:  { label: 'مقبول',        cls: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED:  { label: 'مرفوض',        cls: 'bg-red-100 text-red-700 border-red-200'       },
  SUSPENDED: { label: 'موقوف',        cls: 'bg-slate-200 text-slate-600 border-slate-300' },
};

function formatDate(d: string) {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ownerNameOf(s: StoreModel): string {
  return s.ownerName ?? s.owner?.name ?? '—';
}
function ownerPhoneOf(s: StoreModel): string | null {
  return s.ownerPhone ?? s.owner?.phone ?? null;
}

// ── Store card ──────────────────────────────────────────────────────────────────
// Structured so AP-M3 membership info can slot in below the meta block later.

function StoreCard({ store }: { store: StoreModel }) {
  const meta = STATUS_META[store.status] ?? STATUS_META.PENDING;
  const photo = contractUrlOf(store);
  const phone = ownerPhoneOf(store);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      {/* Tappable info area → store detail. Kept separate from ContractDoc so its
          button isn't nested inside an anchor. */}
      <Link href={`/agent/stores/${store.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{store.name}</h3>
            {(store.city || store.governorate) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {[store.city, store.governorate].filter(Boolean).join('، ')}
              </p>
            )}
          </div>
          <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border', meta.cls)}>
            {meta.label}
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {ownerNameOf(store)}
          </p>
          {phone && (
            <p className="flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {phone}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {formatDate(store.createdAt)}
          </p>
        </div>

        {/* Rejection reason — only on REJECTED */}
        {store.status === 'REJECTED' && store.rejectionReason && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{store.rejectionReason}</p>
          </div>
        )}
      </Link>

      {/* Contract document + open-detail hint */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <ContractDoc
          url={photo}
          label="عرض العقد"
          emptyLabel="لا يوجد عقد"
          expiredLabel="انتهت صلاحية الرابط، أعد تحميل الصفحة."
          alt={`عقد ${store.name}`}
          dir="rtl"
        />
        <Link
          href={`/agent/stores/${store.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 shrink-0"
        >
          التفاصيل
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AgentStoresPage() {
  const [stores, setStores]   = useState<StoreModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    agentStoresService.getStores({ page: 1, limit: 50 })
      .then((res) => setStores(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
            <Store className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">متاجري</h1>
            <p className="text-xs text-slate-500">المتاجر التي سجّلتها وحالتها.</p>
          </div>
        </div>
        <Link
          href="/agent/stores/register"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          متجر جديد
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">تعذّر تحميل المتاجر.</p>
          <button onClick={load} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700 underline">
            إعادة المحاولة
          </button>
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">لم تسجّل أي متجر بعد.</p>
          <Link
            href="/agent/stores/register"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            تسجيل أول متجر
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((s) => <StoreCard key={s.id} store={s} />)}
        </div>
      )}
    </div>
  );
}
