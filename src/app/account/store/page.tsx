'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, AlertTriangle, MapPin, CalendarDays, CalendarClock, BadgeCheck, ShieldX,
  Clock, XCircle, Ban, ReceiptText, Inbox,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  ownerStoreService,
  contractUrlOf,
  chargesOf,
  MEMBERSHIP_CAMPAIGNS,
  type StoreDetail,
  type StoreStatus,
  type MembershipCampaign,
} from '@/services/stores.service';
import { ApiError } from '@/services/api';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { OwnerMembershipPayModal } from '@/components/stores/OwnerMembershipPayModal';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const STATUS_META: Record<StoreStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  APPROVED:  { label: 'مقبول',        cls: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED:  { label: 'مرفوض',        cls: 'bg-red-100 text-red-700 border-red-200'       },
  SUSPENDED: { label: 'موقوف',        cls: 'bg-gray-200 text-gray-600 border-gray-300'    },
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

// ── Skeleton ──────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-44 animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-36 animate-pulse" />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function OwnerStorePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [store, setStore]     = useState<StoreDetail | null>(null);
  const [noStore, setNoStore] = useState(false); // 404 — corporate user with no store
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [paying, setPaying]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) router.replace('/login?redirect=/account/store');
  }, [mounted, isAuthenticated, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setNoStore(false);
    ownerStoreService.getStore()
      .then(setStore)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNoStore(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    load();
  }, [mounted, isAuthenticated, load]);

  if (!mounted || !isAuthenticated || loading) return <PageSkeleton />;

  // ── 404: no store linked to this account ──
  if (noStore) {
    return (
      <div className="bg-white shadow-pebble rounded-card p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">لا يوجد متجر مرتبط بحسابك</p>
        <p className="text-xs text-gray-500 mt-1">يتم تسجيل المتاجر عبر مندوبينا الميدانيين.</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-white shadow-pebble rounded-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600">تعذّر تحميل بيانات المتجر.</p>
        <button onClick={load} className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
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
  // Renew gate: only the explicit false blocks (a charge would 409). Read off the
  // flag directly — never derived from daysRemaining.
  const renewBlocked = membership?.renewAllowed === false;

  const renewWindowNote = (
    <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 py-2.5 px-3 text-xs font-semibold text-gray-500">
      <CalendarClock className="w-4 h-4 text-gray-400 shrink-0" />
      يمكن التجديد في {formatDate(membership?.renewableFrom)}
    </p>
  );

  return (
    <div className="space-y-4">
      {paying && (
        <OwnerMembershipPayModal
          onClose={() => setPaying(false)}
          onCharged={(detail) => { setStore(detail); load(); }}
          onRenewBlocked={load}
        />
      )}

      {/* Page header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <Store className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">متجري</h1>
          <p className="text-xs text-gray-500">إدارة متجرك واشتراك العضوية.</p>
        </div>
      </div>

      {/* Store card */}
      <div className="rounded-card bg-white shadow-pebble p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{store.name}</h2>
            {(store.city || store.governorate) && (
              <p className="text-xs text-gray-500 truncate">
                {[store.city, store.governorate].filter(Boolean).join('، ')}
              </p>
            )}
          </div>
          <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border', statusMeta.cls)}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-gray-600">
          {store.address && (
            <p className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{store.address}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            تاريخ التسجيل: {formatDate(store.createdAt)}
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

      {/* ── Status gates ── */}
      {store.status === 'PENDING' && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
          <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-800">متجرك قيد المراجعة — لا يمكنك إدارته بعد</p>
          <p className="text-xs text-amber-700 mt-1">سيصبح متجرك قابلاً للإدارة فور اعتماده من الإدارة.</p>
        </div>
      )}

      {store.status === 'REJECTED' && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-bold text-red-800">تم رفض تسجيل المتجر</p>
          </div>
          <p className="text-xs text-red-700 leading-relaxed">
            {store.rejectionReason || 'لم تُذكر أسباب الرفض. تواصل مع المندوب لمزيد من التفاصيل.'}
          </p>
        </div>
      )}

      {store.status === 'SUSPENDED' && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center">
          <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">متجرك موقوف حالياً</p>
          <p className="text-xs text-gray-500 mt-1">تواصل مع الدعم لمعرفة التفاصيل.</p>
        </div>
      )}

      {/* ── Membership (APPROVED only) ── */}
      {isApproved && (
        <div className="rounded-card bg-white shadow-pebble p-5">
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-gray-800">العضوية</h2>
          </div>

          {memberActive ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BadgeCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-bold text-green-800">عضو مفعّل</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-start">
                <div>
                  <p className="text-[11px] text-gray-500">صالح حتى</p>
                  <p className="text-sm font-bold text-gray-800">{formatDate(membership?.paidUntil)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">المتبقّي</p>
                  <p className="text-sm font-bold text-gray-800">
                    {membership?.daysRemaining != null ? `متبقي ${membership.daysRemaining} يوم` : '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-gray-500">العرض الحالي</p>
                  <p className="text-sm font-bold text-gray-800">{campaignLabel(membership?.campaign)}</p>
                </div>
              </div>
              {renewBlocked ? renewWindowNote : (
                <button
                  onClick={() => setPaying(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-300 text-orange-700 text-sm font-bold hover:bg-orange-50 transition-colors"
                >
                  <ReceiptText className="w-4 h-4" />
                  تجديد الاشتراك
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
              <ShieldX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">العضوية غير مفعّلة</p>
              <p className="text-xs text-gray-400 mt-0.5">فعّل الاشتراك لإعلانات غير محدودة وشارة الموثوقية.</p>
              {renewBlocked ? renewWindowNote : (
                <button
                  onClick={() => setPaying(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
                >
                  <BadgeCheck className="w-4 h-4" />
                  دفع الاشتراك ({formatMoney(MEMBERSHIP_CAMPAIGNS.FULL_PRICE.price, 'USD')}/شهر)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Charge history (APPROVED only) ── */}
      {isApproved && charges.length > 0 && (
        <div className="rounded-card bg-white shadow-pebble p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3">سجل الدفعات</h2>
          <div className="divide-y divide-gray-100">
            {charges.map((c) => (
              <div key={c.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{campaignLabel(c.campaign)}</p>
                    <p className="text-[11px] text-gray-400">
                      {METHOD_LABEL[c.method ?? ''] ?? c.method ?? '—'} · {formatDate(c.createdAt)}
                    </p>
                    {(c.periodStart || c.periodEnd) && (
                      <p className="text-[11px] text-gray-400">
                        {formatDate(c.periodStart)} ← {formatDate(c.periodEnd)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 shrink-0">
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
                      alt={`إيصال دفع ${store.name}`}
                      dir="rtl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
