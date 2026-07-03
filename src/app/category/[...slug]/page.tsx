'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Home, ChevronLeft, SlidersHorizontal, X, SearchX,
  Star, LayoutGrid, List, ChevronDown, MapPin, ImageOff, Bookmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { categoriesService } from '@/services/categories.service';
import { catalogService, type CatalogNode, type CatalogPathNode } from '@/services/catalog.service';
import { savedSearchesService } from '@/services/saved-searches.service';
import { ListingCard } from '@/components/listings/ListingCard';
import { useMobileTitle } from '@/components/layout/MobileTopBar';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { CompareButton } from '@/components/listings/CompareButton';
import { FilterSidebar, EMPTY_FILTERS, hasActiveFilters } from '@/components/listings/FilterSidebar';
import type { FilterValues } from '@/components/listings/FilterSidebar';
import { RecommendationsPopover } from '@/components/layout/RecommendationsPopover';
import { ComparePopover } from '@/components/layout/ComparePopover';
import ProjectsLandingPage from '@/components/real-estate/ProjectsLandingPage';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import type { Category, Listing } from '@/types';

// ── Table layout ──────────────────────────────────────────────────────────────

type TableHeaderDef = { label: string; align: 'left' | 'center' };

const VEHICLE_TABLE_COLS    = '100px 1.3fr 2.2fr 58px 1fr 0.9fr 1.3fr 0.9fr 1fr';
const REALESTATE_TABLE_COLS = '100px 2.8fr 1.3fr 0.9fr 1fr';

const VEHICLE_TABLE_HEADERS: TableHeaderDef[] = [
  { label: '',                   align: 'left'   },
  { label: 'الماركة / الموديل', align: 'left'   },
  { label: 'عنوان الإعلان',     align: 'left'   },
  { label: 'السنة',             align: 'center' },
  { label: 'كم',                align: 'center' },
  { label: 'اللون',             align: 'center' },
  { label: 'السعر',             align: 'left'   },
  { label: 'التاريخ',           align: 'center' },
  { label: 'المدينة / المنطقة', align: 'left'   },
];

