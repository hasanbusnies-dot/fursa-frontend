'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SlidersHorizontal, X, SearchX, Search,
  Star, ChevronDown,
  Bookmark,
  MapPin, ImageOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { categoriesService } from '@/services/categories.service';
import { savedSearchesService } from '@/services/saved-searches.service';
import { markSyntheticNavigation } from '@/lib/navigation';
import { ListingCard } from '@/components/listings/ListingCard';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { CompareButton } from '@/components/listings/CompareButton';
import { FilterSidebar, EMPTY_FILTERS, hasActiveFilters } from '@/components/listings/FilterSidebar';
import type { FilterValues } from '@/components/listings/FilterSidebar';
import { ViewModeToggle, useMapViewParam, type ViewMode } from '@/components/listings/ViewModeToggle';
import ListingsMapView from '@/components/listings/ListingsMapView';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { buildListingQuery } from '@/lib/listing-query';
import { isConnectionError } from '@/lib/net-error';
import { ConnectionError } from '@/components/ui/ConnectionError';
import type { Category, Listing } from '@/types';
import { RecommendationsPopover } from '@/components/layout/RecommendationsPopover';
import { ComparePopover } from '@/components/layout/ComparePopover';

const PER_PAGE = 30;

/**
 * True when the query is a pasted ad number (رقم الإعلان) rather than free text.
 * Mirrors the backend's `parseListingNumberQuery` (src/lib/fulltext.ts): strip
 * '#', whitespace and the bidi marks that ride along when copying out of an
 * RTL UI, then require 8–20 digits. The 8-digit floor keeps genuine free-text
 * searches like "320" (BMW 320) or "2015" from being treated as ad numbers.
 * Used only to decide whether a single result should jump straight to the
 * listing — matching itself is the backend's job.
 */
