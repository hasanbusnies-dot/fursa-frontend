'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck, CheckCircle2, XCircle, Pencil, X, Info, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminMembershipService,
  type MembershipPlan,
  type UpdateMembershipPlanDto,
} from '@/services/admin-membership.service';
import { adminRenewalsService, type RenewalsSummary } from '@/services/renewals.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { UI_AR } from '@/lib/staff-labels';

// The exact validation the backend applies (updateMembershipPlanSchema) — mirror it
// so a rejected value never leaves the modal. Caps catch magnitude fat-fingers.
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const PRICE_CAP = { SYP: 10_000_000, USD: 10_000 } as const;

const CURRENCY_LABEL_AR = {
  SYP: 'ليرة سورية (SYP)',
  USD: 'دولار أمريكي (USD)',
} as const;

// ── Tracking header (accounting view of GET /admin/renewals meta.summary) ─────
// /admin/renewals keeps its own five-card work-queue header; this is the money
// view of the SAME server summary — derived, so the two can't disagree.

function TrackingHeader({ summary }: { summary: RenewalsSummary }) {
  const cards = [
    { label: 'إجمالي الاشتراكات', value: summary.total - summary.none,       cls: 'text-blue-600',  sub: null },
    { label: 'نشطة',              value: summary.active + summary.upcoming,  cls: 'text-green-600',
      sub: summary.upcoming > 0 ? `${summary.upcoming} منها تقترب من الانتهاء` : null },
    { label: 'منتهية',            value: summary.lapsed,                     cls: 'text-red-600',   sub: null },
    { label: 'متاجر بلا اشتراك',  value: summary.none,                       cls: 'text-gray-500',  sub: null },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, cls, sub }) => (
        <div key={label} className="bg-white shadow-pebble rounded-card p-4">
          <p className={cn('text-2xl font-extrabold leading-none', cls)}>{value}</p>
          <p className="text-xs text-gray-500 mt-1.5">{label}</p>
          {sub && <p className="text-[11px] font-semibold text-amber-600 mt-1">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Plan edit modal ───────────────────────────────────────────────────────────

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: MembershipPlan;
  onClose: () => void;
  onSaved: (updated: MembershipPlan) => void;
}) {
  // Values are money-STRINGS end-to-end (backend validates ^\d+(\.\d{1,2})?$).
  const [name,   setName]   = useState(plan.name);
  const [months, setMonths] = useState(String(plan.billingPeriodMonths));
  const [syp,    setSyp]    = useState(plan.priceSyp ?? '');
  const [usd,    setUsd]    = useState(plan.priceUsd);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Only changed fields go into the PUT — an untouched empty SYP («غير مسعّر») stays absent.
    const dto: UpdateMembershipPlanDto = {};

    const trimmedName = name.trim();
    if (trimmedName !== plan.name) {
      if (trimmedName.length === 0 || trimmedName.length > 150) {
        toast.error('اسم الخطة مطلوب (150 حرفاً كحد أقصى).');
        return;
      }
      dto.name = trimmedName;
    }

    const monthsNum = Number(months.trim());
    if (monthsNum !== plan.billingPeriodMonths) {
      if (!Number.isInteger(monthsNum) || monthsNum < 1 || monthsNum > 12) {
        toast.error('مدة الاشتراك يجب أن تكون عدداً صحيحاً بين 1 و 12 شهراً.');
        return;
      }
      dto.billingPeriodMonths = monthsNum;
    }

    const priceEdits: { cur: 'SYP' | 'USD'; value: string; original: string; key: 'priceSyp' | 'priceUsd' }[] = [
      { cur: 'SYP', value: syp.trim(), original: plan.priceSyp ?? '', key: 'priceSyp' },
      { cur: 'USD', value: usd.trim(), original: plan.priceUsd,       key: 'priceUsd' },
    ];
    for (const { cur, value, original, key } of priceEdits) {
      if (value === original) continue;
      // A price can't be unset once defined — the backend accepts only a valid money string.
      if (!PRICE_RE.test(value) || Number(value) <= 0) {
        toast.error(`سعر ${CURRENCY_LABEL_AR[cur]} غير صالح — رقم موجب بحد أقصى خانتين عشريتين.`);
        return;
      }
      if (Number(value) > PRICE_CAP[cur]) {
        toast.error(`سعر ${CURRENCY_LABEL_AR[cur]} يتجاوز الحد الأقصى (${PRICE_CAP[cur].toLocaleString('en')}).`);
        return;
      }
      dto[key] = value;
    }

    if (Object.keys(dto).length === 0) { onClose(); return; }

    setSaving(true);
    try {
      const updated = await adminMembershipService.updatePlan(dto);
      toast.success('تم تحديث خطة العضوية.');
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(`تعذّر حفظ التعديلات — ${err instanceof Error ? err.message : 'حاول مجدداً'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BadgeCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">تعديل خطة العضوية</h3>
              <p className="text-xs text-gray-500">{plan.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">اسم الخطة</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">مدة الاشتراك (شهر)</label>
          <input
            type="number"
            inputMode="numeric"
            dir="ltr"
            min={1}
            max={12}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-end focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            السعر بالليرة — {CURRENCY_LABEL_AR.SYP}
          </label>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={syp}
            onChange={(e) => setSyp(e.target.value)}
            className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-end focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
            placeholder={plan.priceSyp === null ? 'غير مسعّر — أدخل قيمة لإنشائه' : '0'}
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            السعر بالدولار — {CURRENCY_LABEL_AR.USD}
          </label>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
            className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-end focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
            placeholder="0"
          />
        </div>

        <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-relaxed mb-4">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          السعران مستقلان تماماً — لا يوجد تحويل تلقائي بين العملتين. التعديل يسري على
          الدفعة التالية فقط ولا يمسّ الدفعات السابقة.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {UI_AR.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {saving ? UI_AR.saving : UI_AR.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: MembershipPlan; onEdit: () => void }) {
  return (
    <div className="bg-white shadow-pebble rounded-card p-5 hover:shadow-md transition-shadow flex flex-col gap-3 max-w-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <BadgeCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{plan.name}</p>
        </div>
        {plan.isActive ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            نشطة
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" />
            موقوفة
          </span>
        )}
      </div>

      {/* Two independent manually-set prices — no FX between them */}
      <div>
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">سعر الاشتراك</p>
        <div className="grid grid-cols-2 gap-2">
          {([['SYP', plan.priceSyp], ['USD', plan.priceUsd]] as const).map(([cur, price]) => (
            <div key={cur} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
              <p className="text-[10px] text-gray-400 font-semibold">{CURRENCY_LABEL_AR[cur]}</p>
              {price !== null ? (
                <p className="text-base font-extrabold text-gray-900 leading-tight mt-0.5" dir="ltr">
                  {formatMoney(price, cur)}
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-300 mt-0.5">غير مسعّر</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">مدة الاشتراك: {plan.billingPeriodMonths} شهر</p>

      <button
        onClick={onEdit}
        className="self-end flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        {UI_AR.update}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminMembershipsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  const [plan,        setPlan]        = useState<MembershipPlan | null>(null);
  const [planError,   setPlanError]   = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [summary,     setSummary]     = useState<RenewalsSummary | null>(null);
  const [editing,     setEditing]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  const loadPlan = useCallback(() => {
    setLoadingPlan(true);
    setPlanError(false);
    adminMembershipService.getPlan()
      .then(setPlan)
      .catch((err) => {
        console.error('[AdminMemberships] plan fetch error:', err);
        setPlanError(true);
      })
      .finally(() => setLoadingPlan(false));
  }, []);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    loadPlan();
    // Only meta.summary is used here — limit=1 keeps the row payload minimal.
    adminRenewalsService.list({ page: 1, limit: 1 })
      .then((res) => setSummary(res.summary))
      .catch((err) => console.error('[AdminMemberships] summary fetch error:', err));
  }, [mounted, user, loadPlan]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <BadgeCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">العضويات</h1>
            <p className="text-sm text-gray-500">خطة اشتراك المتاجر وأسعارها، ونظرة محاسبية على الاشتراكات.</p>
          </div>
        </div>

        <AdminNav />

        {editing && plan && (
          <PlanModal
            plan={plan}
            onClose={() => setEditing(false)}
            onSaved={setPlan}
          />
        )}

        {/* Tracking header — same server summary the renewals work-queue reads */}
        {summary && <TrackingHeader summary={summary} />}

        {/* Plan card */}
        <p className="text-sm text-gray-500 mb-5">
          للخطة سعران مستقلان (ليرة ودولار) يُحدَّدان يدوياً — هما ما يُحاسَب به المتجر بحسب
          عملة الدفع. التعديل يسري على الدفعة التالية فقط.
        </p>

        {loadingPlan ? (
          <div className="bg-white rounded-card shadow-pebble p-5 animate-pulse h-44 max-w-md" />
        ) : planError || !plan ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">تعذّر تحميل خطة العضوية.</p>
            <button onClick={loadPlan} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : (
          <PlanCard plan={plan} onEdit={() => setEditing(true)} />
        )}

      </div>
    </div>
  );
}
