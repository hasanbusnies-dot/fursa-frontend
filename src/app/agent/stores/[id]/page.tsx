'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, ChevronRight, Loader2, AlertTriangle, UserRound, Phone, MapPin,
  CalendarDays, BadgeCheck, ShieldX, PlusCircle, ReceiptText,
} from 'lucide-react';
import {
  agentStoresService,
  contractUrlOf,
  chargesOf,
  MEMBERSHIP_CAMPAIGNS,
  type StoreDetail,
  type StoreStatus,
  type MembershipCampaign,
} from '@/services/stores.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { MembershipChargeModal } from '@/components/stores/MembershipChargeModal';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const STATUS_META: Record<StoreStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  APPROVED:  { label: 'مقبول',        cls: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED:  { label: 'مرفوض',        cls: 'bg-red-100 text-red-700 border-red-200'       },
  SUSPENDED: { label: 'موقوف',        cls: 'bg-slate-200 text-slate-600 border-slate-300' },
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar-SY', { day: '2-digit', month: 'long', year: 'numeric' });
}

function campaignLabel(c?: string | null): string {
  if (!c) return '—';
  return MEMBERSHIP_CAMPAIGNS[c as MembershipCampaign]?.label ?? c;
}

const METHOD_LABEL: Record<string, string> = {
  ONLINE: 'إلكتروني', CASH: 'نقداً', FREE: 'مجاني',
};

export default function AgentStoreDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [store, setStore]     = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [charging, setCharging] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    agentStoresService.getStore(id)
      .then(setStore)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-white rounded animate-pulse" />
        <div className="rounded-2xl bg-white border border-slate-200 h-40 animate-pulse" />
        <div className="rounded-2xl bg-white border border-slate-200 h-32 animate-pulse" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">تعذّر تحميل المتجر.</p>
        <button onClick={load} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700 underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const statusMeta = STATUS_META[store.status] ?? STATUS_META.PENDING;
  const isApproved = store.status === 'APPROVED';
  const membership = store.membership ?? null;
  const memberActive = membership?.badge === true;
  const charges = chargesOf(store);

  return (
    <div className="space-y-4">
      {charging && (
        <MembershipChargeModal
          store={store}
          onClose={() => setCharging(false)}
          onCharged={load}
        />
      )}

      {/* Back */}
      <Link href="/agent/stores" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
        <ChevronRight className="w-4 h-4" />
        متاجري
      </Link>

      {/* Store header */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-teal-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">{store.name}</h1>
              {(store.city || store.governorate) && (
                <p className="text-xs text-slate-500 truncate">
                  {[store.city, store.governorate].filter(Boolean).join('، ')}
                </p>
              )}
            </div>
          </div>
          <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border', statusMeta.cls)}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {store.ownerName ?? store.owner?.name ?? '—'}
          </p>
          {(store.ownerPhone ?? store.owner?.phone) && (
            <p className="flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {store.ownerPhone ?? store.owner?.phone}
            </p>
          )}
          {store.address && (
            <p className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{store.address}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {formatDate(store.createdAt)}
          </p>
        </div>

        <div className="mt-4">
          <ContractDoc
            url={contractUrlOf(store)}
            label="عرض العقد"
            emptyLabel="لا يوجد عقد"
            expiredLabel="انتهت صلاحية الرابط، أعد تحميل الصفحة."
            alt={`عقد ${store.name}`}
            dir="rtl"
          />
        </div>
      </div>

      {/* Membership block */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BadgeCheck className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-800">العضوية</h2>
        </div>

        {memberActive ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-5 h-5 text-green-600" />
              <span className="text-sm font-bold text-green-800">عضو مفعّل</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-start">
              <div>
                <p className="text-[11px] text-slate-500">صالح حتى</p>
                <p className="text-sm font-bold text-slate-800">{formatDate(membership?.paidUntil)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">المتبقّي</p>
                <p className="text-sm font-bold text-slate-800">
                  {membership?.daysRemaining != null ? `متبقي ${membership.daysRemaining} يوم` : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-slate-500">العرض الحالي</p>
                <p className="text-sm font-bold text-slate-800">{campaignLabel(membership?.campaign)}</p>
              </div>
            </div>
            {isApproved && (
              <button
                onClick={() => setCharging(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-teal-300 text-teal-700 text-sm font-bold hover:bg-teal-50 transition-colors"
              >
                <ReceiptText className="w-4 h-4" />
                تجديد / تحصيل الاشتراك
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
            <ShieldX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">العضوية غير مفعّلة</p>
            <p className="text-xs text-slate-400 mt-0.5">فعّل الاشتراك لإعلانات غير محدودة وشارة الموثوقية.</p>
            {isApproved ? (
              <button
                onClick={() => setCharging(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-500 transition-colors"
              >
                <BadgeCheck className="w-4 h-4" />
                تحصيل الاشتراك
              </button>
            ) : (
              <p className="mt-3 text-[11px] text-amber-600">يجب اعتماد المتجر أولاً.</p>
            )}
          </div>
        )}
      </div>

      {/* Charge history */}
      {charges.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">سجل التحصيلات</h2>
          <div className="divide-y divide-slate-100">
            {charges.map((c) => (
              <div key={c.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{campaignLabel(c.campaign)}</p>
                    <p className="text-[11px] text-slate-400">
                      {METHOD_LABEL[c.method ?? ''] ?? c.method ?? '—'} · {formatDate(c.createdAt)}
                    </p>
                    {(c.periodStart || c.periodEnd) && (
                      <p className="text-[11px] text-slate-400">
                        {formatDate(c.periodStart)} ← {formatDate(c.periodEnd)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 shrink-0">
                    {c.amount != null ? formatMoney(c.amount, c.currency ?? 'USD') : '—'}
                  </span>
                </div>
                {c.receiptUrl && (
                  <div className="mt-2">
                    <ContractDoc
                      url={c.receiptUrl}
                      label="عرض الإيصال"
                      emptyLabel="لا يوجد إيصال"
                      expiredLabel="انتهت صلاحية الرابط، أعد تحميل الصفحة."
                      alt={`إيصال تحصيل ${store.name}`}
                      dir="rtl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add listing */}
      {isApproved && (
        <Link
          href={`/agent/stores/${store.id}/add-listing`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          إضافة إعلان لهذا المتجر
        </Link>
      )}
    </div>
  );
}