const parseAdNumberQuery = (raw: string): string | null => {
  const cleaned = raw.replace(/[#\s‎‏؜‪-‮]/g, '');
  return /^\d{8,20}$/.test(cleaned) ? cleaned : null;
};

// ── URL ↔ FilterValues helpers ────────────────────────────────────────────────

function parseFiltersFromSearchParams(
  p: { get: (key: string) => string | null },
): FilterValues {
  const csv = (key: string): string[] => {
    const v = p.get(key);
    return v ? v.split(',').filter(Boolean) : [];
  };
  return {
    ...EMPTY_FILTERS,
    categoryId:    p.get('categoryId')  ?? '',
    make:          p.get('make')        ?? '',
    model:         p.get('model')       ?? '',
    city:          p.get('city')        ?? '',
    district:      p.get('district')    ?? '',
    minPrice:      p.get('minPrice')    ?? '',
    maxPrice:      p.get('maxPrice')    ?? '',
    currency:      (p.get('currency') as 'SYP' | 'USD') ?? 'SYP',
    minYear:       p.get('minYear')     ?? '',
    maxYear:       p.get('maxYear')     ?? '',
    minMileage:    p.get('minMileage')  ?? '',
    maxMileage:    p.get('maxMileage')  ?? '',
    fuelTypes:     csv('fuelType'),
    transmissions: csv('transmission'),
    conditions:    csv('condition'),
    bodyType:      p.get('bodyType')    ?? '',
    drivetrains:   csv('drivetrain'),
    colors:        csv('color'),
    warranty:      (p.get('warranty')    as '' | 'true' | 'false') ?? '',
    heavyDamage:   (p.get('heavyDamage') as '' | 'true' | 'false') ?? '',
    tradeIn:       (p.get('tradeIn')     as '' | 'true' | 'false') ?? '',
    fromWhos:      csv('fromWho'),
  };
}

function filtersToSearch(f: FilterValues, page = 1, extras?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (f.categoryId)           p.set('categoryId',   f.categoryId);
  if (f.make)                 p.set('make',          f.make);
  if (f.model)                p.set('model',         f.model);
  if (f.city)                 p.set('city',          f.city);
  if (f.district)             p.set('district',      f.district);
  if (f.minPrice)             p.set('minPrice',      f.minPrice);
  if (f.maxPrice)             p.set('maxPrice',      f.maxPrice);
  if (f.currency !== 'SYP')   p.set('currency',      f.currency);
  if (f.minYear)              p.set('minYear',       f.minYear);
  if (f.maxYear)              p.set('maxYear',       f.maxYear);
  if (f.minMileage)           p.set('minMileage',    f.minMileage);
  if (f.maxMileage)           p.set('maxMileage',    f.maxMileage);
  if (f.fuelTypes.length)     p.set('fuelType',      f.fuelTypes.join(','));
  if (f.transmissions.length) p.set('transmission',  f.transmissions.join(','));
  if (f.conditions.length)    p.set('condition',     f.conditions.join(','));
  if (f.bodyType)             p.set('bodyType',      f.bodyType);
  if (f.drivetrains.length)   p.set('drivetrain',    f.drivetrains.join(','));
  if (f.colors.length)        p.set('color',         f.colors.join(','));
  if (f.warranty)             p.set('warranty',      f.warranty);
  if (f.heavyDamage)          p.set('heavyDamage',   f.heavyDamage);
  if (f.tradeIn)              p.set('tradeIn',       f.tradeIn);
  if (f.fromWhos.length)      p.set('fromWho',       f.fromWhos.join(','));
  if (page > 1)               p.set('page',          String(page));
  if (extras) Object.entries(extras).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-card shadow-pebble overflow-hidden">
      <div className="bg-gray-200 h-44 w-full animate-pulse" />
      <div className="p-4 space-y-2.5">
        <div className="bg-gray-200 h-4 rounded-md w-3/4 animate-pulse" />
        <div className="bg-gray-200 h-5 rounded-md w-1/3 animate-pulse" />
        <div className="bg-gray-200 h-3 rounded-md w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

// ── Active filter chips ───────────────────────────────────────────────────────

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

/** Quick-links sub-header entries that are desktop-only (أبحاثي المحفوظة). */
const QUICK_LINK_CLS =
  'group hidden md:flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-orange-500 transition-all whitespace-nowrap';

/** Same look, but visible at EVERY width — used by المفضلة so it stays beside قارن
 *  on phones too. Padding tightens on small screens to keep the pair on one line. */
const QUICK_LINK_PAIR_CLS =
  'group flex items-center gap-2 px-3 md:px-5 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-orange-500 transition-all whitespace-nowrap';

interface ChipProps { label: string; onRemove: () => void; }
function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-btn">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-orange-900 leading-none">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── Table layout constants ────────────────────────────────────────────────────
// Thumbnail column = 100px = 76px image + 12px left padding + 12px right padding.
// Keeping it fixed prevents the image from ever bleeding into the Marka/Model column.
// Every other column is fr-based so the grid always fills the container exactly.
//
//                thumb   make   title   yıl    km   renk  fiyat   tarih   şehir
const TABLE_COLS = '100px 1.3fr  2.2fr   58px   1fr  0.9fr  1.3fr  0.9fr   1fr';

// align drives BOTH the header label and the data cell — one source of truth.
const TABLE_HEADERS: { label: string; align: 'left' | 'center' }[] = [
  { label: '',                    align: 'left'   }, // thumbnail (blank)
  { label: 'الماركة / الموديل',  align: 'left'   },
  { label: 'عنوان الإعلان',      align: 'left'   },
  { label: 'السنة',              align: 'center' },
  { label: 'كم',                 align: 'center' },
  { label: 'اللون',              align: 'center' },
  { label: 'السعر',              align: 'left'   },
  { label: 'التاريخ',            align: 'center' },
  { label: 'المدينة / المنطقة',  align: 'left'   },
];

// ── List-view helpers ─────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Table header ──────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div
      className="grid w-full bg-gray-100 border-b border-gray-200"
      style={{ gridTemplateColumns: TABLE_COLS }}
    >
      {TABLE_HEADERS.map((h, i) => (
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

// ── Skeleton table row ────────────────────────────────────────────────────────

function SkeletonTableRow() {
  return (
    <div
      className="grid w-full items-center border-b border-gray-100 animate-pulse"
      style={{ gridTemplateColumns: TABLE_COLS }}
    >
      <div className="pl-3 py-3 pr-2">
        <div className="w-[76px] h-[58px] rounded-field bg-gray-200" />
      </div>
      {/* 8 data columns: make, title, yıl, km, renk, fiyat, tarih, şehir */}
      {[100, 180, 40, 72, 48, 96, 56, 80].map((w, i) => (
        <div key={i} className="px-3 py-3">
          <div className="h-3 bg-gray-200 rounded" style={{ width: w }} />
          {i === 1 && <div className="h-2.5 bg-gray-100 rounded mt-2 w-16" />}
        </div>
      ))}
    </div>
  );
}

// ── Listing table row ─────────────────────────────────────────────────────────

function ListingRow({ listing, activeCategoryId }: { listing: Listing; activeCategoryId?: string }) {
  const router    = useRouter();
  const primary   = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const now = Date.now();
  const urgent    = !!listing.urgentUntil   && new Date(listing.urgentUntil).getTime()   > now;
  const highlight = !!listing.highlightUntil && new Date(listing.highlightUntil).getTime() > now;
  // VİTRİN badge: Kategori Vitrini only when browsing that exact category
  const showVitrin =
    !!activeCategoryId &&
    !!listing.categoryShowcaseUntil &&
    new Date(listing.categoryShowcaseUntil).getTime() > now;
  // Subtle "Öne Çıkan" indicator for Üst Sıradayım — no VİTRİN badge
  const showTopOfSearch =
    !!listing.topOfSearchUntil &&
    new Date(listing.topOfSearchUntil).getTime() > now;

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
        'group grid w-full items-center border-b border-gray-100 last:border-b-0',
        'cursor-pointer transition-colors',
        highlight
          ? 'bg-orange-50/40 hover:bg-orange-50/70 border-l-4 border-l-orange-400'
          : showVitrin
            ? 'bg-yellow-50/30 hover:bg-yellow-50/50'
            : 'hover:bg-blue-50/30',
      )}
      style={{ gridTemplateColumns: TABLE_COLS }}
      onClick={() => router.push(`/listings/${listing.id}`)}
    >

      {/* ① Thumbnail */}
      <div className="pl-3 py-3 pr-2 shrink-0">
        <div className="relative w-full h-[58px] rounded-field overflow-hidden bg-gray-100 border border-gray-200">
          {primary?.url ? (
            <img
              src={primary.url}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-gray-300" />
            </div>
          )}
          <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5">
            {showVitrin && (
              <span className="bg-yellow-400 text-yellow-900 text-[8px] font-extrabold px-1 py-px rounded-full font-heading leading-none">★</span>
            )}
            {urgent && (
              <span className="animate-pulse bg-red-500 text-white text-[8px] font-extrabold px-1 py-px rounded leading-none">🔥</span>
            )}
          </div>
        </div>
      </div>

      {/* ② Marka / Model */}
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

      {/* ③ İlan Başlığı — action buttons revealed on row hover, height always reserved */}
      <div className="px-3 py-2.5 min-w-0 flex flex-col justify-center">
        <div className="flex items-start gap-1.5 mb-1.5">
          {showVitrin && (
            <span className="shrink-0 bg-yellow-400 text-yellow-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full font-heading leading-none mt-px">
              ★ واجهة
            </span>
          )}
          {showTopOfSearch && !showVitrin && (
            <span className="shrink-0 bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none mt-px">
              ↑ مميّز
            </span>
          )}
          {urgent && (
            <span className="shrink-0 animate-pulse bg-yellow-400 text-yellow-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full font-heading leading-none mt-px">
              عاجل
            </span>
          )}
          <p className={cn(
            'text-[12px] line-clamp-2 leading-snug',
            highlight ? 'font-extrabold text-black' : 'font-semibold text-gray-900',
          )}>
            {listing.title}
          </p>
        </div>
        {/* Always occupies space (prevents layout shift); opacity drives visibility */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteButton listingId={listing.id} variant="card" className="w-6 h-6" />
          <CompareButton  listing={listing}       variant="card" className="w-6 h-6" />
          <span className="text-[10px] text-gray-400 select-none">المفضلة / مقارنة</span>
        </div>
      </div>

      {/* ④ Yıl */}
      <div className="px-3 py-3 text-center">
        <span className="text-[12px] font-semibold text-gray-700">
          {year ?? <span className="text-gray-300">—</span>}
        </span>
      </div>

      {/* ⑤ KM */}
      <div className="px-3 py-3 text-center">
        <span className="text-[12px] font-medium text-gray-700 tabular-nums">
          {km != null
            ? `${new Intl.NumberFormat('en-US').format(km)} كم`
            : <span className="text-gray-300">—</span>}
        </span>
      </div>

      {/* ⑥ Renk */}
      <div className="px-3 py-3 text-center">
        <span className="text-[12px] text-gray-700">
          {color ?? <span className="text-gray-300">—</span>}
        </span>
      </div>

      {/* ⑦ Fiyat */}
      <div className="px-3 py-3">
        <span className="text-[13px] font-extrabold text-blue-600 whitespace-nowrap tabular-nums">
          {formatPrice(listing.price, listing.currency)}
        </span>
      </div>

      {/* ⑧ Tarih */}
      <div className="px-3 py-3 text-center">
        <span className="text-[11px] text-gray-500 whitespace-nowrap">
          {formatDate(listing.createdAt)}
        </span>
      </div>

      {/* ⑨ İl / İlçe */}
      <div className="px-3 py-3">
        <p className="text-[11px] text-gray-600 flex items-start gap-0.5 truncate">
          <MapPin className="w-3 h-3 shrink-0 text-gray-400 mt-px" />
          <span className="truncate">{city || '—'}</span>
        </p>
      </div>

    </div>
  );
}

// ── Suspense skeleton for the full page ───────────────────────────────────────

function ListingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-6">
        <div className="flex gap-6 items-start">
          <div
            className="hidden lg:block w-72 shrink-0 bg-white rounded-card shadow-pebble animate-pulse"
            style={{ height: 'calc(100vh - 3rem)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Seller type tabs ──────────────────────────────────────────────────────────

const SELLER_TABS = [
  { value: '',           label: 'الكل' },
  { value: 'OWNER',      label: 'من المالك' },
  { value: 'DEALER',     label: 'من معرض' },
  { value: 'AUTHORIZED', label: 'من وكيل معتمد' },
] as const;

// ── Showcase filter config (frontend-only, applied after fetch) ───────────────

const SHOWCASE_META: Record<string, { label: string }> = {
  urgent_showcase: { label: '🚨 إعلانات عاجلة' },
  last_48h:        { label: '🕒 إعلانات آخر 48 ساعة' },
  one_week:        { label: '📅 إعلانات آخر أسبوع' },
  one_month:       { label: '📆 إعلانات آخر شهر' },
};

function applyShowcaseFilter(items: Listing[], showcase: string): Listing[] {
  if (!showcase || !SHOWCASE_META[showcase]) return items;
  const now = Date.now();
  const H   = 3_600_000;
  return items.filter((listing) => {
    if (showcase === 'urgent_showcase') return !!listing.urgentUntil && new Date(listing.urgentUntil).getTime() > now;
    const hoursSinceCreated = (now - new Date(listing.createdAt).getTime()) / H;
    if (showcase === 'last_48h')  return hoursSinceCreated <= 48;
    if (showcase === 'one_week')  return hoursSinceCreated <= 24 * 7;
    if (showcase === 'one_month') return hoursSinceCreated <= 24 * 30;
    return true;
  });
}

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'price_asc',  label: 'السعر: الأقل أولاً' },
  { value: 'price_desc', label: 'السعر: الأعلى أولاً' },
  { value: 'date_desc',  label: 'حسب التاريخ (الإعلانات الأحدث أولاً)' },
  { value: 'date_asc',   label: 'حسب التاريخ (الإعلانات الأقدم أولاً)' },
  { value: 'city_asc',   label: 'حسب العنوان (ترتيب أبجدي للمدن أو المناطق)' },
];

// ── Save search modal ─────────────────────────────────────────────────────────

function SaveSearchModal({
  open, defaultName, onClose, onSave,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
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
    } catch {
      // error already toasted by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">حفظ البحث</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          أعطِ هذا البحث اسماً — يمكنك الوصول إليه لاحقاً من "أبحاثي المحفوظة".
        </p>
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
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              {saving ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function ListingsContent() {
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Categories ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    categoriesService.getTree()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // ── Applied filters ─────────────────────────────────────────────────────────
  const applied = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const searchQuery    = searchParams.get('query')    ?? '';
  const sortBy         = searchParams.get('sort')     ?? '';
  const currencyFilter = searchParams.get('currency') ?? '';
  const showcaseParam  = searchParams.get('showcase') ?? '';
  const sellerIdParam  = searchParams.get('sellerId') ?? '';

  // Derive active seller tab from fromWhos
  const activeSellerTab = applied.fromWhos.length === 1 ? applied.fromWhos[0] : '';

  const [page, setPage]             = useState(1);
  // Grid/list stay local; the map lives in the URL so it can be shared and
  // survive a refresh (see ViewModeToggle). `viewMode` remembers which of the
  // two the user was on, so leaving the map returns them there rather than to a
  // default.
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('list');
  const { isMap, setMapView }       = useMapViewParam();
  const activeView: ViewMode        = isMap ? 'map' : viewMode;
  const selectView = (v: ViewMode) => {
    if (v === 'map') { setMapView(true); return; }
    setViewMode(v);
    if (isMap) setMapView(false);
  };
  const [sortOpen, setSortOpen]     = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => { setPage(1); }, [applied, searchQuery, sortBy]);

  // ── Listings fetch ──────────────────────────────────────────────────────────
  const [listings, setListings] = useState<Listing[]>([]);
  const [total,    setTotal]    = useState(0);
  const [meta,     setMeta]     = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [loading,  setLoading]  = useState(true);
  // A network failure must not render as «لا توجد إعلانات» — that reads as "we
  // searched and there is nothing", when in fact we never reached the server.
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // Set while navigating away to a single ad-number match, so the loading UI
  // isn't torn down for a frame before the route changes.
  const redirectingRef = useRef(false);

  // The filter half of the request, built ONCE and shared. The map view (S5) hands
  // this same object to `getMapPoints`, which is what keeps the two endpoints
  // asking about the same result set — see lib/listing-query.ts.
  const listingQuery = useMemo(
    () => buildListingQuery(applied, {
      query:    searchQuery,
      currency: currencyFilter,
      sort:     sortBy,
      sellerId: sellerIdParam,
    }),
    [applied, searchQuery, currencyFilter, sortBy, sellerIdParam],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setConnectionFailed(false);
    redirectingRef.current = false;
    listingsService.getListings({
      ...listingQuery,
      limit: PER_PAGE,
      page,
    }).then((result) => {
      if (cancelled) return;
      // Pasted ad number that resolves to exactly one listing → go straight to
      // it, instead of rendering a one-card result list (the sahibinden feel).
      // `replace`, not `push`: pushing would leave this search URL in history,
      // so Back would land here and immediately redirect forward again — a
      // trap. With replace, Back returns to wherever the search started.
      if (parseAdNumberQuery(searchQuery) && result.total === 1 && result.listings[0]?.id) {
        redirectingRef.current = true;
        // Replaced, not stacked — so it must not raise the in-app depth either,
        // or the listing's back button would think this search is still behind it.
        markSyntheticNavigation();
        router.replace(`/listings/${result.listings[0].id}`);
        return; // keep the loading UI up through navigation (see finally)
      }
      setListings(result.listings);
      setTotal(result.total);
      setMeta({ page: result.page, totalPages: result.totalPages, total: result.total });
    }).catch((err) => {
      if (cancelled) return;
      console.error('[ListingsPage] fetch error:', err);
      setListings([]); setTotal(0); setMeta(null);
      setConnectionFailed(isConnectionError(err));
    }).finally(() => {
      // While redirecting, stay in the loading state — clearing it would flash
      // an empty "no results" list for a frame before the route changes.
      if (!cancelled && !redirectingRef.current) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [listingQuery, page, searchQuery, retryKey]);

  // ── Derive category name for result header ──────────────────────────────────
  const categoryName = useMemo(() => {
    if (!applied.categoryId || categories.length === 0) return '';
    for (const cat of categories) {
      if (cat.id === applied.categoryId) return cat.name;
      if (cat.children) {
        for (const sub of cat.children) {
          if (sub.id === applied.categoryId) return sub.name;
        }
      }
    }
    return '';
  }, [applied.categoryId, categories]);

  // ── URL helpers ─────────────────────────────────────────────────────────────
  const handleApply = (f: FilterValues) => {
    const extras: Record<string, string> = {};
    if (sortBy)        extras.sort     = sortBy;
    if (searchQuery)   extras.query    = searchQuery;
    if (sellerIdParam) extras.sellerId = sellerIdParam;
    router.replace(`/listings${filtersToSearch(f, 1, extras)}`, { scroll: false });
  };

  const setSellerTab = (val: string) => {
    const updated = { ...applied, fromWhos: val ? [val] : [] };
    handleApply(updated);
  };

  const setSort = (val: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sort', val);
    p.delete('page');
    router.replace(`/listings?${p}`, { scroll: false });
    setSortOpen(false);
  };

  const setCurrency = (val: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set('currency', val);
    else p.delete('currency');
    p.delete('page');
    router.replace(`/listings?${p}`, { scroll: false });
  };

  // ── Filter chip helpers ─────────────────────────────────────────────────────
  const isActive = hasActiveFilters(applied);

  function removeFilter(key: keyof FilterValues, val?: string) {
    const updated = { ...applied };
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
    handleApply(updated);
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Lock body scroll while the mobile full-screen filter overlay is open.
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);

  const chips: Array<{ label: string; remove: () => void }> = [];
  if (applied.make)          chips.push({ label: `🚗 ${applied.make}`, remove: () => removeFilter('make') });
  if (applied.model)         chips.push({ label: applied.model, remove: () => removeFilter('model') });
  if (applied.city)          chips.push({ label: applied.city, remove: () => removeFilter('city') });
  if (applied.district)      chips.push({ label: applied.district, remove: () => removeFilter('district') });
  if (applied.minPrice || applied.maxPrice) {
    const range = [applied.minPrice, applied.maxPrice].filter(Boolean).join(' – ');
    chips.push({ label: `${range} ${applied.currency}`, remove: () => { removeFilter('minPrice'); removeFilter('maxPrice'); } });
  }
  if (applied.minYear || applied.maxYear) {
    chips.push({ label: `${applied.minYear || '…'} – ${applied.maxYear || '…'} سنة`, remove: () => { removeFilter('minYear'); removeFilter('maxYear'); } });
  }
  if (applied.minMileage || applied.maxMileage) {
    chips.push({ label: `${applied.minMileage || '…'} – ${applied.maxMileage || '…'} KM`, remove: () => { removeFilter('minMileage'); removeFilter('maxMileage'); } });
  }
  applied.fuelTypes.forEach((v)     => chips.push({ label: lbl(v), remove: () => removeFilter('fuelTypes', v) }));
  applied.transmissions.forEach((v) => chips.push({ label: lbl(v), remove: () => removeFilter('transmissions', v) }));
  applied.conditions.forEach((v)    => chips.push({ label: lbl(v), remove: () => removeFilter('conditions', v) }));
  if (applied.bodyType) chips.push({ label: lbl(applied.bodyType), remove: () => removeFilter('bodyType') });
  applied.drivetrains.forEach((v)   => chips.push({ label: lbl(v), remove: () => removeFilter('drivetrains', v) }));
  applied.colors.forEach((v)        => chips.push({ label: v, remove: () => removeFilter('colors', v) }));
  if (applied.warranty)    chips.push({ label: `كفالة: ${applied.warranty === 'true' ? 'نعم' : 'لا'}`, remove: () => removeFilter('warranty') });
  if (applied.heavyDamage) chips.push({ label: `حوادث: ${applied.heavyDamage === 'true' ? 'نعم' : 'لا'}`, remove: () => removeFilter('heavyDamage') });
  if (applied.tradeIn)     chips.push({ label: `مقايضة: ${applied.tradeIn === 'true' ? 'نعم' : 'لا'}`, remove: () => removeFilter('tradeIn') });
  applied.fromWhos.forEach((v)      => chips.push({ label: lbl(v), remove: () => removeFilter('fromWhos', v) }));

  // Result header label — showcase takes precedence when active
  const showcaseLabel = SHOWCASE_META[showcaseParam]?.label ?? '';
  const baseLabel = searchQuery
    ? `"${searchQuery}"`
    : categoryName || applied.make
      ? [applied.make, categoryName].filter(Boolean).join(' ')
      : '';
  const resultLabel = showcaseLabel
    ? [showcaseLabel, baseLabel].filter(Boolean).join(' · ')
    : baseLabel || 'جميع الإعلانات';

  // Sort label
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'ترتيب حسب';

  // Apply showcase frontend filter (pure derivation — no state, no effects)
  const displayListings = applyShowcaseFilter(listings, showcaseParam);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <SaveSearchModal
      open={saveModalOpen}
      defaultName={resultLabel}
      onClose={() => setSaveModalOpen(false)}
      onSave={async (name) => {
        try {
          await savedSearchesService.create(name, window.location.search);
          toast.success('تم حفظ البحث! يمكنك الوصول إليه من "أبحاثي المحفوظة".');
        } catch {
          toast.error('تعذّر حفظ البحث. حاول مرة أخرى.');
          throw new Error('save failed');
        }
      }}
    />
    {/* ── Quick-links sub-header ── */}
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm overflow-visible">
      <div className="w-full px-4 sm:px-6 lg:px-8 overflow-visible">
        {/* المفضلة and قارن are deliberately glued together — both are "things I've
            set aside", so they read as one pair.

            The Favorites link is NOT `hidden md:flex` like the others: it used to be,
            which meant that below 768px it vanished while ComparePopover (which has no
            breakpoint) stayed — so قارن appeared to stand alone next to حفظ البحث and
            the two were never actually adjacent on a phone. Keeping this one visible at
            every width is what makes the pairing real rather than desktop-only; its
            label shortens on small screens so the pair still fits. */}
        <div className="flex items-center">
          <Link
            href="/account/favorites"
            className={QUICK_LINK_PAIR_CLS}
          >
            <Star className="w-4 h-4 text-orange-400 transition-colors" />
            <span className="hidden sm:inline">إعلاناتي المفضلة</span>
            <span className="sm:hidden">المفضلة</span>
          </Link>
          <ComparePopover />
          <Link
            href="/account/saved-searches"
            className={QUICK_LINK_CLS}
          >
            <Bookmark className="w-4 h-4 text-orange-400 transition-colors" />
            أبحاثي المحفوظة
          </Link>
          <span className="hidden md:contents">
            <RecommendationsPopover />
          </span>
        </div>
      </div>
    </nav>

    <div className="min-h-screen bg-gray-50" onClick={() => { if (sortOpen) setSortOpen(false); }}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-5 flex items-center gap-1.5">
          <Link href="/" className="hover:text-blue-600 transition-colors">الصفحة الرئيسية</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">الإعلانات</span>
          {categoryName && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">{categoryName}</span>
            </>
          )}
        </nav>

        {/* Mobile header — the فلاتر button used to live here; it now sits beside
            حفظ البحث in the result header below. */}
        <div className="flex items-center justify-between mb-3 lg:hidden">
          <h1 className="text-xl font-bold text-gray-900">الإعلانات</h1>
        </div>

        {/* Mobile full-screen filter overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-white flex flex-col">
            <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <p className="text-base font-bold text-gray-900">فلاتر</p>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="إغلاق">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <FilterSidebar
                key={searchParams.toString()}
                categories={categories}
                applied={applied}
                onApply={(f) => { handleApply(f); setSidebarOpen(false); }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* ── Desktop sidebar ── */}
          <aside
            className="hidden lg:block w-72 shrink-0 sticky top-6"
            style={{ height: 'calc(100vh - 3rem)' }}
          >
            <div
              className="bg-white rounded-card shadow-pebble overflow-hidden h-full"
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80" style={{ height: '40px' }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                  تصفية وترتيب
                </p>
              </div>
              <div style={{ height: 'calc(100% - 40px)' }}>
                <FilterSidebar
                  key={searchParams.toString()}
                  categories={categories}
                  applied={applied}
                  onApply={handleApply}
                />
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* ── Result header ── */}
            <div className={cn(
              'rounded-2xl px-5 py-4 mb-3 flex items-center justify-between gap-4 border',
              showcaseParam === 'urgent_showcase'
                ? 'bg-red-600 border-transparent shadow-md'
                : 'bg-white border-gray-200',
            )}>
              <div>
                <h1 className={cn(
                  'text-base font-bold leading-tight',
                  showcaseParam === 'urgent_showcase' ? 'text-white' : 'text-gray-900',
                )}>
                  {resultLabel}
                </h1>
                <p className={cn(
                  'text-sm mt-0.5',
                  showcaseParam === 'urgent_showcase' ? 'text-red-100' : 'text-gray-500',
                )}>
                  {loading ? (
                    <span className={cn(
                      'inline-block h-4 w-24 rounded animate-pulse',
                      showcaseParam === 'urgent_showcase' ? 'bg-red-400' : 'bg-gray-200',
                    )} />
                  ) : (
                    <>
                      <span className={cn(
                        'font-bold',
                        showcaseParam === 'urgent_showcase' ? 'text-white' : 'text-orange-500',
                      )}>
                        {showcaseParam ? displayListings.length.toLocaleString() : total.toLocaleString()}
                      </span>
                      {' '}إعلان
                    </>
                  )}
                </p>
              </div>
              {/* حفظ البحث + فلاتر, paired at the end of the result header. فلاتر used
                  to live at the far end of the seller-tabs row, where it was squeezed
                  between a scrolling segment and the sort controls; up here it has room
                  and matches its neighbour's metrics so the two read as one pair. */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors',
                    showcaseParam === 'urgent_showcase'
                      ? 'text-red-600 bg-white border border-white hover:bg-red-50'
                      : 'text-orange-600 border border-orange-300 bg-orange-50 hover:bg-orange-100',
                  )}
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('يجب تسجيل الدخول لحفظ البحث.');
                      router.push('/login');
                      return;
                    }
                    setSaveModalOpen(true);
                  }}
                >
                  <Star className="w-3.5 h-3.5" />
                  حفظ البحث
                </button>

                {/* Mobile only — lg+ has the always-visible sidebar. */}
                <button
                  onClick={() => setSidebarOpen((o) => !o)}
                  className={cn(
                    'lg:hidden shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-colors',
                    showcaseParam === 'urgent_showcase'
                      ? 'text-red-600 bg-white border-white hover:bg-red-50'
                      : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100',
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  فلاتر
                  {isActive && <span className="w-2 h-2 bg-orange-500 rounded-full inline-block" />}
                </button>
              </div>
            </div>

            {/* ── Seller tabs ←→ view toggles / sort — ONE row ──
                NO flex-wrap, deliberately: with four Arabic tabs the segment fills a
                phone's width, and wrapping dropped everything after it onto a second
                line. The segment scrolls inside its own min-w-0 box instead, so the
                sort/currency/view controls stay on the segment's line at any width. */}
            <div className="flex items-center mb-2 gap-2">
              {/* Seller type tabs — scrolls rather than pushing the row apart */}
              <div className="flex gap-0 bg-white shadow-pebble rounded-card overflow-x-auto min-w-0 no-scrollbar">
                {SELLER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setSellerTab(tab.value)}
                    className={cn(
                      'px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                      activeSellerTab === tab.value
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Opposite end of the SAME row: view toggles + currency + sort.
                  فلاتر moved up beside حفظ البحث in the result header. */}
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                {/* Grid / List / Map toggle */}
                <ViewModeToggle value={activeView} onChange={selectView} />

                {/* Currency filter */}
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 border border-gray-200 rounded-xl pl-2.5 pr-7 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-300 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 viewBox=%220 0 24 24%22><path stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_8px_center]"
                >
                  <option value="">جميع العملات</option>
                  <option value="SYP">SYP</option>
                  <option value="USD">USD</option>
                </select>

                {/* Sort dropdown */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1.5 bg-white shadow-pebble rounded-card px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors max-w-[200px]"
                  >
                    <span className="truncate">{activeSortLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </button>
                  {sortOpen && (
                    <div className="absolute end-0 top-full mt-1 w-72 bg-white shadow-pebble rounded-card shadow-lg z-20 overflow-hidden">
                      <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">
                        ترتيب متقدم
                      </p>
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSort(opt.value)}
                          className={cn(
                            'w-full text-right px-4 py-2.5 text-xs font-medium transition-colors',
                            sortBy === opt.value
                              ? 'bg-orange-50 text-orange-600'
                              : 'text-gray-700 hover:bg-gray-50',
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

            {/* Search query banner */}
            {searchQuery && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>بحث عن: <strong>"{searchQuery}"</strong></span>
                <button
                  onClick={() => router.replace('/listings', { scroll: false })}
                  className="ms-auto p-0.5 hover:text-blue-900 transition-colors"
                  aria-label="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map((c, i) => (
                  <Chip key={i} label={c.label} onRemove={c.remove} />
                ))}
                <button
                  onClick={() => handleApply(EMPTY_FILTERS)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                >
                  مسح الكل
                </button>
              </div>
            )}

            {/* Listings — or the map, which replaces them entirely. The map runs
                its OWN unpaginated fetch, so it is deliberately not gated on the
                list's loading/empty/connection state, and the pager below is not
                rendered at all in map view: a map shows the whole matched set,
                so «صفحة 1 / 3» underneath it would be describing nothing. */}
            {isMap ? (
              <ListingsMapView
                query={listingQuery}
                // The map's ✕ returns to whichever list view the user was on and
                // clears ?view=map — the same path the toggle takes.
                onClose={() => selectView(viewMode)}
              />
            ) : loading ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <>
                  {/* Mobile: card skeletons (matches grid view & category page) */}
                  <div className="md:hidden grid grid-cols-1 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                  {/* Desktop: table skeleton */}
                  <div className="hidden md:block bg-white rounded-card shadow-pebble shadow-sm overflow-hidden">
                    <TableHeader />
                    <div className="divide-y divide-gray-100">
                      {Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} />)}
                    </div>
                  </div>
                </>
              )
            ) : connectionFailed ? (
              // Reached only when the request never got an answer — a real empty
              // result set falls through to the «لا توجد إعلانات» state below.
              <ConnectionError
                onRetry={() => setRetryKey((k) => k + 1)}
                description="تعذّر تحميل الإعلانات. تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى."
              />
            ) : displayListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-gray-400 gap-3">
                <SearchX className="w-10 h-10" />
                <p className="text-base font-medium text-gray-600">لا توجد إعلانات تطابق الفلاتر المحددة</p>
                {isActive && (
                  <button
                    onClick={() => handleApply(EMPTY_FILTERS)}
                    className="text-sm text-orange-500 hover:text-orange-700 font-medium mt-1"
                  >
                    مسح الفلاتر
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {[...displayListings].sort((a, b) => {
                    const t = Date.now();
                    // Kategori Vitrini (score 2) only when a category is filtered
                    const catA = applied.categoryId && !!a.categoryShowcaseUntil && new Date(a.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                    const catB = applied.categoryId && !!b.categoryShowcaseUntil && new Date(b.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                    // Üst Sıradayım (score 1) always in search results
                    const topA = !catA && !!a.topOfSearchUntil && new Date(a.topOfSearchUntil).getTime() > t ? 1 : 0;
                    const topB = !catB && !!b.topOfSearchUntil && new Date(b.topOfSearchUntil).getTime() > t ? 1 : 0;
                    return (catB + topB) - (catA + topA);
                  }).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      showcaseContext={applied.categoryId ? 'category' : undefined}
                      isHomepageView={false}
                      // Two-up on a phone needs the stacked card; a row card at ~160px wide is unreadable.
                      layout="stacked"
                    />
                  ))}
                </div>
                {meta && meta.totalPages >= 1 && (
                  <div className="flex justify-center items-center space-x-4 py-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                    >
                      السابق
                    </button>
                    <span className="text-gray-600 font-medium">
                      صفحة {page} / {meta.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Mobile: card layout (matches grid view & category page) */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {[...displayListings].sort((a, b) => {
                    const t = Date.now();
                    const catA = applied.categoryId && !!a.categoryShowcaseUntil && new Date(a.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                    const catB = applied.categoryId && !!b.categoryShowcaseUntil && new Date(b.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                    const topA = !catA && !!a.topOfSearchUntil && new Date(a.topOfSearchUntil).getTime() > t ? 1 : 0;
                    const topB = !catB && !!b.topOfSearchUntil && new Date(b.topOfSearchUntil).getTime() > t ? 1 : 0;
                    return (catB + topB) - (catA + topA);
                  }).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      showcaseContext={applied.categoryId ? 'category' : undefined}
                      isHomepageView={false}
                    />
                  ))}
                </div>
                {/* Desktop: table layout (unchanged) */}
                <div className="hidden md:block bg-white rounded-card shadow-pebble shadow-sm overflow-hidden">
                  <TableHeader />
                  <div className="divide-y divide-gray-100">
                    {[...displayListings].sort((a, b) => {
                      const t = Date.now();
                      const catA = applied.categoryId && !!a.categoryShowcaseUntil && new Date(a.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                      const catB = applied.categoryId && !!b.categoryShowcaseUntil && new Date(b.categoryShowcaseUntil).getTime() > t ? 2 : 0;
                      const topA = !catA && !!a.topOfSearchUntil && new Date(a.topOfSearchUntil).getTime() > t ? 1 : 0;
                      const topB = !catB && !!b.topOfSearchUntil && new Date(b.topOfSearchUntil).getTime() > t ? 1 : 0;
                      return (catB + topB) - (catA + topA);
                    }).map((listing) => (
                      <ListingRow
                        key={listing.id}
                        listing={listing}
                        activeCategoryId={applied.categoryId || undefined}
                      />
                    ))}
                  </div>
                </div>
                {meta && meta.totalPages >= 1 && (
                  <div className="flex justify-center items-center space-x-4 py-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                    >
                      السابق
                    </button>
                    <span className="text-gray-600 font-medium">
                      صفحة {page} / {meta.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ListingsPage() {
  return (
    <Suspense fallback={<ListingsPageSkeleton />}>
      <ListingsContent />
    </Suspense>
  );
}
