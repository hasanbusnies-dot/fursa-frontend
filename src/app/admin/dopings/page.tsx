'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, CheckCircle2, XCircle, Package, Pencil, X, ChevronDown,
  AlertTriangle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminDopingsService,
  type ActiveDoping,
  type DopingPackage,
} from '@/services/admin-dopings.service';
import { dopingMeta } from '@/lib/dopings';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { UI_AR } from '@/lib/staff-labels';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOPING_TYPE_OPTIONS = [
  { value: '',                label: 'كل الأنواع' },
  { value: 'HOMEPAGE',        label: 'واجهة الرئيسية' },
  { value: 'CATEGORY',        label: 'واجهة القسم' },
  { value: 'TOP_OF_SEARCH',   label: 'تصدّر البحث' },
  { value: 'DETAILED_SEARCH', label: 'البحث المفصّل' },
  { value: 'URGENT',          label: 'إعلان عاجل' },
  { value: 'HIGHLIGHT',       label: 'خط عريض وإطار' },
  { value: 'REFRESH_DATE',    label: 'تحديث التاريخ' },
];

// Icons/labels come from the shared dopingMeta (src/lib/dopings.ts) — the local
// duplicate map was the same drift-bug class the mobile category list had. Only the
// active-tab badge chip colors are panel-specific and stay here.
const BADGE_BG: Record<string, string> = {
  HOMEPAGE:        'bg-yellow-100 text-yellow-800',
  CATEGORY:        'bg-blue-100 text-blue-800',
  TOP_OF_SEARCH:   'bg-indigo-100 text-indigo-800',
  DETAILED_SEARCH: 'bg-purple-100 text-purple-800',
  URGENT:          'bg-red-100 text-red-800',
  HIGHLIGHT:       'bg-orange-100 text-orange-800',
  REFRESH:         'bg-green-100 text-green-800',
};

// The exact validation the backend applies (setPackagePriceSchema) — mirror it so a
// rejected value never leaves the modal.
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const PRICE_CURRENCIES = ['SYP', 'USD'] as const;
type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

