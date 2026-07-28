'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin, ChevronLeft, ChevronRight, MessageSquare,
  ImageOff, AlertCircle, Home, Phone, Calendar, Check, Settings,
  HelpCircle, Send, Tag, Store, BadgeCheck, ZoomIn, X, Copy, Navigation,
} from 'lucide-react';
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { catalogService, type CatalogFilterDef } from '@/services/catalog.service';
import { messagesService } from '@/services/messages.service';
import { qaService, questionText, maskedAskerName, askerInitials, type Question } from '@/services/qa.service';
import { offersService } from '@/services/offers.service';
import { useAuthStore } from '@/store/auth.store';
import type { Listing, VehicleDetails } from '@/types';
import {
  TECH_SPEC_VALUES, TECH_SPEC_CATEGORY_AR, techSpecLabel,
  PANEL_LABELS, STATUS_COLORS, STATUS_LABELS,
  type DamageStatus,
} from '@/components/listings/wizard/schema';
import { CarDamageDiagram } from '@/components/listings/CarDamageDiagram';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { FavoriteSellerButton } from '@/components/listings/FavoriteSellerButton';
import { CompareButton } from '@/components/listings/CompareButton';
import { ShareButton } from '@/components/listings/ShareButton';
import { isShareable } from '@/lib/share';
import { recommendationsService } from '@/services/recommendations.service';
import { useMobileTitle } from '@/components/layout/MobileTopBar';
import {
  toValidCoords,
  formatAddressLine,
  directionsUrl,
  currentPlatform,
  governorateCenter,
  isLocationMapHidden,
} from '@/lib/map';

// maplibre-gl (~800 kB) must never enter this route's first load. `ssr: false`
// is legal here because the page is a Client Component; the import only fires
// when the location tab is opened on a listing that actually has coordinates.
const ListingMap = dynamic(() => import('@/components/listings/ListingMap'), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Damage report normalization ───────────────────────────────────────────────
// Accepts both wire spellings ({status, detail} objects or bare strings,
// UPPERCASE or legacy camelCase) and normalizes to the canonical DamageStatus
// used by the shared CarDamageDiagram + schema color/label maps.

const STATUS_NORM: Record<string, DamageStatus> = {
  ORIGINAL:      'ORIGINAL',
  PAINTED:       'PAINTED',
  LOCAL_PAINTED: 'LOCAL_PAINTED',
  REPLACED:      'REPLACED',
  original:      'ORIGINAL',
  painted:       'PAINTED',
  localPaint:    'LOCAL_PAINTED',
  replaced:      'REPLACED',
};

type DamageEntry = { status: DamageStatus; detail?: string };

function normalizeDamageReport(
  raw: Record<string, string | { status: string; detail?: string }>,
): Record<string, DamageEntry> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, val]) => {
      const s      = typeof val === 'string' ? val : val?.status ?? 'ORIGINAL';
      const detail = typeof val === 'string' ? undefined : val?.detail || undefined;
      return [key, { status: STATUS_NORM[s] ?? 'ORIGINAL', detail }];
    }),
  );
}

// ── Tech specs grouping ───────────────────────────────────────────────────────

// Keeps only the features this listing actually HAS, bucketed under their
// section, in catalog order. Values the catalog no longer knows fall into «أخرى»
// rather than being dropped.
function groupTechSpecs(flat: string[]): { category: string; items: string[] }[] {
  const groups: { category: string; items: string[] }[] = [];
  const owned = new Set(flat);
  for (const [cat, values] of Object.entries(TECH_SPEC_VALUES)) {
    const matched = values.filter((v) => owned.has(v));
    if (matched.length) groups.push({ category: cat, items: matched });
  }
  const allKnown = new Set(Object.values(TECH_SPEC_VALUES).flat());
  const other = flat.filter((s) => !allKnown.has(s));
  if (other.length) groups.push({ category: 'أخرى', items: other });
  return groups;
}

// ── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: Listing['images'] }) {
  const primaryIndex = Math.max(0, images.findIndex((img) => img.isPrimary));
  const [selected,      setSelected]      = useState(primaryIndex);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Scroll-snap strip (mobile swipe; desktop arrows/thumbs drive the same strip) ──
  // All navigation goes through scrollIntoView — never scrollLeft, whose sign is the
  // one genuinely RTL-cursed API. Native RTL scroll lays image 1 at the physical
  // right, so swipe-left = next with zero direction logic.
  const stripRef  = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToSlide = (i: number) => {
    setSelected(i); // snappy highlight; the observer re-confirms on settle
    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Sync `selected` (counter + thumbnail highlight) as swiped slides settle.
  useEffect(() => {
    if (images.length < 2) return;
    const strip = stripRef.current;
    if (!strip) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = slideRefs.current.indexOf(e.target as HTMLDivElement);
          if (i !== -1) setSelected(i);
        }
      },
      { root: strip, threshold: 0.6 },
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [images.length]);

  // Non-first primary image: start the strip there (instant, before paint matters
  // little at aspect-fixed sizes; block:'nearest' avoids scrolling the page).
  useEffect(() => {
    if (primaryIndex > 0) {
      slideRefs.current[primaryIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLightbox = () => { setLightboxIndex(selected); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lbPrev = () => setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  const lbNext = () => setLightboxIndex((i) => (i + 1) % images.length);

  // ── Lightbox swipe (mobile) ──────────────────────────────────────────────
  // The inline strip gets its swipe free from native RTL scroll-snap; the lightbox
  // is a single <img>, so the gesture is tracked by hand. Direction matches the
  // strip and the on-screen chevrons: dragging LEFT advances to the next image.
  //
  // Deliberately never calls preventDefault and bails on multi-touch, so pinch-zoom
  // on the photo keeps working — the gesture is additive, not a replacement.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const SWIPE_THRESHOLD = 50; // px of horizontal travel that commits to a change

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || images.length < 2) { touchStart.current = null; return; }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = touchStart.current;
    if (!s || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    // Vertical-dominant drag isn't a page swipe — let it be (pinch/scroll intent).
    if (Math.abs(dy) > Math.abs(dx)) return;
    setDragX(dx);
  };

  const onTouchEnd = () => {
    const dx = dragX;
    touchStart.current = null;
    setDragging(false);
    setDragX(0);
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    // Direction of travel, matching the inline gallery: its RIGHT chevron advances
    // (scrollToSlide(selected + 1)), so RIGHT is forward everywhere in this page.
    // Swiping right therefore goes to the NEXT photo. This was inverted.
    if (dx > 0) lbNext(); else lbPrev();
  };

  // Keyboard navigation + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      // Right = forward, same as the inline gallery's chevrons and the swipe above.
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'ArrowLeft')  lbPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // A stale drag offset would leave the next-opened photo visually shifted.
  useEffect(() => {
    if (!lightboxOpen) { setDragX(0); setDragging(false); touchStart.current = null; }
  }, [lightboxOpen]);

  if (!images.length) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-field flex items-center justify-center">
        <ImageOff className="w-14 h-14 text-gray-300" />
      </div>
    );
  }

  return (
    <>
      {/* ── Inline gallery ── */}
      <div>
        <div
          className="relative aspect-[4/3] bg-gray-100 rounded-field overflow-hidden group cursor-zoom-in"
          onClick={openLightbox}
        >
          {images.length > 1 ? (
            /* Swipeable strip: native scroll IS the swipe (follows the finger, snaps
               per image). overscroll-x-contain stops edge-swipes chaining into
               browser back-navigation. Touch drags never fire the container's
               click, so swiping can't accidentally open the lightbox. */
            <div
              ref={stripRef}
              className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain"
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  ref={(el) => { slideRefs.current[i] = el; }}
                  className="w-full h-full shrink-0 snap-center"
                >
                  <img
                    src={img.url}
                    alt={`صورة ${i + 1}`}
                    loading={i === primaryIndex ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <img
              src={images[0].url}
              alt="صورة 1"
              className="w-full h-full object-cover"
            />
          )}
          {/* Zoom hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
            <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-75 transition-opacity drop-shadow-lg" />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); scrollToSlide(Math.max(0, selected - 1)); }}
                disabled={selected === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); scrollToSlide(Math.min(images.length - 1, selected + 1)); }}
                disabled={selected === images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="absolute bottom-3 end-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                {selected + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                className={`shrink-0 w-[72px] h-[54px] rounded-field overflow-hidden border-2 transition-all ${
                  i === selected
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img.url} alt={`مصغرة ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center touch-pan-y"
          onClick={closeLightbox}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main image — stop propagation so clicking it doesn't close */}
          <img
            src={images[lightboxIndex].url}
            alt={`صورة ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none rounded-sm shadow-2xl"
            // The photo follows the finger, then springs back (or lands on the next
            // image) on release — without the follow, a swipe feels unresponsive.
            style={{
              transform: dragX ? `translateX(${dragX}px)` : undefined,
              transition: dragging ? 'none' : 'transform 180ms ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              {/* Right = next, left = previous — the same mapping the inline gallery
                  uses. The lightbox had these reversed relative to it, so the two
                  galleries disagreed about which way was forward. */}
              <button
                onClick={(e) => { e.stopPropagation(); lbPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                title="السابق"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lbNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                title="التالي"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-4 py-1.5 rounded-full tabular-nums select-none">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    i === lightboxIndex
                      ? 'border-white opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Damage map (shared diagram + per-panel summary) ───────────────────────────

function DamageMap({ damage }: { damage: Record<string, DamageEntry> }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <CarDamageDiagram report={damage} />

      {/* Panel summary */}
      <div className="w-full grid grid-cols-2 gap-2">
        {Object.entries(damage).map(([panel, entry]) => (
          <div
            key={panel}
            className={`flex flex-col bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 ${entry.detail ? 'col-span-2' : ''}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{PANEL_LABELS[panel] ?? panel}</span>
              <span className={`font-medium px-1.5 py-0.5 rounded shrink-0 ms-2 ${STATUS_COLORS[entry.status].badge}`}>
                {STATUS_LABELS[entry.status]}
              </span>
            </div>
            {entry.detail && (
              <p className="text-xs text-gray-500 mt-1">ملاحظة: {entry.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Technical Specs Grid ──────────────────────────────────────────────────────
// Section headers run full width with the features laid out beneath them in a
// grid (2 cols mobile → 3 desktop), mirroring the add-listing picker. Arabic
// labels come from the shared catalog in wizard/schema.ts — display only; the
// stored values are the English identifiers.

function TechSpecsGrid({ specs }: { specs: string[] }) {
  const groups = groupTechSpecs(specs);

  if (!groups.length) {
    return <p className="text-sm text-gray-400 text-center py-8">لا توجد مواصفات فنية مدرجة.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map(({ category, items }) => (
        <div key={category} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {TECH_SPEC_CATEGORY_AR[category as keyof typeof TECH_SPEC_CATEGORY_AR] ?? category}
            </p>
            <span className="text-xs text-gray-400">({items.length})</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-3">
            {items.map((item) => (
              <div key={item} className="flex items-start gap-2 text-[13px] sm:text-sm text-gray-700 leading-snug">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
                </span>
                <span>{techSpecLabel(item)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Enum → Arabic label map ───────────────────────────────────────────────────

const ENUM_AR: Record<string, string> = {
  USED: 'مستعمل',       NEW: 'جديد',
  SEDAN: 'سيدان',       HATCHBACK: 'هاتشباك',    SUV: 'سيارة دفع رباعي',
  WAGON: 'ستيشن واغن',  COUPE: 'كوبيه',           CONVERTIBLE: 'كشف',
  VAN: 'فان',           PICKUP: 'بيكاب',           MINIVAN: 'ميني فان',
  GASOLINE: 'بنزين',    DIESEL: 'ديزل',            LPG: 'غاز',
  HYBRID: 'هجين',       ELECTRIC: 'كهربائي',
  MANUAL: 'عادي',       AUTOMATIC: 'أوتوماتيك',
  SEMI_AUTOMATIC: 'نصف أوتوماتيك', CVT: 'CVT',
  FWD: 'دفع أمامي',    RWD: 'دفع خلفي',          AWD: 'AWD',
  FOUR_WD: 'دفع رباعي',
  OWNER: 'من المالك',   DEALER: 'من معرض',         RENTAL: 'سيارة إيجار',
  OTHER: 'أخرى',
};

const NA = 'غير محدد';

function tr(v: string | undefined | null): string {
  if (!v) return NA;
  return ENUM_AR[v] ?? v;
}

// ── Ad Specs Table ────────────────────────────────────────────────────────────

// A listing is a "vehicle" (→ the bespoke spec table) when it carries vehicleDetails or a
// top-level make; everything else (real-estate + generic) uses the attribute table below.
function isVehicleListing(listing: Listing): boolean {
  const vd = listing.vehicleDetails as VehicleDetails | undefined | null;
  return !!vd || !!listing.make;
}

// Static fallback labels for attribute keys the catalog defs don't cover (e.g. legacy
// keys). The live getFilters defs take precedence; this is only a safety net.
const ATTR_LABEL_FALLBACK: Record<string, string> = {
  rooms: 'عدد الغرف', area: 'المساحة', landArea: 'مساحة الأرض', livingRooms: 'عدد الصالونات',
  buildingAge: 'عمر البناء', floor: 'الطابق', totalFloors: 'عدد طوابق البناء',
  heating: 'التدفئة', bathrooms: 'عدد الحمامات', kitchen: 'المطبخ', balcony: 'شرفة / بلكون',
  furnished: 'مفروش', elevator: 'مصعد', parking: 'موقف سيارة', deed: 'نوع الطابو',
  frontage: 'واجهة', zoning: 'التنظيم', deposit: 'التأمين', usageStatus: 'حالة الإشغال',
  buildingStatus: 'حالة البناء', fromWho: 'الناشر', seller: 'المعلن',
};

// Render a stored attribute value: booleans → نعم/لا, numbers get the def's unit
// (area → "140 m²"), SELECT strings show as-is (already Arabic), arrays join, and a stray
// legacy {min,max} object degrades gracefully.
function formatAttrValue(value: unknown, unit?: string | null): string {
  if (value == null || value === '') return NA;
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (Array.isArray(value)) return value.length ? value.join('، ') : NA;
  if (typeof value === 'object') {
    const o = value as { min?: unknown; max?: unknown };
    const parts = [o.min, o.max].filter((x) => x != null && x !== '');
    if (!parts.length) return NA;
    return unit ? `${parts.join(' — ')} ${unit}` : parts.join(' — ');
  }
  const s = String(value);
  return unit ? `${s} ${unit}` : s;
}

/**
 * A spec table row. `value` is always the plain string — the NA sentinel check
 * and the row key both read it — while `node` optionally overrides how that
 * value is PAINTED. Rendering is `{row.node ?? row.value}` in every layout, so
 * a row can gain an icon or a hint without turning `value` into a ReactNode and
 * quietly breaking the `value === NA` styling test.
 */
type SpecRow = { label: string; value: string; node?: ReactNode };

/**
 * رقم الإعلان cell: the ad number, a copy button, and the hint telling the user
 * what the number is FOR (paste it into search to find this listing again).
 *
 * The clipboard gets `listingNumber` straight from the payload — never text
 * read back out of the DOM, which in this RTL layout would drag along bidi
 * marks and the hint. Digits only, no '#': the copy must be an exact search
 * match. (The API tolerates '#'/spaces/bidi marks anyway, but the clean value
 * is what makes paste-and-search feel instant.)
 */
function ListingNumberCell({ listingNumber }: { listingNumber: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(listingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('تم النسخ');
    } catch {
      // No clipboard API (insecure origin) or permission denied.
      toast.error('تعذّر النسخ');
    }
  };

  return (
    // inline-block (not flex): the number row and the hint below it inherit the
    // parent cell's text alignment, which differs between the mobile (text-end)
    // and desktop (start) layouts — so both read correctly without either
    // layout needing to know about this cell.
    <span className="inline-block">
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={copy}
          aria-label="نسخ رقم الإعلان"
          title="نسخ رقم الإعلان"
          className="inline-flex items-center justify-center w-8 h-8 -m-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
        >
          {copied
            ? <Check className="w-4 h-4 text-emerald-500" />
            : <Copy className="w-4 h-4" />}
        </button>
        <span dir="ltr" className="font-medium text-gray-900 tabular-nums">
          {listingNumber}
        </span>
      </span>
      <span className="block mt-0.5 text-[11px] font-normal text-gray-400 leading-tight">
        انسخ الرقم وابحث به للعثور على الإعلان
      </span>
    </span>
  );
}

function AdSpecsTable({ listing, filterDefs, compact = false }: {
  listing: Listing;
  filterDefs?: CatalogFilterDef[];
  compact?: boolean;
}) {
  const vd  = listing.vehicleDetails as any;
  const raw = listing as any;

  function boolVal(v: boolean | undefined | null): string {
    if (v == null) return NA;
    return v ? 'يوجد' : 'لا يوجد';
  }

  // `value` stays a plain string — it drives the NA styling check and the row key.
  // `node` is an optional richer rendering for that same value (see SpecRow).
  const headRows: SpecRow[] = [
    listing.listingNumber
      ? {
          label: 'رقم الإعلان',
          value: listing.listingNumber,
          node: <ListingNumberCell listingNumber={listing.listingNumber} />,
        }
      // Pre-rollout payload with no ad number: show the id tail as before, but
      // WITHOUT the copy button or the search hint — that number isn't
      // searchable, and promising otherwise would be a lie.
      : { label: 'رقم الإعلان', value: '#' + listing.id.slice(-8).toUpperCase() },
    { label: 'تاريخ الإعلان', value: formatDate(listing.createdAt) },
  ];

  let rows: SpecRow[];

  if (isVehicleListing(listing)) {
    const make     = vd?.make        ?? raw.make        ?? vd?.brand     ?? raw.brand;
    const model    = vd?.model       ?? raw.model       ?? vd?.modelName ?? raw.modelName;
    const year     = vd?.year        ?? raw.year        ?? vd?.modelYear ?? raw.modelYear;
    const mileage  = vd?.mileage     ?? raw.mileage     ?? vd?.mileageKm ?? raw.mileageKm ?? vd?.odometer ?? raw.odometer;
    const heavyDmg = vd?.heavyDamageRecord ?? vd?.heavyDamage ?? raw.heavyDamage ?? raw.heavyDamageRecord;
    const condition = vd?.condition  ?? raw.condition;

    rows = [
      ...headRows,
      { label: 'حالة المركبة',        value: tr(condition) },
      { label: 'الماركة',             value: make    ?? NA },
      { label: 'الموديل',             value: model   ?? NA },
      { label: 'السنة',               value: year   != null ? String(year)   : NA },
      { label: 'نوع الهيكل',          value: tr(vd?.bodyType) },
      { label: 'قوة المحرك',          value: vd?.enginePower    != null ? `${vd.enginePower} hp`    : NA },
      { label: 'سعة المحرك',          value: vd?.engineCapacity != null ? `${vd.engineCapacity} cc` : NA },
      { label: 'نوع الوقود',          value: tr(vd?.fuelType) },
      { label: 'نوع ناقل الحركة',     value: tr(vd?.transmission) },
      { label: 'عدد السرعات',         value: vd?.gearCount != null ? `${vd.gearCount} سرعة` : NA },
      { label: 'الدفع',               value: tr(vd?.drivetrain) },
      { label: 'العداد (كم)',          value: mileage != null ? new Intl.NumberFormat('en-US').format(mileage) + ' كم' : NA },
      { label: 'الكفالة',             value: boolVal(vd?.warranty) },
      { label: 'سجل حوادث جسيمة',     value: boolVal(heavyDmg) },
      { label: 'قابل للمقايضة',       value: boolVal(vd?.tradeIn) },
      { label: 'المعلن',              value: tr(vd?.fromWho) },
    ];
  } else {
    // Real-estate / generic: render the listing's own attributes, labeled + ordered by
    // the category's catalog filter defs. Browse-only/location facets aren't listing
    // attributes, so they simply won't be present in `attributes` and are skipped.
    const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
    // Hide internal markers (_seed/_seedKey) and any empty values, so the table never
    // shows a "غير محدد" row for a non-vehicle listing.
    const keys = Object.keys(attrs).filter(
      (k) => !k.startsWith('_') && attrs[k] != null && attrs[k] !== '',
    );
    const unitByKey = new Map((filterDefs ?? []).map((d) => [d.key, d.unit ?? null]));
    const labelByKey = new Map((filterDefs ?? []).map((d) => [d.key, d.labelAr]));

    // Defs order first (natural reading order), then any leftover attribute keys.
    const orderedDefKeys = (filterDefs ?? []).map((d) => d.key).filter((k) => keys.includes(k));
    const leftoverKeys   = keys.filter((k) => !orderedDefKeys.includes(k));

    rows = [
      ...headRows,
      ...[...orderedDefKeys, ...leftoverKeys].map((k) => ({
        label: labelByKey.get(k) ?? ATTR_LABEL_FALLBACK[k] ?? k,
        value: formatAttrValue(attrs[k], unitByKey.get(k)),
      })),
    ];
  }

  // A non-vehicle listing with no attributes beyond the two universal head rows: show a
  // gentle empty state rather than a lone header pair.
  const noExtraSpecs = !isVehicleListing(listing) && rows.length <= headRows.length;
  if (noExtraSpecs) {
    return (
      <div>
        <div className="divide-y divide-gray-100">
          {headRows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-gray-500 shrink-0">{row.label}</span>
              <span className="font-medium text-end text-gray-900">{row.node ?? row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 text-center py-6">لا توجد مواصفات</p>
      </div>
    );
  }

  // Mobile-only clean layout: aligned key/value rows (label start, value end),
  // no fixed-width column or vertical divider — graceful wrapping on narrow screens.
  if (compact) {
    return (
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-gray-500 shrink-0">{row.label}</span>
            <span className={`font-medium text-end ${row.value === NA ? 'text-gray-300' : 'text-gray-900'}`}>
              {row.node ?? row.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row, i) => (
        <div key={row.label} className={`flex text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
          <span className="w-[48%] shrink-0 px-4 py-2.5 text-gray-500 font-medium border-e border-gray-100">
            {row.label}
          </span>
          <span className={`flex-1 px-4 py-2.5 font-medium ${row.value === NA ? 'text-gray-300' : 'text-gray-900'}`}>
            {row.node ?? row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Offer Modal ───────────────────────────────────────────────────────────────

function OfferModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [amount,     setAmount]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currencyLabel = listing.currency === 'USD' ? '$' : 'ل.س';
  const parsedAmount  = parseFloat(amount);
  const isValid       = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await offersService.createOffer(listing.id, parsedAmount, listing.currency);
      toast.success('تم إرسال عرضك بنجاح');
      onClose();
    } catch {
      toast.error('تعذّر إرسال العرض، حاول مجدداً.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <h3 className="text-lg font-bold text-gray-900">تقديم عرض</h3>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">سعر المنتج:</span>
          <span className="text-base font-extrabold text-blue-700">
            {formatPrice(listing.price, listing.currency)}
          </span>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">عرضك</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="أدخل عرضك"
              disabled={submitting}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300 pe-14 disabled:opacity-60"
            />
            <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">
              {currencyLabel}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {submitting ? 'جارٍ الإرسال…' : 'إرسال'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Seller Box ────────────────────────────────────────────────────────────────

/**
 * 64px seller avatar: store logo (when set) or the blue initial disc, with the
 * member-store seal half-overlapping the lower-left corner when memberBadge is
 * true. The seal is Meta-Verified-style: Phosphor SealCheck (fill) in blue on a
 * white backing disc — the disc shows white through the check cutout AND is the
 * separation ring that keeps the seal legible on the blue fallback disc.
 * -bottom-1/-left-1 are physical on purpose (lower-left in RTL too).
 */
function SellerAvatar({ logoUrl, initial, name, memberBadge }: {
  logoUrl?: string | null; initial: string; name: string; memberBadge: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-16 h-16 rounded-full object-cover ring-1 ring-gray-200"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
          {initial}
        </div>
      )}
      {memberBadge && (
        // 26px disc / 22px seal (2px white ring), offset -1.5 so the enlarged seal
        // still sits half-out of the corner instead of swallowing the avatar edge.
        <span
          className="absolute -bottom-1.5 -left-1.5 w-[26px] h-[26px] rounded-full bg-white shadow-sm flex items-center justify-center"
          aria-label="متجر معتمد"
        >
          <SealCheckIcon weight="fill" className="w-[22px] h-[22px] text-blue-600" />
        </span>
      )}
    </div>
  );
}

function SellerBox({ listing, variant = 'full' }: { listing: Listing; variant?: 'full' | 'identity' | 'line' | 'bar' }) {
  const router                        = useRouter();
  const { user, isAuthenticated }     = useAuthStore();
  const [chatLoading, setChatLoading] = useState(false);
  const [offerOpen,   setOfferOpen]   = useState(false);

  const isOwner     = !!user && !!listing.user && user.id === listing.user.id;
  const isCorporate = listing.user?.userType === 'CORPORATE' || !!listing.user?.corporateProfile;
  // Member-active store (backend-derived, detail payload only). Gates the avatar
  // seal AND the inline name-check — NOT merely being corporate. The «عرض كل
  // إعلانات المعرض» link stays on isCorporate: it's navigation, not trust.
  const memberBadge = !!listing.user?.corporateProfile?.memberBadge;
  const logoUrl     = isCorporate ? listing.user?.corporateProfile?.logoUrl : null;

  const profile = listing.user?.profile;
  const name = isCorporate && listing.user?.corporateProfile?.companyName
    ? listing.user.corporateProfile.companyName
    : profile
      ? `${profile.firstName} ${profile.lastName}`
      : listing.user?.email ?? 'بائع فردي';
  const initial = name.charAt(0).toUpperCase();
  const phone = listing.phoneNumber ?? listing.user?.phone ?? null;
  const phoneVisible = listing.showPhoneNumber !== false;
  const accountDate = listing.user?.createdAt ? formatDate(listing.user.createdAt) : null;

  async function handleSendMessage() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setChatLoading(true);
    try {
      const room = await messagesService.createOrGetRoom(listing.id);
      router.push(`/account/messages/${room.id}`);
    } catch (err) {
      console.error('[SellerBox] createOrGetRoom error:', err);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Mobile: identity-only block (name + follow seller), no contact buttons ──
  if (variant === 'identity') {
    return (
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">معلومات البائع</p>
        <div className="flex items-center gap-3">
          <SellerAvatar logoUrl={logoUrl} initial={initial} name={name} memberBadge={memberBadge} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug flex items-center gap-1">
              <span className="truncate">{name}</span>
              {memberBadge && (
                <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" aria-label="معرض موثّق" />
              )}
            </p>
            {!isCorporate && listing.user?.email && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.user.email}</p>
            )}
            {isCorporate && listing.user?.id && (
              <Link
                href={`/listings?sellerId=${listing.user.id}`}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline mt-1 transition-colors"
              >
                <Store className="w-3 h-3 shrink-0" />
                عرض كل إعلانات المعرض
              </Link>
            )}
            {accountDate && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                عضو منذ {accountDate}
              </span>
            )}
          </div>
          {!isOwner && listing.user?.id && (
            <FavoriteSellerButton sellerId={listing.user.id} variant="icon" />
          )}
        </div>
      </div>
    );
  }

  // ── Mobile: compact seller line (name + join date), no avatar/card/follow ──
  if (variant === 'line') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
        <span className="font-semibold text-gray-700 inline-flex items-center gap-1">
          {name}
          {/* Inline member seal: bare fill-weight seal (no white disc — on the white
              card the check cutout reads white by itself; a disc here would look like
              a sticker in running text). Same memberBadge gate as the avatar seal. */}
          {memberBadge && (
            <SealCheckIcon weight="fill" className="w-4 h-4 text-blue-600 shrink-0" aria-label="متجر معتمد" />
          )}
        </span>
        {accountDate && <span>· عضو منذ {accountDate}</span>}
      </div>
    );
  }

  // ── Mobile: sticky-bar actions (call / message / offer) ──
  if (variant === 'bar') {
    return (
      <>
        {offerOpen && (
          <OfferModal listing={listing} onClose={() => setOfferOpen(false)} />
        )}
        {isOwner ? (
          <Link
            href="/account/listings"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            إدارة الإعلان
          </Link>
        ) : (
          <div className="flex items-stretch gap-2">
            {phoneVisible && phone ? (
              <a
                href={`tel:${phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-200 text-gray-900 font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
              >
                <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                اتصال
              </a>
            ) : (
              <span className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-[13px] leading-tight text-center select-none">
                <Phone className="w-4 h-4 shrink-0" />
                لا يوجد رقم
              </span>
            )}
            <button
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {chatLoading ? 'جارٍ الفتح…' : 'إرسال رسالة'}
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) { router.push('/login'); return; }
                setOfferOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
            >
              <Tag className="w-4 h-4 shrink-0" />
              تقديم عرض
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {offerOpen && (
        <OfferModal listing={listing} onClose={() => setOfferOpen(false)} />
      )}

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">معلومات البائع</p>

      <div className="flex items-center gap-3 mb-3">
        <SellerAvatar logoUrl={logoUrl} initial={initial} name={name} memberBadge={memberBadge} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-snug flex items-center gap-1">
            <span className="truncate">{name}</span>
            {memberBadge && (
              <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" aria-label="معرض موثّق" />
            )}
          </p>
          {!isCorporate && listing.user?.email && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.user.email}</p>
          )}
          {isCorporate && listing.user?.id && (
            <Link
              href={`/listings?sellerId=${listing.user.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline mt-1 transition-colors"
            >
              <Store className="w-3 h-3 shrink-0" />
              عرض كل إعلانات المعرض
            </Link>
          )}
        </div>
        {!isOwner && listing.user?.id && (
          <FavoriteSellerButton sellerId={listing.user.id} variant="icon" />
        )}
      </div>

      {accountDate && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          عضو منذ {accountDate}
        </div>
      )}

      {!phoneVisible ? (
        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-sm mb-3 cursor-not-allowed select-none">
          <Phone className="w-4 h-4" />
          الرقم مخفي
        </div>
      ) : phone ? (
        <a
          href={`tel:${phone}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-semibold py-2.5 rounded-xl transition-colors text-sm mb-3"
        >
          <Phone className="w-4 h-4 text-gray-500" />
          {phone}
        </a>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-sm mb-3">
          <Phone className="w-4 h-4" />
          لا يوجد رقم هاتف
        </div>
      )}

      {isOwner ? (
        <Link
          href="/account/listings"
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          إدارة الإعلان
        </Link>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleSendMessage}
            disabled={chatLoading}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            {chatLoading ? 'جارٍ الفتح…' : 'إرسال رسالة'}
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated) { router.push('/login'); return; }
              setOfferOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Tag className="w-4 h-4" />
            تقديم عرض
          </button>
        </div>
      )}
    </div>
  );
}

// ── Location tab ──────────────────────────────────────────────────────────────

/**
 * Textual location, plus a map whose precision matches what we actually know.
 *
 * Three cases, all text-first:
 *  a. The seller pinned a coordinate → that exact point, street zoom, with a pin
 *     and a directions link.
 *  b. No pin, but the governorate is one we know, and the seller didn't hide the
 *     map → an APPROXIMATE view: the governorate centre, wide zoom, drawn as a
 *     soft circle with a «موقع تقريبي» badge and NO pin, and no directions link
 *     (routing someone to a governorate centroid would be fake precision).
 *  c. Anything else — hidden by the seller, unknown governorate, or the map
 *     failed to load → address text alone. A listing without a pin is complete,
 *     not pending.
 *
 * The rule behind case (b): the governorate centre is derived HERE, at render
 * time, from the city field. It is never written to the listing — a listing with
 * no pin keeps null coordinates in the database, so we never publish a fake
 * exact location, and a later real pin simply replaces the approximation.
 */
function LocationTab({ listing }: { listing: Listing }) {
  const [mapFailed, setMapFailed] = useState(false);
  // Platform-specific handoff is resolved after mount so the first render (and
  // any hydration diff) stays on the universal Google Maps link.
  const [platform, setPlatform] = useState<ReturnType<typeof currentPlatform>>('other');
  useEffect(() => { setPlatform(currentPlatform()); }, []);

  const coords = toValidCoords(listing.latitude, listing.longitude);
  const addressLine = formatAddressLine(listing);
  const hidden = isLocationMapHidden(listing.attributes);
  // Display-only derivation — never persisted. The wizard stores the chosen
  // governorate in `city`, so that is the lookup key (with `governorate` first
  // for whenever the backend column starts being populated).
  const approxCenter =
    !coords && !hidden ? governorateCenter(listing.governorate ?? listing.city) : null;

  const heading = (
    <div className="flex items-start gap-2">
      <MapPin className="w-4.5 h-4.5 text-orange-400 shrink-0 mt-0.5" style={{ width: 18, height: 18 }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-relaxed">
          {addressLine || <span className="text-gray-400 font-normal">لم يُحدَّد الموقع.</span>}
        </p>
        {listing.address?.trim() && (
          <p className="text-xs text-gray-500 mt-0.5">{listing.address.trim()}</p>
        )}
      </div>
    </div>
  );

  // (c) — nothing map-worthy, or the seller opted out, or the map broke.
  if (mapFailed || (!coords && !approxCenter)) {
    return <div className="py-2">{heading}</div>;
  }

  // (b) — approximate area. No pin, no directions: we don't know the address.
  if (!coords && approxCenter) {
    return (
      <div className="space-y-3">
        {heading}
        <ListingMap
          coords={approxCenter}
          variant="approximate"
          label={listing.title}
          onError={() => setMapFailed(true)}
        />
        <p className="text-xs text-gray-500">
          لم يحدد البائع موقعاً دقيقاً — تشير الدائرة إلى المنطقة التقريبية فقط.
        </p>
      </div>
    );
  }

  // (a) — the seller's exact pin.
  return (
    <div className="space-y-3">
      {heading}
      <ListingMap coords={coords!} label={listing.title} onError={() => setMapFailed(true)} />
      <a
        href={directionsUrl(coords!, listing.title, platform)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
      >
        <Navigation className="w-4 h-4 shrink-0" />
        الحصول على الاتجاهات
      </a>
    </div>
  );
}

// ── Tab Panel ─────────────────────────────────────────────────────────────────

type TabId = 'details' | 'description' | 'damage' | 'specs' | 'location';

// Desktop: 4 tabs (detail table lives in a separate grid column).
const TABS: { id: TabId; label: string }[] = [
  { id: 'description', label: 'الوصف' },
  { id: 'damage',      label: 'تقرير الأضرار والطلاء' },
  { id: 'specs',       label: 'المواصفات الفنية' },
  { id: 'location',    label: 'الموقع' },
];

// Mobile (sahibinden-style): 3 tabs — tab 1 stacks table + damage + specs.
const MOBILE_TABS: { id: TabId; label: string }[] = [
  { id: 'details',     label: 'تفاصيل الإعلان' },
  { id: 'description', label: 'الوصف' },
  { id: 'location',    label: 'الموقع' },
];

function TabPanel({ listing, filterDefs, mobile = false }: { listing: Listing; filterDefs?: CatalogFilterDef[]; mobile?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>(mobile ? 'details' : 'description');
  const vd  = listing.vehicleDetails as any;
  const raw = listing as any;

  const rawDamage =
    vd?.damageReport  ??
    vd?.damageReports ??
    raw.damageReport  ??
    raw.damageReports;
  const damage = rawDamage && Object.keys(rawDamage).length > 0
    ? normalizeDamageReport(rawDamage as Record<string, string | { status: string; detail?: string }>)
    : null;

  const techSpecs = (
    vd?.technicalSpecs ?? vd?.specs ?? vd?.features ??
    raw.technicalSpecs ?? raw.specs ?? raw.features
  ) as string[] | undefined;

  // Damage report + technical specs are vehicle concepts. Non-vehicle listings drop those
  // tabs entirely — leaving details (attribute table) + description + location (+ Q&A below).
  const vehicle = isVehicleListing(listing);
  const desktopTabs = vehicle ? TABS : TABS.filter((t) => t.id !== 'damage' && t.id !== 'specs');
  const tabs = mobile ? MOBILE_TABS : desktopTabs;

  return (
    <div className="bg-white rounded-card shadow-pebble overflow-hidden">
      {/* Tab bar */}
      <div className="flex bg-gray-50/80 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* (a) Key-value detail table — always shown */}
            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">تفاصيل الإعلان</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <AdSpecsTable listing={listing} filterDefs={filterDefs} compact />
              </div>
            </section>

            {/* (b) Damage & paint report — vehicles only, and only if data present */}
            {vehicle && damage && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">تقرير الأضرار والطلاء</p>
                <DamageMap damage={damage} />
              </section>
            )}

            {/* (c) Equipment / technical specs — vehicles only, and only if present */}
            {vehicle && techSpecs?.length ? (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">المواصفات الفنية</p>
                <TechSpecsGrid specs={techSpecs} />
              </section>
            ) : null}
          </div>
        )}

        {activeTab === 'description' && (
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {listing.description || <span className="text-gray-400 italic">لا يوجد وصف.</span>}
          </p>
        )}

        {activeTab === 'damage' && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">تقرير حالة الهيكل</p>
            {damage ? (
              <DamageMap damage={damage} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">
                لم يُقدَّم تقرير أضرار لهذا الإعلان.
              </p>
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          techSpecs?.length
            ? <TechSpecsGrid specs={techSpecs} />
            : <p className="text-sm text-gray-400 text-center py-10">لا توجد مواصفات فنية مدرجة.</p>
        )}

        {/* Mounted only while the tab is open — unmounting disposes the WebGL
            context, and the map chunk is never fetched if nobody opens it. */}
        {activeTab === 'location' && <LocationTab listing={listing} />}
      </div>
    </div>
  );
}

// ── Q&A Section ───────────────────────────────────────────────────────────────

function QASection({
  listingId,
  sellerId,
  initialQuestions,
}: {
  listingId: string;
  sellerId?: string;
  initialQuestions?: unknown[];
}) {
  const { user, isAuthenticated } = useAuthStore();
  const isSeller = !!user && !!sellerId && user.id === sellerId;

  const seed = (initialQuestions ?? []) as Question[];
  const [questions,  setQuestions]  = useState<Question[]>(seed);
  const [qaLoading,  setQaLoading]  = useState(seed.length === 0);
  const [draft,      setDraft]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialQuestions && initialQuestions.length >= 0) {
      setQaLoading(false);
      return;
    }
    let cancelled = false;
    qaService.getForListing(listingId)
      .then((list) => { if (!cancelled) setQuestions(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setQaLoading(false); });
    return () => { cancelled = true; };
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const newQ = await qaService.askQuestion(listingId, text);
      const enriched = { ...newQ, askedBy: newQ.askedBy ?? user ?? undefined };
      setQuestions((prev) => [enriched, ...prev]);
      setDraft('');
      toast.success('تم إرسال سؤالك بنجاح.');
    } catch {
      toast.error('تعذّر إرسال السؤال. حاول مجدداً.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-card shadow-pebble overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-4.5 h-4.5 text-orange-400" style={{ width: 18, height: 18 }} />
          أسئلة وأجوبة
        </h2>
      </div>

      <div className="px-5 py-5 space-y-5">
        {!isSeller && (
          <div className="space-y-2">
            {!isAuthenticated && (
              <p className="text-xs text-gray-400 mb-1">
                لطرح سؤال{' '}
                <a href="/login" className="text-orange-500 hover:underline font-medium">سجّل دخولك</a>.
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!isAuthenticated || submitting}
              rows={3}
              placeholder="اكتب سؤالك للبائع عن هذا الإعلان…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed transition"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!isAuthenticated || submitting || !draft.trim()}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'جارٍ الإرسال…' : 'إرسال السؤال'}
              </button>
            </div>
          </div>
        )}

        {qaLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <HelpCircle className="w-9 h-9 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">لا توجد أسئلة على هذا الإعلان بعد.</p>
            <p className="text-xs text-gray-400">كن أول من يسأل!</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-4 pe-1">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                    {askerInitials(q)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      {maskedAskerName(q)}
                      <span className="ms-2 font-normal text-gray-300">
                        {new Date(q.createdAt).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl px-3.5 py-2.5">
                      {questionText(q)}
                    </p>
                  </div>
                </div>
                {q.answer && (
                  <div className="ms-9 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      رد البائع
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function ListingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6">
        <div className="h-4 w-72 bg-gray-200 rounded mb-4" />
        <div className="bg-white rounded-card shadow-pebble px-6 py-5 mb-5 flex items-center justify-between">
          <div className="h-9 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Gallery + tabs skeleton */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-card shadow-pebble p-4">
              <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-3" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => <div key={i} className="w-[72px] h-[54px] bg-gray-200 rounded-lg" />)}
              </div>
            </div>
            <div className="bg-white rounded-card shadow-pebble overflow-hidden">
              <div className="h-12 bg-gray-100 border-b border-gray-200" />
              <div className="px-6 py-5 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${[100,90,95,85,70][i]}%` }} />)}
              </div>
            </div>
          </div>
          {/* Specs skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-card shadow-pebble overflow-hidden">
              <div className="h-10 bg-gray-100 border-b border-gray-100" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="w-[48%] px-4 py-2.5 border-e border-gray-100"><div className="h-3.5 bg-gray-200 rounded w-3/4" /></div>
                  <div className="flex-1 px-4 py-2.5"><div className="h-3.5 bg-gray-200 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          </div>
          {/* Seller skeleton (sticky) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6">
            <div className="bg-white rounded-card shadow-pebble p-6">
              <div className="h-3.5 w-16 bg-gray-200 rounded mb-4" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl mb-2" />
              <div className="h-11 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 404 / Error State ─────────────────────────────────────────────────────────

function ListingNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">الإعلان غير موجود</h1>
        <p className="text-gray-500 text-sm mb-8">
          قد يكون هذا الإعلان قد حُذف أو انتهت صلاحيته أو الرابط غير صحيح.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListingDetailClient() {
  // Still read from useParams() rather than props: this component is rendered by
  // the server `page.tsx` purely so `generateMetadata` can run above it, and
  // useParams works identically for a client child of a server page. Keeping the
  // signature prop-free is what let the whole 1700-line body move unchanged.
  const params = useParams();
  const id     = params.id as string;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser        = useAuthStore((s) => s.user);

  const [listing,  setListing]  = useState<Listing | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Catalog filter defs for the listing's category — used to LABEL + ORDER the attribute
  // spec table for non-vehicle listings. Fetched once here and threaded into both the
  // desktop and mobile spec tables.
  const [filterDefs, setFilterDefs] = useState<CatalogFilterDef[]>([]);

  useEffect(() => {
    if (isAuthenticated) recommendationsService.trackView(id);
  }, [id, isAuthenticated]);

  useEffect(() => {
    const slug = listing?.category?.slug;
    if (!listing || isVehicleListing(listing) || !slug) { setFilterDefs([]); return; }
    let cancelled = false;
    catalogService.getFilters(slug)
      .then((defs) => { if (!cancelled) setFilterDefs(defs); })
      .catch(() => { if (!cancelled) setFilterDefs([]); });
    return () => { cancelled = true; };
  }, [listing]);

  useEffect(() => {
    listingsService
      .getListingById(id)
      .then((data) => {
        console.log('[ListingDetail] full listing JSON:', JSON.stringify(data, null, 2));
        console.log('[ListingDetail] vehicleDetails:', data?.vehicleDetails);
        setListing(data);
      })
      .catch((err) => {
        console.error('[ListingDetail] fetch error:', err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useMobileTitle(listing?.title);

  if (loading)              return <ListingSkeleton />;
  if (notFound || !listing) return <ListingNotFound />;

  // Single seed for Q&A so both the desktop and mobile trees mount QASection
  // without triggering a duplicate fetch (the effect early-returns when
  // initialQuestions is provided — see QASection).
  const seededQuestions = listing.questions ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6">

        {/* ══ Desktop (lg+) — unchanged 3-column layout ══ */}
        <div className="hidden lg:block">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 flex-wrap">
            <Link href="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              الرئيسية
            </Link>
            <span>/</span>
            {listing.category && (
              <>
                <Link
                  href={`/listings?categoryId=${listing.category.id ?? ''}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {listing.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-700 font-medium line-clamp-1">{listing.title}</span>
          </nav>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-4">
            {listing.title}
          </h1>

          {/* Price bar */}
          <div className="bg-white rounded-card shadow-pebble px-6 py-4 mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-3xl font-extrabold text-blue-700 leading-none">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-4 h-4 shrink-0" />
                {listing.city}
              </div>
              <FavoriteButton listingId={listing.id} checkOnMount variant="detail" />
              <CompareButton listing={listing} variant="detail" />
              {/* ACTIVE only — a pending/rejected ad is still publicly fetchable,
                  so it must not be handed a share affordance. */}
              {isShareable(listing.status) && (
                <ShareButton
                  listingId={listing.id}
                  subject={{ title: listing.title, city: listing.city }}
                />
              )}
            </div>
          </div>

          {/* Main grid — 12-col, 3-column desktop (RTL: gallery right · specs middle · seller left) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* RIGHT — Image Gallery + Tabs + Q&A (col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-card shadow-pebble p-4">
                <ImageGallery images={listing.images ?? []} />
              </div>
              <TabPanel listing={listing} />
              <QASection listingId={listing.id} sellerId={listing.user?.id} initialQuestions={seededQuestions} />
            </div>

            {/* MIDDLE — Ad Specs Table (col-span-3) */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-card shadow-pebble overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">تفاصيل الإعلان</p>
                </div>
                <AdSpecsTable listing={listing} filterDefs={filterDefs} />
              </div>
            </div>

            {/* LEFT — Seller Box (col-span-4, sticky) */}
            <div className="lg:col-span-4 lg:sticky lg:top-6">
              <div className="bg-white rounded-card shadow-pebble p-6">
                <SellerBox listing={listing} />
              </div>
            </div>

          </div>
        </div>

        {/* ══ Mobile (<lg) — sahibinden-style linear order ══ */}
        <div className="lg:hidden space-y-4 pb-32">

          {/* 1 — Favorite + Compare + Follow seller (moved above the gallery) */}
          <div className="flex items-center gap-3">
            <FavoriteButton listingId={listing.id} checkOnMount variant="detail" />
            <CompareButton listing={listing} variant="detail" />
            {isShareable(listing.status) && (
              <ShareButton
                listingId={listing.id}
                subject={{ title: listing.title, city: listing.city }}
              />
            )}
            {listing.user?.id && authUser?.id !== listing.user.id && (
              <FavoriteSellerButton sellerId={listing.user.id} variant="icon" />
            )}
          </div>

          {/* 2 — Image gallery (full-bleed, no card) */}
          <ImageGallery images={listing.images ?? []} />

          {/* 3 — Seller name + join date (compact line, sahibinden-style) */}
          <SellerBox listing={listing} variant="line" />

          {/* 4 — Title + price + location + date */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">
              {listing.title}
            </h1>
            <p className="text-2xl font-extrabold text-blue-700 leading-none mb-2.5">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" />
                {listing.city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDate(listing.createdAt)}
              </span>
            </div>
          </div>

          {/* 5 — Tabs (3-tab sahibinden layout; tab 1 stacks table + damage + specs) */}
          <TabPanel listing={listing} filterDefs={filterDefs} mobile />

          {/* 6 — Q&A (last) */}
          <QASection listingId={listing.id} sellerId={listing.user?.id} initialQuestions={seededQuestions} />

        </div>

        {/* ══ Mobile sticky action bar — transparent, floats above BottomNav ══ */}
        <div className="lg:hidden fixed inset-x-0 bottom-24 md:bottom-3 z-[60] px-4">
          <SellerBox listing={listing} variant="bar" />
        </div>
      </div>
    </div>
  );
}