const REALESTATE_TABLE_HEADERS: TableHeaderDef[] = [
  { label: '',                   align: 'left'   },
  { label: 'عنوان الإعلان',     align: 'left'   },
  { label: 'السعر',             align: 'left'   },
  { label: 'التاريخ',           align: 'center' },
  { label: 'المدينة / المنطقة', align: 'left'   },
];

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function TableHeader({ cols, headers }: { cols: string; headers: TableHeaderDef[] }) {
  return (
    <div className="grid w-full bg-gray-100 border-b border-gray-200" style={{ gridTemplateColumns: cols }}>
      {headers.map((h, i) => (
        <div
          key={i}
          className={cn(
            'py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none',
            i === 0 ? 'pl-3 pr-2' : 'px-3',
            h.align === 'center' && 'text-center',
          )}
        >
          {h.label}
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-200 h-44 w-full animate-pulse" />
      <div className="p-4 space-y-2.5">
        <div className="bg-gray-200 h-4 rounded-md w-3/4 animate-pulse" />
        <div className="bg-gray-200 h-5 rounded-md w-1/3 animate-pulse" />
        <div className="bg-gray-200 h-3 rounded-md w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonTableRow({ cols, isRealEstate }: { cols: string; isRealEstate?: boolean }) {
  const textWidths = isRealEstate ? [200, 80, 60, 90] : [100, 180, 40, 72, 48, 96, 56, 80];
  return (
    <div className="grid w-full items-center border-b border-gray-100 animate-pulse" style={{ gridTemplateColumns: cols }}>
      <div className="pl-3 py-3 pr-2">
        <div className="w-[76px] h-[58px] rounded-lg bg-gray-200" />
      </div>
      {textWidths.map((w, i) => (
        <div key={i} className="px-3 py-3">
          <div className="h-3 bg-gray-200 rounded" style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

function ListingRow({ listing, activeCategoryId, cols, isRealEstate }: { listing: Listing; activeCategoryId?: string; cols: string; isRealEstate?: boolean }) {
  const router  = useRouter();
  const primary = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const now = Date.now();
  const urgent  = !!listing.urgentUntil   && new Date(listing.urgentUntil).getTime()   > now;
  const highlight = !!listing.highlightUntil && new Date(listing.highlightUntil).getTime() > now;
  const showVitrin =
    !!activeCategoryId && !!listing.categoryShowcaseUntil &&
    new Date(listing.categoryShowcaseUntil).getTime() > now;
  const showTopOfSearch =
    !!listing.topOfSearchUntil && new Date(listing.topOfSearchUntil).getTime() > now;

  const vd        = listing.vehicleDetails;
  const make      = vd?.make    ?? listing.make  ?? '';
  const model     = vd?.model   ?? listing.model ?? '';
  const makeModel = make || model;
  const year      = vd?.year    ?? listing.year;
  const km        = vd?.mileage ?? listing.mileage;
  const color     = vd?.color   ?? listing.color;
  const city      = [listing.city, listing.district].filter(Boolean).join(' / ');

  return (
    <div
      className={cn(
        'group grid w-full items-center border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors',
        highlight
          ? 'bg-orange-50/40 hover:bg-orange-50/70 border-l-4 border-l-orange-400'
          : showVitrin
            ? 'bg-yellow-50/30 hover:bg-yellow-50/50'
            : 'hover:bg-blue-50/30',
      )}
      style={{ gridTemplateColumns: cols }}
      onClick={() => router.push(`/listings/${listing.id}`)}
    >
      <div className="pl-3 py-3 pr-2 shrink-0">
        <div className="relative w-full h-[58px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {primary?.url ? (
            <img src={primary.url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-gray-300" />
            </div>
          )}
          <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5">
            {showVitrin && <span className="bg-yellow-400 text-yellow-900 text-[8px] font-extrabold px-1 py-px rounded leading-none">★</span>}
            {urgent && <span className="animate-pulse bg-red-500 text-white text-[8px] font-extrabold px-1 py-px rounded leading-none">🚨</span>}
          </div>
        </div>
      </div>

      {!isRealEstate && (
        <div className="px-3 py-3 min-w-0">
          {makeModel ? (
            <>
              <p className="text-[12px] font-semibold text-gray-800 truncate">{make}</p>
              <p className="text-[11px] text-gray-500 truncate">{model}</p>
            </>
          ) : (
            <span className="text-[12px] text-gray-300">—</span>
          )}
        </div>
      )}

      <div className="px-3 py-2.5 min-w-0 flex flex-col justify-center">
        <div className="flex items-start gap-1.5 mb-1.5">
          {showVitrin && (
            <span className="shrink-0 bg-yellow-400 text-yellow-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none mt-px">★ واجهة</span>
          )}
          {showTopOfSearch && !showVitrin && (
            <span className="shrink-0 bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none mt-px">↑ مميّز</span>
          )}
          {urgent && (
            <span className="shrink-0 animate-pulse bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none mt-px">عاجل</span>
          )}
          <p className={cn('text-[12px] line-clamp-2 leading-snug', highlight ? 'font-extrabold text-black' : 'font-semibold text-gray-900')}>
            {listing.title}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton listingId={listing.id} variant="card" className="w-6 h-6" />
          <CompareButton  listing={listing}       variant="card" className="w-6 h-6" />
          <span className="text-[10px] text-gray-400 select-none">المفضلة / مقارنة</span>
        </div>
      </div>

      {!isRealEstate && (
        <div className="px-3 py-3 text-center">
          <span className="text-[12px] font-semibold text-gray-700">{year ?? <span className="text-gray-300">—</span>}</span>
        </div>
      )}

      {!isRealEstate && (
        <div className="px-3 py-3 text-center">
          <span className="text-[12px] font-medium text-gray-700 tabular-nums">
            {km != null ? `${new Intl.NumberFormat('en-US').format(km)} كم` : <span className="text-gray-300">—</span>}
          </span>
        </div>
      )}

      {!isRealEstate && (
        <div className="px-3 py-3 text-center">
          <span className="text-[12px] text-gray-700">{color ?? <span className="text-gray-300">—</span>}</span>
        </div>
      )}

      <div className="px-3 py-3">
        <span className="text-[13px] font-extrabold text-blue-600 whitespace-nowrap tabular-nums">
          {formatPrice(listing.price, listing.currency)}
        </span>
      </div>

      <div className="px-3 py-3 text-center">
        <span className="text-[11px] text-gray-500 whitespace-nowrap">{formatDate(listing.createdAt)}</span>
      </div>

      <div className="px-3 py-3">
        <p className="text-[11px] text-gray-600 flex items-start gap-0.5 truncate">
          <MapPin className="w-3 h-3 shrink-0 text-gray-400 mt-px" />
          <span className="truncate">{city || '—'}</span>
        </p>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE = 30;

const SELLER_TABS = [
  { value: '',           label: 'الكل' },
  { value: 'OWNER',      label: 'من المالك' },
  { value: 'DEALER',     label: 'من معرض' },
  { value: 'AUTHORIZED', label: 'من وكيل معتمد' },
] as const;

const SORT_OPTIONS = [
  { value: 'price_asc',  label: 'السعر: الأقل أولاً' },
  { value: 'price_desc', label: 'السعر: الأعلى أولاً' },
  { value: 'date_desc',  label: 'حسب التاريخ (الأحدث أولاً)' },
  { value: 'date_asc',   label: 'حسب التاريخ (الأقدم أولاً)' },
  { value: 'city_asc',   label: 'حسب المدينة (أبجدي)' },
];

const ENUM_LABEL: Record<string, string> = {
  GASOLINE: 'بنزين', DIESEL: 'ديزل', LPG: 'غاز', HYBRID: 'هجين', ELECTRIC: 'كهربائي', OTHER: 'أخرى',
  MANUAL: 'يدوي', AUTOMATIC: 'أوتوماتيك', SEMI_AUTOMATIC: 'نصف أوتوماتيك', CVT: 'CVT',
  USED: 'مستعمل', NEW: 'جديد',
  SEDAN: 'سيدان', HATCHBACK: 'هاتشباك', SUV: 'SUV', WAGON: 'ستيشن واغن',
  COUPE: 'كوبيه', CONVERTIBLE: 'كشف', VAN: 'فان', PICKUP: 'بيكاب', MINIVAN: 'ميني فان',
  FWD: 'دفع أمامي', RWD: 'دفع خلفي', AWD: 'AWD', FOUR_WD: '4WD',
  OWNER: 'من المالك', DEALER: 'من معرض', RENTAL: 'إيجار', AUTHORIZED: 'وكيل معتمد',
};
const lbl = (v: string) => ENUM_LABEL[v] ?? v;

interface ChipProps { label: string; onRemove: () => void; }
function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-orange-900 leading-none">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── Save search modal ─────────────────────────────────────────────────────────

function SaveSearchModal({
  open, defaultName, onClose, onSave,
}: {
  open: boolean; defaultName: string; onClose: () => void; onSave: (name: string) => Promise<void>;
}) {
  const [name, setName]     = useState(defaultName);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch { /* already toasted */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">حفظ البحث</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">أعطِ هذا البحث اسماً — يمكنك الوصول إليه لاحقاً من "أبحاثي المحفوظة".</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم البحث</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            placeholder="مثال: سيارات SUV في دمشق"
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">إلغاء</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-60 transition-colors">
              {saving ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Child-category box (desktop branch aside) ──────────────────────────────────
// Styled to match the homepage HomeCategorySidebar box. Sits in the right-side
// slot on intermediate (branch) pages; each child links one level deeper.
function ChildCategoryBox({ title, nodes }: { title: string; nodes: CatalogNode[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">{title}</p>
      </div>
      <div className="py-2">
        {nodes.map((n) => (
          <Link
            key={n.slug}
            href={`/category/${n.slug}`}
            className="flex items-center justify-between gap-2 px-4 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-100/40 transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              <span className="truncate">{n.nameAr}</span>
            </span>
            <span className="text-xs text-gray-400 shrink-0">{n.count.toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CategoryPage() {
  const params          = useParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const searchParams  = useSearchParams();
  const forceListings = searchParams.get('view') === 'listings';

  const slugArr  = Array.isArray(params.slug) ? params.slug : [params.slug as string];
  const lastSlug = slugArr[slugArr.length - 1] ?? '';

  // ── Off-plan-projects: mode switch (custom landing vs filtered listings) ──────
  // The catalog node `off-plan-projects` (مشاريع قيد التطوير) keeps the old dedicated
  // ProjectsLandingPage design. Bare URL → the landing; any search param (or ?view=listings)
  // → the normal catalog listings view for the leaf, so the landing's search/city links
  // stay inside the catalog. (The old /category/real-estate/projects route also still
  // renders the landing directly, as an alias.)
  const isOffPlanProjects   = lastSlug === 'off-plan-projects';
  const projectCity         = searchParams.get('city')     ?? '';
  const projectDistrict     = searchParams.get('district') ?? '';
  const projectSearchActive = isOffPlanProjects && (
    forceListings ||
    !!(projectCity || projectDistrict || searchParams.get('rooms') || searchParams.get('status'))
  );
  const showProjectsLanding = isOffPlanProjects && !projectSearchActive;

  // ── Catalog resolution — drives drill-down (branch) vs listings (leaf) ───────
  // The last URL segment is the catalog node slug. getPath gives the breadcrumb
  // chain (and the categoryId for listing queries); getChildren gives the nodes
  // to drill into. No children ⇒ leaf ⇒ show listings.
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'notfound' | 'branch' | 'leaf'>('loading');
  const [catalogPath,   setCatalogPath]   = useState<CatalogPathNode[]>([]);
  const [childNodes,    setChildNodes]    = useState<CatalogNode[]>([]);

  const pageTitle    = catalogPath[catalogPath.length - 1]?.nameAr ?? '';
  useMobileTitle(pageTitle);
  const isRealEstate = catalogPath[0]?.slug === 'real-estate';
  const isRentalSuv  = false;
  const tableCols    = isRealEstate ? REALESTATE_TABLE_COLS    : VEHICLE_TABLE_COLS;
  const tableHeaders = isRealEstate ? REALESTATE_TABLE_HEADERS : VEHICLE_TABLE_HEADERS;
  // Branch nodes drill down (child-category box on desktop); leaf nodes — and a
  // branch viewed with ?view=listings — show the filters + listings view.
  const isBranchView   = catalogStatus === 'branch' && !forceListings;
  const showListings    = catalogStatus === 'leaf' || (catalogStatus === 'branch' && forceListings);

  // ── Categories ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    categoriesService.getTree().then(setCategories).catch(() => setCategories([]));
  }, []);

  // ── Resolve slug → category ID → seed filters ───────────────────────────────
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [resolvedCategoryId, setResolvedCategoryId] = useState('');
  const [slugResolved, setSlugResolved] = useState(false);

  useEffect(() => {
    setSlugResolved(false);
    setCatalogStatus('loading');
    setLoading(true);
    setListings([]);
    setTotal(0);
    setMeta(null);

    let cancelled = false;
    Promise.all([
      catalogService.getPath(lastSlug),
      catalogService.getChildren(lastSlug),
    ]).then(([path, kids]) => {
      if (cancelled) return;
      if (!path.length) { setCatalogStatus('notfound'); return; }

      // The listing's category is the deepest CATEGORY-type node in the path
      // (a leaf may be a BRAND/MODEL node); fall back to the leaf id. The backend
      // subtree-expands categoryId, so this narrows to the whole CATEGORY subtree.
      const deepestCategory = [...path].reverse().find((n) => n.type === 'CATEGORY');
      const id = (deepestCategory ?? path[path.length - 1]).id;

      // Vehicle listings are filed under the CATEGORY node (e.g. cars) with
      // make/model held as vehicleDetails attributes — NOT under BRAND/MODEL
      // category nodes. So drilling into a BRAND/MODEL must narrow via make/model
      // (the catalog node's Latin `name`, e.g. "BMW" / "A6"), not categoryId.
      const brand = path.find((n) => n.type === 'BRAND');
      const model = path.find((n) => n.type === 'MODEL');

      setCatalogPath(path);
      setChildNodes(kids);
      setResolvedCategoryId(id);
      setFilters({
        ...EMPTY_FILTERS,
        categoryId: id,
        make:  brand?.name ?? '',
        model: model?.name ?? '',
      });
      setCatalogStatus(kids.length ? 'branch' : 'leaf');
      setSlugResolved(true);
    }).catch(() => {
      if (!cancelled) setCatalogStatus('notfound');
    });

    return () => { cancelled = true; };
  }, [lastSlug]);

  // ── Off-plan-projects: seed city/district from the URL into the filters ───────
  // The landing's search + city tiles link back here with ?city=…&district=…; sync those
  // into the filter state so the listings narrow (city/district are backend-supported;
  // rooms/status ride the URL but don't server-narrow yet — the known attribute gap).
  useEffect(() => {
    if (!isOffPlanProjects || !slugResolved) return;
    setFilters((f) => ({ ...f, city: projectCity, district: projectDistrict }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugResolved, isOffPlanProjects, projectCity, projectDistrict]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [viewMode,       setViewMode]       = useState<'grid' | 'list'>('list');

  // On mobile (<768 px) default to grid — list/table view is desktop-only
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('grid');
    }
  }, []);
  const [sortBy,         setSortBy]         = useState('');
  const [sortOpen,       setSortOpen]       = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  // Lock body scroll while the mobile full-screen filter overlay is open.
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);
  const [saveModalOpen,  setSaveModalOpen]  = useState(false);
  const [page,           setPage]           = useState(1);

  // ── Listings fetch ──────────────────────────────────────────────────────────
  const [listings, setListings] = useState<Listing[]>([]);
  const [total,    setTotal]    = useState(0);
  const [meta,     setMeta]     = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { setPage(1); }, [filters, sortBy]);

  useEffect(() => {
    // Don't fetch until the slug has been resolved to a categoryId (prevents an
    // initial empty-filter request that returns all listings). Both branch and
    // leaf nodes fetch: a branch shows its category's listings alongside the
    // child-category box; a leaf shows listings alongside filters.
    if (!slugResolved) return;
    // Bare off-plan-projects renders the custom landing (below) — skip the wasted fetch.
    if (showProjectsLanding) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    const f = filters;

    // Belt-and-suspenders for EV page: always send fuelType=ELECTRIC so the
    // query is correct even when the backend categoryId doesn't exist yet.
    const evFuelType = lastSlug === 'electric' ? 'ELECTRIC' : undefined;

    listingsService.getListings({
      limit:        PER_PAGE,
      page,
      categoryId:   f.categoryId   || undefined,
      make:         f.make         || undefined,
      model:        f.model        || undefined,
      city:         f.city         || undefined,
      district:     f.district     || undefined,
      minPrice:     f.minPrice     ? Number(f.minPrice)    : undefined,
      maxPrice:     f.maxPrice     ? Number(f.maxPrice)    : undefined,
      minYear:      f.minYear      ? Number(f.minYear)     : undefined,
      maxYear:      f.maxYear      ? Number(f.maxYear)     : undefined,
      minMileage:   f.minMileage   ? Number(f.minMileage)  : undefined,
      maxMileage:   f.maxMileage   ? Number(f.maxMileage)  : undefined,
      minRange:     f.minRange     ? Number(f.minRange)    : undefined,
      maxRange:     f.maxRange     ? Number(f.maxRange)    : undefined,
      fuelType:     evFuelType ?? (f.fuelTypes.join(',') || undefined),
      transmission: f.transmissions.join(',') || undefined,
      condition:    f.conditions.join(',')    || undefined,
      bodyType:     f.bodyType     || undefined,
      drivetrain:   f.drivetrains.join(',')   || undefined,
      color:        f.colors.join(',')        || undefined,
      warranty:     f.warranty     ? f.warranty     === 'true' : undefined,
      heavyDamage:  f.heavyDamage  ? f.heavyDamage  === 'true' : undefined,
      tradeIn:      f.tradeIn      ? f.tradeIn      === 'true' : undefined,
      fromWho:      f.fromWhos.join(',')      || undefined,
      sort:         sortBy || undefined,
    }).then((result) => {
      if (cancelled) return;
      setListings(result.listings ?? []);
      setTotal(result.total ?? 0);
      setMeta({ page: result.page ?? 1, totalPages: result.totalPages ?? 1, total: result.total ?? 0 });
    }).catch(() => {
      if (cancelled) return;
      setListings([]); setTotal(0); setMeta(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [filters, page, sortBy, slugResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seller tab (maps to fromWhos filter) ────────────────────────────────────
  const activeSellerTab = filters.fromWhos.length === 1 ? filters.fromWhos[0] : '';
  const setSellerTab = useCallback((val: string) => {
    setFilters((f) => ({ ...f, fromWhos: val ? [val] : [] }));
  }, []);

  // ── Apply filters ────────────────────────────────────────────────────────────
  const handleApply = useCallback((f: FilterValues) => {
    // Always keep the slug-resolved category if user hasn't changed it explicitly
    setFilters(f);
  }, []);

  // ── Filter chips ─────────────────────────────────────────────────────────────
  const isActive = hasActiveFilters(filters);

  function removeFilter(key: keyof FilterValues, val?: string) {
    setFilters((prev) => {
      const updated = { ...prev };
      if (val !== undefined && Array.isArray(updated[key])) {
        (updated[key] as string[]) = (updated[key] as string[]).filter((v) => v !== val);
      } else if (
        key === 'minPrice' || key === 'maxPrice' || key === 'minYear' || key === 'maxYear' ||
        key === 'minMileage' || key === 'maxMileage' || key === 'city' || key === 'district' ||
        key === 'categoryId' || key === 'make' || key === 'model' || key === 'bodyType' ||
        key === 'warranty' || key === 'heavyDamage' || key === 'tradeIn'
      ) {
        (updated[key] as string) = '';
      }
      return updated;
    });
  }

  const chips: Array<{ label: string; remove: () => void }> = [];
  if (filters.make)          chips.push({ label: `🚗 ${filters.make}`, remove: () => removeFilter('make') });
  if (filters.model)         chips.push({ label: filters.model, remove: () => removeFilter('model') });
  if (filters.city)          chips.push({ label: filters.city, remove: () => removeFilter('city') });
  if (filters.district)      chips.push({ label: filters.district, remove: () => removeFilter('district') });
  if (filters.minPrice || filters.maxPrice) {
    const range = [filters.minPrice, filters.maxPrice].filter(Boolean).join(' – ');
    chips.push({ label: `${range} ${filters.currency}`, remove: () => { removeFilter('minPrice'); removeFilter('maxPrice'); } });
  }
  if (filters.minYear || filters.maxYear) {
    chips.push({ label: `${filters.minYear || '…'} – ${filters.maxYear || '…'} سنة`, remove: () => { removeFilter('minYear'); removeFilter('maxYear'); } });
  }
  if (filters.minMileage || filters.maxMileage) {
    chips.push({ label: `${filters.minMileage || '…'} – ${filters.maxMileage || '…'} KM`, remove: () => { removeFilter('minMileage'); removeFilter('maxMileage'); } });
  }
  filters.fuelTypes.forEach((v)     => chips.push({ label: lbl(v), remove: () => removeFilter('fuelTypes', v) }));
  filters.transmissions.forEach((v) => chips.push({ label: lbl(v), remove: () => removeFilter('transmissions', v) }));
  filters.conditions.forEach((v)    => chips.push({ label: lbl(v), remove: () => removeFilter('conditions', v) }));
  if (filters.bodyType) chips.push({ label: lbl(filters.bodyType), remove: () => removeFilter('bodyType') });
  filters.drivetrains.forEach((v)   => chips.push({ label: lbl(v), remove: () => removeFilter('drivetrains', v) }));
  filters.colors.forEach((v)        => chips.push({ label: v, remove: () => removeFilter('colors', v) }));
  if (filters.warranty)    chips.push({ label: `كفالة: ${filters.warranty === 'true' ? 'نعم' : 'لا'}`,  remove: () => removeFilter('warranty') });
  if (filters.heavyDamage) chips.push({ label: `حوادث: ${filters.heavyDamage === 'true' ? 'نعم' : 'لا'}`, remove: () => removeFilter('heavyDamage') });
  if (filters.tradeIn)     chips.push({ label: `مقايضة: ${filters.tradeIn === 'true' ? 'نعم' : 'لا'}`,   remove: () => removeFilter('tradeIn') });
  filters.fromWhos.forEach((v)      => chips.push({ label: lbl(v), remove: () => removeFilter('fromWhos', v) }));

  // ── Display sort / label ─────────────────────────────────────────────────────
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'ترتيب حسب';

  const displayListings = useMemo(() => {
    const t = Date.now();
    return [...listings].sort((a, b) => {
      const catA = resolvedCategoryId && !!a.categoryShowcaseUntil && new Date(a.categoryShowcaseUntil).getTime() > t ? 2 : 0;
      const catB = resolvedCategoryId && !!b.categoryShowcaseUntil && new Date(b.categoryShowcaseUntil).getTime() > t ? 2 : 0;
      const topA = !catA && !!a.topOfSearchUntil && new Date(a.topOfSearchUntil).getTime() > t ? 1 : 0;
      const topB = !catB && !!b.topOfSearchUntil && new Date(b.topOfSearchUntil).getTime() > t ? 1 : 0;
      return (catB + topB) - (catA + topA);
    });
  }, [listings, resolvedCategoryId]);

  // ── Breadcrumbs ──────────────────────────────────────────────────────────────
  // Built from the catalog path (root → current node), each segment a link to
  // that node. Grows automatically as you drill deeper.
  const crumbs = catalogPath.map((n) => ({
    label: n.nameAr,
    href:  `/category/${n.slug}`,
  }));

  // ── Reset all to slug baseline ───────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS, categoryId: resolvedCategoryId });
  }, [resolvedCategoryId]);

  // Bare off-plan-projects → the dedicated projects landing (hero + city tiles + featured
  // + developer CTA). Search params fall through to the normal listings view below.
  if (showProjectsLanding) return <ProjectsLandingPage />;

  return (
    <>
      <SaveSearchModal
        open={saveModalOpen}
        defaultName={pageTitle}
        onClose={() => setSaveModalOpen(false)}
        onSave={async (name) => {
          try {
            await savedSearchesService.create(name, `?categoryId=${resolvedCategoryId}`);
            toast.success('تم حفظ البحث! يمكنك الوصول إليه من "أبحاثي المحفوظة".');
          } catch {
            toast.error('تعذّر حفظ البحث. حاول مرة أخرى.');
            throw new Error('save failed');
          }
        }}
      />

      {/* ── Quick-links sub-header ── */}
      <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto no-scrollbar pe-2">
            {([
              { href: '/account/favorites',      Icon: Star,     label: 'إعلاناتي المفضلة',  iconCls: 'text-orange-400' },
              { href: '/account/saved-searches', Icon: Bookmark, label: 'أبحاثي المحفوظة',   iconCls: 'text-orange-400' },
            ] as const).map(({ href, Icon, label, iconCls }) => (
              <Link
                key={href}
                href={href}
                className="group shrink-0 hidden md:flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-orange-500 transition-all whitespace-nowrap"
              >
                <Icon className={`w-4 h-4 ${iconCls}`} />
                {label}
              </Link>
            ))}
            <span className="hidden md:contents">
              <RecommendationsPopover />
            </span>
            <ComparePopover />
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-gray-50" dir="rtl" onClick={() => { if (sortOpen) setSortOpen(false); }}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-5 flex-wrap">
            <Link href="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              الرئيسية
            </Link>
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                {i < crumbs.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-blue-600 transition-colors">{crumb.label}</Link>
                ) : (
                  <span className="text-gray-700 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* ── Loading (resolving the catalog node) ── */}
          {catalogStatus === 'loading' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[52px] rounded-xl border border-gray-200 bg-white animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Unknown slug ── */}
          {catalogStatus === 'notfound' && (
            <div className="flex flex-col items-center justify-center py-28 text-gray-400 gap-3">
              <SearchX className="w-10 h-10" />
              <p className="text-base font-medium text-gray-600">الفئة غير موجودة</p>
              <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">العودة إلى الرئيسية</Link>
            </div>
          )}

          {/* ── Mobile drill-down: full-width child grid (branch only). On
              desktop the children live in the right-side box instead. ── */}
          {isBranchView && (
            <div className="lg:hidden">
              <Link
                href={`/category/${lastSlug}?view=listings`}
                className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 mb-3 hover:bg-blue-100 transition-colors"
              >
                <span className="text-sm font-semibold text-blue-700">عرض جميع إعلانات {pageTitle}</span>
                <ChevronLeft className="w-4 h-4 text-blue-400 shrink-0" />
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {childNodes.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="group flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600">{c.nameAr}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{c.count.toLocaleString()}</span>
                      <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(isBranchView || showListings) && (<>

          {/* ── Mobile filter button (listings view only) ── */}
          {showListings && (
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                تصفية
                {isActive && <span className="w-2 h-2 bg-orange-500 rounded-full inline-block" />}
              </button>
            </div>
          )}

          {/* ── Mobile full-screen filter overlay (listings view only) ── */}
          {showListings && sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-[60] bg-white flex flex-col">
              <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-200">
                <p className="text-base font-bold text-gray-900">فلاتر</p>
                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="إغلاق">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <FilterSidebar
                  key={resolvedCategoryId || 'loading'}
                  categories={categories}
                  applied={filters}
                  catalogRoot={catalogPath[0]?.slug ?? ''}
                  onApply={(f) => { handleApply(f); setSidebarOpen(false); }}
                />
              </div>
            </div>
          )}

          {/* Branch: 2-column is desktop-only (mobile uses the full-width grid
              above). Leaf: 2-column on all sizes (mobile lists in the main area;
              filters live in the overlay above). */}
          <div className={cn('gap-6 items-start', isBranchView ? 'hidden lg:flex' : 'flex')}>

            {/* ── Right aside: child-category box (branch) or filters (leaf) ── */}
            {isBranchView ? (
              <aside className="hidden lg:block w-72 shrink-0 sticky top-6">
                <ChildCategoryBox title={pageTitle} nodes={childNodes} />
              </aside>
            ) : (
              <aside className="hidden lg:block w-72 shrink-0 sticky top-6" style={{ height: 'calc(100vh - 3rem)' }}>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80" style={{ height: '40px' }}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">تصفية وترتيب</p>
                  </div>
                  <div style={{ height: 'calc(100% - 40px)' }}>
                    <FilterSidebar
                      key={resolvedCategoryId || 'loading'}
                      categories={categories}
                      applied={filters}
                      catalogRoot={catalogPath[0]?.slug ?? ''}
                      onApply={handleApply}
                    />
                  </div>
                </div>
              </aside>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0">

              {/* ── Result header ── */}
              <div className="rounded-2xl px-5 py-4 mb-3 flex items-center justify-between gap-4 border bg-white border-gray-200">
                <div>
                  <h1 className="text-base font-bold leading-tight text-gray-900">{pageTitle}</h1>
                  <p className="text-sm mt-0.5 text-gray-500">
                    {loading ? (
                      <span className="inline-block h-4 w-24 rounded animate-pulse bg-gray-200" />
                    ) : (
                      <><span className="font-bold text-orange-500">{total.toLocaleString()}</span>{' '}إعلان</>
                    )}
                  </p>
                </div>
                <button
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors text-orange-600 border border-orange-300 bg-orange-50 hover:bg-orange-100"
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('يجب تسجيل الدخول لحفظ البحث.');
                      return;
                    }
                    setSaveModalOpen(true);
                  }}
                >
                  <Star className="w-3.5 h-3.5" />
                  حفظ البحث
                </button>
              </div>

              {/* ── Seller tabs + view toggles ── */}
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                {/* Seller tabs use car-dealer language (من معرض) — meaningless for
                    real-estate, where "who's selling" is المالك / مكتب عقاري / شركة بناء
                    and lives in the sidebar's catalog `الناشر` filter instead. */}
                {!isRealEstate ? (
                  <div className="flex gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0">
                    {SELLER_TABS.filter((tab) => !isRentalSuv || tab.value === '').map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setSellerTab(tab.value)}
                        className={cn(
                          'px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap',
                          activeSellerTab === tab.value ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2 ms-auto">
                  {/* Grid / List toggle */}
                  <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
                      title="عرض شبكي"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
                      title="عرض قائمة"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort dropdown */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSortOpen((o) => !o)}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors max-w-[200px]"
                    >
                      <span className="truncate">{activeSortLabel}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                    {sortOpen && (
                      <div className="absolute end-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">
                          ترتيب متقدم
                        </p>
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                            className={cn(
                              'w-full text-right px-4 py-2.5 text-xs font-medium transition-colors',
                              sortBy === opt.value ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Active filter chips ── */}
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {chips.map((c, i) => <Chip key={i} label={c.label} onRemove={c.remove} />)}
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1">مسح الكل</button>
                </div>
              )}

              {/* ── Listings ── */}
              {loading ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : (
                  <>
                    {/* Mobile: card skeletons (matches grid view & listings page) */}
                    <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    {/* Desktop: table skeleton */}
                    <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <TableHeader cols={tableCols} headers={tableHeaders} />
                      <div className="divide-y divide-gray-100">
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={tableCols} isRealEstate={isRealEstate} />)}
                      </div>
                    </div>
                  </>
                )
              ) : displayListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-gray-400 gap-3">
                  <SearchX className="w-10 h-10" />
                  <p className="text-base font-medium text-gray-600">لا توجد إعلانات تطابق الفلاتر المحددة</p>
                  {isActive && (
                    <button onClick={clearFilters} className="text-sm text-orange-500 hover:text-orange-700 font-medium mt-1">مسح الفلاتر</button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        showcaseContext={resolvedCategoryId ? 'category' : undefined}
                        isHomepageView={false}
                      />
                    ))}
                  </div>
                  {meta && (
                    <div className="flex justify-center items-center gap-4 py-10">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors">السابق</button>
                      <span className="text-gray-600 font-medium">صفحة {page} / {meta.totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors">التالي</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Mobile: card layout (matches grid view & listings page) */}
                  <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        showcaseContext={resolvedCategoryId ? 'category' : undefined}
                        isHomepageView={false}
                        buttonsPlacement="side"
                      />
                    ))}
                  </div>
                  {/* Desktop: table layout (unchanged) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <TableHeader cols={tableCols} headers={tableHeaders} />
                    <div className="divide-y divide-gray-100">
                      {displayListings.map((listing) => (
                        <ListingRow key={listing.id} listing={listing} activeCategoryId={resolvedCategoryId || undefined} cols={tableCols} isRealEstate={isRealEstate} />
                      ))}
                    </div>
                  </div>
                  {meta && (
                    <div className="flex justify-center items-center gap-4 py-10">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors">السابق</button>
                      <span className="text-gray-600 font-medium">صفحة {page} / {meta.totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors">التالي</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          </>)}

        </div>
      </div>
    </>
  );
}