const CURRENCY_LABEL_AR: Record<PriceCurrency, string> = {
  SYP: 'ليرة سورية (SYP)',
  USD: 'دولار أمريكي (USD)',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Price edit modal ──────────────────────────────────────────────────────────

function PriceModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: DopingPackage;
  onClose: () => void;
  /** Called after ANY currency saved successfully — the tab refetches the list. */
  onSaved: () => void;
}) {
  const meta = dopingMeta(pkg.type);
  const MetaIcon = meta.icon;

  const originalFor = (cur: PriceCurrency) =>
    pkg.prices.find((r) => r.currency === cur)?.pricePerWeek ?? '';

  // Values are money-STRINGS end-to-end (backend validates ^\d+(\.\d{1,2})?$).
  const [values, setValues]     = useState<Record<PriceCurrency, string>>({
    SYP: originalFor('SYP'),
    USD: originalFor('USD'),
  });
  const [originals, setOriginals] = useState<Record<PriceCurrency, string>>({
    SYP: originalFor('SYP'),
    USD: originalFor('USD'),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Only changed currencies PUT — an untouched empty field ("غير مسعّر") stays absent.
    const changed = PRICE_CURRENCIES.filter((cur) => values[cur].trim() !== originals[cur]);
    if (changed.length === 0) { onClose(); return; }

    for (const cur of changed) {
      const v = values[cur].trim();
      if (!PRICE_RE.test(v) || Number(v) <= 0) {
        toast.error(`سعر ${CURRENCY_LABEL_AR[cur]} غير صالح — رقم موجب بحد أقصى خانتين عشريتين.`);
        return;
      }
    }

    setSaving(true);
    let savedAny = false;
    try {
      for (const cur of changed) {
        try {
          await adminDopingsService.setPackagePrice(pkg.id, cur, values[cur].trim());
          savedAny = true;
          // Lock in the saved value so a later partial failure doesn't re-PUT it.
          setOriginals((prev) => ({ ...prev, [cur]: values[cur].trim() }));
        } catch (err) {
          toast.error(`تعذّر حفظ سعر ${CURRENCY_LABEL_AR[cur]} — ${err instanceof Error ? err.message : 'حاول مجدداً'}`);
          if (savedAny) onSaved();
          return; // keep the modal open; the failed field is still editable
        }
      }
      toast.success('تم تحديث الأسعار.');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', meta.iconBg)}>
              <MetaIcon className={cn('w-4 h-4', meta.iconColor)} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">تعديل الأسعار</h3>
              <p className="text-xs text-gray-500">{meta.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {PRICE_CURRENCIES.map((cur) => (
          <div key={cur} className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              السعر الأسبوعي — {CURRENCY_LABEL_AR[cur]}
            </label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={values[cur]}
              onChange={(e) => setValues((prev) => ({ ...prev, [cur]: e.target.value }))}
              className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-end focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
              placeholder={originals[cur] === '' ? 'غير مسعّر — أدخل قيمة لإنشائه' : '0'}
              autoFocus={cur === 'SYP'}
            />
          </div>
        ))}

        <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-relaxed mb-4">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          السعران مستقلان تماماً — لا يوجد تحويل تلقائي بين العملتين. من يدفع بالليرة يُحاسب
          بسعر الليرة، ومن يدفع بالدولار بسعر الدولار.
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

// ── Package card ──────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit }: { pkg: DopingPackage; onEdit: () => void }) {
  const meta = dopingMeta(pkg.type);
  const MetaIcon = meta.icon;

  return (
    <div className="bg-white shadow-pebble rounded-card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.iconBg)}>
          <MetaIcon className={cn('w-5 h-5', meta.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          {/* Shared Arabic label; backend `name` (Turkish seeds) only as unknown-type fallback */}
          <p className="text-sm font-bold text-gray-900 truncate">
            {meta.label !== pkg.type ? meta.label : pkg.name}
          </p>
        </div>
        {pkg.isActive ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            نشط
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" />
            موقوف
          </span>
        )}
      </div>

      {/* Two independent manually-set prices — no FX between them */}
      <div>
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">السعر الأسبوعي</p>
        <div className="grid grid-cols-2 gap-2">
          {PRICE_CURRENCIES.map((cur) => {
            const row = pkg.prices.find((r) => r.currency === cur);
            return (
              <div key={cur} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                <p className="text-[10px] text-gray-400 font-semibold">{CURRENCY_LABEL_AR[cur]}</p>
                {row ? (
                  <p className="text-base font-extrabold text-gray-900 leading-tight mt-0.5" dir="ltr">
                    {formatMoney(row.pricePerWeek, cur)}
                    {!row.isActive && <span className="ms-1 text-[10px] font-semibold text-amber-600" dir="rtl">موقوف</span>}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-gray-300 mt-0.5">غير مسعّر</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

// ── Active dopings tab ────────────────────────────────────────────────────────

function ActiveDopingsTab() {
  const [dopings,     setDopings]     = useState<ActiveDoping[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [typeFilter,  setTypeFilter]  = useState('');
  const [statusFilter,setStatusFilter]= useState('');

  useEffect(() => {
    setLoading(true);
    adminDopingsService
      .getActive({ dopingType: typeFilter || undefined, status: statusFilter || undefined })
      .then((res) => setDopings(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('[AdminDopings] fetch error:', err);
        toast.error('تعذّر تحميل البيانات.');
        setDopings([]);
      })
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  const now = Date.now();

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none cursor-pointer"
          >
            {DOPING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none cursor-pointer"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهٍ</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="ml-auto flex items-center text-xs text-gray-500 gap-1">
          <span className="font-semibold text-gray-800">{dopings.length}</span> سجل
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-pebble overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['الإعلان', 'البائع', 'نوع التمييز', 'البداية', 'النهاية', 'الحالة'].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : dopings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertTriangle className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">لا توجد سجلات</p>
                      <p className="text-xs">جرّب تغيير المرشّحات.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dopings.map((d) => {
                  if (!d) return null;
                  const raw   = d as unknown as Record<string, unknown>;
                  const user  = raw.user as { profile?: { firstName?: string }; email?: string } | undefined;

                  // ── Resolve display fields safely ──────────────────────────
                  const displayId = (d.listingId || d.id || '').slice(0, 8);
                  const title     = d.listingTitle || (raw.title as string) || 'بلا عنوان';
                  const seller    = d.sellerName || user?.profile?.firstName || user?.email || 'بائع غير معروف';
                  const email     = d.sellerEmail || user?.email || '';

                  // ── Derive doping type from listing flags ──────────────────
                  // Backend returns Listing objects; doping info is encoded in
                  // boolean flags and date fields on the listing itself.
                  const ts = (field: unknown) =>
                    typeof field === 'string' ? new Date(field).getTime() : 0;

                  let typeName = '-';
                  let endDate: string | null = null;
                  let isActive = false;

                  const toStr = (v: Date | string | null | undefined): string | null =>
                    v instanceof Date ? v.toISOString() : (v ?? null);

                  if (d.homepageShowcaseUntil && ts(d.homepageShowcaseUntil) > now) {
                    typeName = 'واجهة الرئيسية'; endDate = toStr(d.homepageShowcaseUntil); isActive = true;
                  } else if (d.categoryShowcaseUntil && ts(d.categoryShowcaseUntil) > now) {
                    typeName = 'واجهة القسم'; endDate = toStr(d.categoryShowcaseUntil); isActive = true;
                  } else if (d.topOfSearchUntil && ts(d.topOfSearchUntil) > now) {
                    typeName = 'تصدّر البحث'; endDate = toStr(d.topOfSearchUntil); isActive = true;
                  } else if (d.isUrgent) {
                    typeName = 'إعلان عاجل'; isActive = true;
                  } else if (d.hasHighlightFrame) {
                    typeName = 'خط عريض وإطار'; isActive = true;
                  }

                  // Map typeName → shared dopingMeta for the icon; badge colors are local
                  const typeKey = typeName === 'واجهة الرئيسية' ? 'HOMEPAGE'
                    : typeName === 'واجهة القسم'    ? 'CATEGORY'
                    : typeName === 'تصدّر البحث'    ? 'TOP_OF_SEARCH'
                    : typeName === 'إعلان عاجل'     ? 'URGENT'
                    : typeName === 'خط عريض وإطار'  ? 'HIGHLIGHT'
                    : null;
                  const meta = typeKey ? dopingMeta(typeKey) : null;
                  const MetaIcon = meta?.icon;

                  // ── Start date: prefer updatedAt, fall back to createdAt ──
                  const startDateStr = (raw.updatedAt as string) || (raw.createdAt as string) || null;

                  return (
                    <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      {/* İlan */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-gray-900 truncate text-[13px]">{title}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{displayId}{displayId ? '…' : ''}</p>
                      </td>

                      {/* Satıcı */}
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-gray-800">{seller}</p>
                        <p className="text-[11px] text-gray-400">{email}</p>
                      </td>

                      {/* Tür */}
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full', (typeKey && BADGE_BG[typeKey]) || 'bg-gray-100 text-gray-600')}>
                          {MetaIcon && <MetaIcon className="w-3 h-3" />}
                          {typeName}
                        </span>
                      </td>

                      {/* Başlangıç */}
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                        {startDateStr
                          ? new Date(startDateStr).toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Bitiş */}
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                        {endDate
                          ? new Date(endDate).toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            <XCircle className="w-3 h-3" />
                            منتهٍ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Price management tab ──────────────────────────────────────────────────────

function PriceManagementTab() {
  const [packages,  setPackages]  = useState<DopingPackage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editPkg,   setEditPkg]   = useState<DopingPackage | null>(null);

  const load = () => {
    adminDopingsService
      .getPackages()
      .then(setPackages)
      .catch((err) => {
        console.error('[AdminDopings] packages error:', err);
        toast.error('تعذّر تحميل الباقات.');
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <>
      {editPkg && (
        <PriceModal
          pkg={editPkg}
          onClose={() => setEditPkg(null)}
          onSaved={load}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            لكل باقة سعران أسبوعيان مستقلان (ليرة ودولار) يُحدَّدان يدوياً — هما ما يُحاسَب به
            المشتري بحسب عملة الدفع.
          </p>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            {packages.length} باقة
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card shadow-pebble p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Package className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">لا توجد باقات معرّفة بعد.</p>
            <p className="text-xs text-gray-400">بانتظار بيانات الباقات من الخادم.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onEdit={() => setEditPkg(pkg)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'active' | 'packages';

export default function AdminDopingsPage() {
  const router          = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted,  setMounted]  = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('active');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة التمييز</h1>
            <p className="text-sm text-gray-500">تابِع عمليات التمييز النشطة وأدِر أسعار الباقات.</p>
          </div>
        </div>

        {/* Admin nav */}
        <AdminNav />

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-white shadow-pebble rounded-card p-1 w-fit">
          {([
            { key: 'active',   label: 'الإعلانات المميَّزة النشطة', icon: CheckCircle2 },
            { key: 'packages', label: 'الباقات والأسعار',          icon: Package      },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'active' ? <ActiveDopingsTab /> : <PriceManagementTab />}

      </div>
    </div>
  );
}
