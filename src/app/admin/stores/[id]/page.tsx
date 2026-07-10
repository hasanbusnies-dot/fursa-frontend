'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, ChevronLeft, AlertTriangle, UserRound, UserCog, Phone, MapPin,
  CalendarDays, BadgeCheck, ShieldX, Clock, CheckCircle2, XCircle, Ban,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  adminStoresService,
  contractUrlOf,
  chargesOf,
  type StoreDetail,
  type StoreStatus,
} from '@/services/stores.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  STORE_STATUS_AR,
  CAMPAIGN_AR as CAMPAIGN_LABEL,
  PAYMENT_METHOD_AR as METHOD_LABEL,
  UI_AR,
} from '@/lib/staff-labels';

const STATUS_META: Record<StoreStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  PENDING:   { label: STORE_STATUS_AR.PENDING,   cls: 'bg-amber-100 text-amber-800', Icon: Clock        },
  APPROVED:  { label: STORE_STATUS_AR.APPROVED,  cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  REJECTED:  { label: STORE_STATUS_AR.REJECTED,  cls: 'bg-red-100 text-red-700',     Icon: XCircle      },
  SUSPENDED: { label: STORE_STATUS_AR.SUSPENDED, cls: 'bg-gray-200 text-gray-600',   Icon: Ban          },
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'long', year: 'numeric' });
}

function campaignLabel(c?: string | null): string {
  if (!c) return '—';
  return CAMPAIGN_LABEL[c] ?? c;
}

export default function AdminStoreDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [store, setStore]     = useState<StoreDetail | null>(null);
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
    if (!id) return;
    setLoading(true);
    setError(false);
    adminStoresService.getStore(id)
      .then(setStore)
      .catch((err) => {
        console.error('[AdminStoreDetail] fetch error:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link
          href="/admin/stores"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          اعتماد المتاجر
        </Link>

        {loading ? (
          <div className="space-y-3">
            <div className="rounded-card bg-white shadow-pebble h-44 animate-pulse" />
            <div className="rounded-card bg-white shadow-pebble h-32 animate-pulse" />
          </div>
        ) : error || !store ? (
          <div className="rounded-card bg-white shadow-pebble p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">تعذّر تحميل المتجر.</p>
            <button onClick={load} className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : (() => {
          const meta = STATUS_META[store.status] ?? STATUS_META.PENDING;
          const membership = store.membership ?? null;
          const memberActive = membership?.badge === true;
          const charges = chargesOf(store);
          const agent = store.agent ?? store.registeredBy ?? null;
          const ownerPhone = store.ownerPhone ?? store.owner?.phone ?? null;

          return (
            <div className="space-y-4">
              {/* Store header */}
              <div className="rounded-card bg-white shadow-pebble p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base font-bold text-gray-900 truncate">{store.name}</h1>
                      {(store.city || store.governorate) && (
                        <p className="text-xs text-gray-500 truncate">
                          {[store.city, store.governorate].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>
                    <meta.Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  <p className="flex items-center gap-1.5">
                    <UserRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800">{store.ownerName ?? store.owner?.name ?? '—'}</span>
                    <span className="text-gray-400">(المالك)</span>
                  </p>
                  {ownerPhone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {ownerPhone}
                    </p>
                  )}
                  {agent && (
                    <p className="flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{agent.name ?? agent.phone ?? agent.id}</span>
                      <span className="text-gray-400">(المندوب المُسجِّل)</span>
                    </p>
                  )}
                  {store.address && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{store.address}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {formatDate(store.createdAt)}
                  </p>
                </div>

                {store.status === 'REJECTED' && store.rejectionReason && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{store.rejectionReason}</p>
                  </div>
                )}

                <div className="mt-4">
                  <ContractDoc
                    url={contractUrlOf(store)}
                    label="عرض العقد"
                    emptyLabel="لا يوجد عقد"
                    expiredLabel="انتهت صلاحية الرابط، حدّث الصفحة."
                    alt={`عقد ${store.name}`}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Membership block (read-only) */}
              <div className="rounded-card bg-white shadow-pebble p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeCheck className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-gray-800">العضوية</h2>
                </div>

                {memberActive ? (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgeCheck className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-bold text-green-800">عضو فعّال</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-gray-500">سارية حتى</p>
                        <p className="text-sm font-bold text-gray-800">{formatDate(membership?.paidUntil)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">المتبقّي</p>
                        <p className="text-sm font-bold text-gray-800">
                          {membership?.daysRemaining != null ? `${membership.daysRemaining} يوم` : '—'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] text-gray-500">الحملة</p>
                        <p className="text-sm font-bold text-gray-800">{campaignLabel(membership?.campaign)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                    <ShieldX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">العضوية غير فعّالة</p>
                  </div>
                )}
              </div>

              {/* Charge history with receipts — the admin's window into cash collections */}
              {charges.length > 0 && (
                <div className="rounded-card bg-white shadow-pebble p-5">
                  <h2 className="text-sm font-bold text-gray-800 mb-3">سجل المدفوعات</h2>
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
                                {formatDate(c.periodStart)} → {formatDate(c.periodEnd)}
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
                              expiredLabel="انتهت صلاحية الرابط، حدّث الصفحة."
                              alt={`إيصال تحصيل ${store.name}`}
                              dir="ltr"
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
        })()}
      </div>
    </div>
  );
}
