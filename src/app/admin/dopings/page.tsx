'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Star, LayoutGrid, ArrowUp, Search, Flame, Type, RefreshCw,
  CheckCircle2, XCircle, Clock, Package, Pencil, X, ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  adminDopingsService,
  type ActiveDoping,
  type DopingPackage,
} from '@/services/admin-dopings.service';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOPING_TYPE_OPTIONS = [
  { value: '',                label: 'Tüm Türler' },
  { value: 'HOMEPAGE',        label: 'Anasayfa Vitrini' },
  { value: 'CATEGORY',        label: 'Kategori Vitrini' },
  { value: 'TOP_OF_SEARCH',   label: 'Üst Sıradayım' },
  { value: 'DETAILED_SEARCH', label: 'Detaylı Arama' },
  { value: 'URGENT',          label: 'Acil İlan' },
  { value: 'HIGHLIGHT',       label: 'Kalın & Çerçeve' },
  { value: 'REFRESH_DATE',    label: 'Güncelim' },
];

const DOPING_META: Record<string, { label: string; icon: React.ElementType; iconBg: string; iconColor: string; badge: string; badgeBg: string }> = {
  HOMEPAGE:        { label: 'Anasayfa Vitrini', icon: Star,       iconBg: 'bg-yellow-50', iconColor: 'text-yellow-500', badge: 'Anasayfa',   badgeBg: 'bg-yellow-100 text-yellow-800' },
  CATEGORY:        { label: 'Kategori Vitrini', icon: LayoutGrid, iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   badge: 'Kategori',   badgeBg: 'bg-blue-100 text-blue-800'   },
  TOP_OF_SEARCH:   { label: 'Üst Sıradayım',    icon: ArrowUp,    iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', badge: 'Üst Sıra',   badgeBg: 'bg-indigo-100 text-indigo-800'},
  DETAILED_SEARCH: { label: 'Detaylı Arama',    icon: Search,     iconBg: 'bg-purple-50', iconColor: 'text-purple-500', badge: 'Detaylı',    badgeBg: 'bg-purple-100 text-purple-800'},
  URGENT:          { label: 'Acil İlan',         icon: Flame,      iconBg: 'bg-red-50',    iconColor: 'text-red-500',    badge: 'Acil',       badgeBg: 'bg-red-100 text-red-800'    },
  HIGHLIGHT:       { label: 'Kalın & Çerçeve',  icon: Type,       iconBg: 'bg-orange-50', iconColor: 'text-orange-500', badge: 'Highlight',  badgeBg: 'bg-orange-100 text-orange-800'},
  REFRESH_DATE:    { label: 'Güncelim',          icon: RefreshCw,  iconBg: 'bg-green-50',  iconColor: 'text-green-500',  badge: 'Güncellendi',badgeBg: 'bg-green-100 text-green-800' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(price: number, currency: string) {
  const n = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(price);
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

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
  onSaved: (updated: DopingPackage) => void;
}) {
  const meta = DOPING_META[pkg.dopingType];
  const [price, setPrice]     = useState(String(pkg.basePrice));
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    const val = Number(price);
    if (!val || val <= 0) { toast.error('Geçerli bir fiyat girin.'); return; }
    setSaving(true);
    try {
      const res = await adminDopingsService.updatePackagePrice(pkg.id, val);
      onSaved(res.data);
      toast.success('Fiyat güncellendi.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {meta && (
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', meta.iconBg)}>
                <meta.icon className={cn('w-4 h-4', meta.iconColor)} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-gray-900">Fiyatı Güncelle</h3>
              <p className="text-xs text-gray-500">{meta?.label ?? pkg.dopingType}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {pkg.durationInWeeks && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {pkg.durationInWeeks} Haftalık Paket
          </p>
        )}

        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Taban Fiyat ({pkg.currency})
        </label>
        <input
          type="number"
          min="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors"
          placeholder="0"
          autoFocus
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Package card ──────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit }: { pkg: DopingPackage; onEdit: () => void }) {
  const meta = DOPING_META[pkg.dopingType];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta?.iconBg ?? 'bg-gray-100')}>
          {meta ? <meta.icon className={cn('w-5 h-5', meta.iconColor)} /> : <Zap className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{meta?.label ?? pkg.dopingType}</p>
          <p className="text-xs text-gray-400">
            {pkg.durationInWeeks ? `${pkg.durationInWeeks} haftalık` : 'Tek seferlik'}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Taban Fiyat</p>
          <p className="text-2xl font-extrabold text-gray-900 leading-none mt-0.5">
            {formatPrice(pkg.basePrice, pkg.currency)}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Güncelle
        </button>
      </div>
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
        toast.error('Veriler yüklenemedi.');
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
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="expired">Süresi Dolmuş</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="ml-auto flex items-center text-xs text-gray-500 gap-1">
          <span className="font-semibold text-gray-800">{dopings.length}</span> kayıt
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['İlan', 'Satıcı', 'Doping Türü', 'Başlangıç', 'Bitiş', 'Durum'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
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
                      <p className="text-sm font-medium text-gray-500">Kayıt bulunamadı</p>
                      <p className="text-xs">Filtrelerinizi değiştirmeyi deneyin.</p>
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
                  const title     = d.listingTitle || (raw.title as string) || 'İlan Başlığı Yok';
                  const seller    = d.sellerName || user?.profile?.firstName || user?.email || 'Bilinmeyen Satıcı';
                  const email     = d.sellerEmail || user?.email || '';

                  // ── Derive doping type from listing flags ──────────────────
                  // Backend returns Listing objects; doping info is encoded in
                  // boolean flags and date fields on the listing itself.
                  const ts = (field: unknown) =>
                    typeof field === 'string' ? new Date(field).getTime() : 0;

                  let typeName = '-';
                  let endDate: string | null = null;
                  let isActive = false;

                  if (d.homepageShowcaseUntil && ts(d.homepageShowcaseUntil) > now) {
                    typeName = 'Anasayfa Vitrini'; endDate = d.homepageShowcaseUntil; isActive = true;
                  } else if ((raw.categoryShowcaseUntil as string) && ts(raw.categoryShowcaseUntil) > now) {
                    typeName = 'Kategori Vitrini'; endDate = raw.categoryShowcaseUntil as string; isActive = true;
                  } else if ((raw.topOfSearchUntil as string) && ts(raw.topOfSearchUntil) > now) {
                    typeName = 'Üst Sıradayım'; endDate = raw.topOfSearchUntil as string; isActive = true;
                  } else if (d.isUrgent) {
                    typeName = 'Acil Acil'; isActive = true;
                  } else if (d.hasHighlightFrame) {
                    typeName = 'Kalın Yazı & Çerçeve'; isActive = true;
                  }

                  // Map typeName → DOPING_META for the icon/badge
                  const typeKey = typeName === 'Anasayfa Vitrini' ? 'HOMEPAGE'
                    : typeName === 'Kategori Vitrini'      ? 'CATEGORY'
                    : typeName === 'Üst Sıradayım'         ? 'TOP_OF_SEARCH'
                    : typeName === 'Acil Acil'             ? 'URGENT'
                    : typeName === 'Kalın Yazı & Çerçeve'  ? 'HIGHLIGHT'
                    : null;
                  const meta = typeKey ? DOPING_META[typeKey] : null;

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
                        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full', meta?.badgeBg ?? 'bg-gray-100 text-gray-600')}>
                          {meta && <meta.icon className="w-3 h-3" />}
                          {typeName}
                        </span>
                      </td>

                      {/* Başlangıç */}
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                        {startDateStr
                          ? new Date(startDateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Bitiş */}
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600">
                        {endDate
                          ? new Date(endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            <XCircle className="w-3 h-3" />
                            Dolmuş
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

  useEffect(() => {
    adminDopingsService
      .getPackages()
      .then((res) => setPackages(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('[AdminDopings] packages error:', err);
        toast.error('Paketler yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated: DopingPackage) => {
    setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <>
      {editPkg && (
        <PriceModal
          pkg={editPkg}
          onClose={() => setEditPkg(null)}
          onSaved={handleSaved}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            Aşağıdaki paket fiyatları, kullanıcıların Doping satın alırken gördüğü taban fiyatlardır.
          </p>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            {packages.length} paket
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Package className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Henüz paket tanımlanmamış.</p>
            <p className="text-xs text-gray-400">Backend&apos;den paket verisi bekleyin.</p>
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
  const { user, isAuthenticated } = useAuthStore();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vitrin &amp; Doping Yönetimi</h1>
            <p className="text-sm text-gray-500">Aktif dopingleri izleyin ve paket fiyatlarını yönetin.</p>
          </div>
        </div>

        {/* Admin nav */}
        <AdminNav />

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {([
            { key: 'active',   label: 'Aktif Dopingli İlanlar', icon: CheckCircle2 },
            { key: 'packages', label: 'Paket & Fiyat Yönetimi', icon: Package      },
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
