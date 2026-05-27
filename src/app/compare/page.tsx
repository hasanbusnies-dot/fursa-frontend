'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { X, Scale, Plus, ImageOff, ArrowRight, ExternalLink } from 'lucide-react';
import { useCompareStore } from '@/store/compare.store';
import type { Listing } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

function primaryImage(listing: Listing): string | null {
  const imgs = listing.images ?? [];
  return (imgs.find((i) => i.isPrimary) ?? imgs[0])?.url ?? null;
}

// ── Enum translation ──────────────────────────────────────────────────────────

const ENUM_AR: Record<string, string> = {
  USED: 'مستعمل',       NEW: 'جديد',
  GASOLINE: 'بنزين',    DIESEL: 'ديزل',      ELECTRIC: 'كهربائي',
  HYBRID: 'هجين',       LPG: 'غاز',          OTHER: 'أخرى',
  AUTOMATIC: 'أوتوماتيك', MANUAL: 'عادي',    SEMI_AUTOMATIC: 'نصف أوتوماتيك', CVT: 'CVT',
  FWD: 'دفع أمامي',    RWD: 'دفع خلفي',     AWD: 'AWD',         FOUR_WD: 'دفع رباعي',
  SEDAN: 'سيدان',       HATCHBACK: 'هاتشباك', SUV: 'سيارة دفع رباعي',
  WAGON: 'ستيشن واغن',  COUPE: 'كوبيه',      CONVERTIBLE: 'كشف',
  VAN: 'فان',           PICKUP: 'بيكاب',      MINIVAN: 'ميني فان',
};

function tr(val: string | null | undefined): string | null {
  if (!val) return null;
  return ENUM_AR[val] ?? val;
}

function spec(listing: Listing, key: string): string | null {
  const vd = listing.vehicleDetails;
  switch (key) {
    case 'make':         return vd?.make         ?? listing.make  ?? null;
    case 'model':        return vd?.model        ?? listing.model ?? null;
    case 'year':         return String(vd?.year  ?? listing.year  ?? '') || null;
    case 'condition':    return tr(listing.condition);
    case 'fuelType':     return tr(vd?.fuelType);
    case 'transmission': return tr(vd?.transmission);
    case 'mileage': {
      const km = vd?.mileage ?? listing.mileage;
      return km != null ? `${new Intl.NumberFormat('en-US').format(km)} كم` : null;
    }
    case 'engineCapacity':
      return vd?.engineCapacity != null ? `${vd.engineCapacity} cc` : null;
    case 'enginePower':
      return vd?.enginePower    != null ? `${vd.enginePower} HP`    : null;
    case 'bodyType':     return tr(vd?.bodyType);
    case 'drivetrain':   return tr(vd?.drivetrain);
    case 'color':        return listing.color ?? null;
    case 'location':
      return [listing.city, listing.district].filter(Boolean).join(' / ') || null;
    default: return null;
  }
}

// ── Spec table definition ─────────────────────────────────────────────────────

const SECTION_LABEL = 'المواصفات الأساسية';

const SPECS: { key: string; label: string }[] = [
  { key: 'make',           label: 'الماركة' },
  { key: 'model',          label: 'الموديل' },
  { key: 'year',           label: 'السنة' },
  { key: 'condition',      label: 'الحالة' },
  { key: 'fuelType',       label: 'نوع الوقود' },
  { key: 'transmission',   label: 'ناقل الحركة' },
  { key: 'mileage',        label: 'كم' },
  { key: 'engineCapacity', label: 'سعة المحرك' },
  { key: 'enginePower',    label: 'قوة المحرك' },
  { key: 'bodyType',       label: 'نوع الهيكل' },
  { key: 'drivetrain',     label: 'الدفع' },
  { key: 'color',          label: 'اللون' },
  { key: 'location',       label: 'الموقع' },
];

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5">
        <Scale className="w-10 h-10 text-blue-200" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">لا توجد إعلانات للمقارنة</h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
        لم تختر أي إعلانات. انتقل إلى قائمة الإعلانات واضغط على أيقونة{' '}
        <Scale className="inline w-3.5 h-3.5 mx-0.5 align-middle" />{' '}
        في بطاقة الإعلان.
      </p>
      <Link
        href="/listings"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        العودة إلى الإعلانات
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const items      = useCompareStore((s) => s.items);
  const removeItem = useCompareStore((s) => s.removeItem);
  const clearItems = useCompareStore((s) => s.clearItems);

  if (items.length === 0) return <EmptyState />;

  const emptySlots = 3 - items.length;
  const totalCols  = 1 + items.length + emptySlots;

  const gridCols = `200px repeat(${items.length + emptySlots}, 1fr)`;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky page header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى الإعلانات
            </Link>
            <span className="text-gray-300 select-none">/</span>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              <h1 className="text-sm font-bold text-gray-800">مقارنة الإعلانات</h1>
              <span className="text-xs font-medium text-white bg-blue-500 rounded-full px-2 py-0.5 leading-none">
                {items.length}
              </span>
            </div>
          </div>
          <button
            onClick={clearItems}
            className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
          >
            مسح القائمة
          </button>
        </div>
      </div>

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 620 }}>

            {/* ══ HEADER ROW ════════════════════════════════════════════════ */}

            {/* Label cell */}
            <div className="px-5 py-5 border-b border-gray-100 flex flex-col justify-end bg-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {items.length} إعلانات
              </p>
            </div>

            {/* Listing header cells */}
            {items.map((listing) => {
              const img      = primaryImage(listing);
              const imgCount = listing.images?.length ?? 0;

              return (
                <div
                  key={listing.id}
                  className="px-4 pt-5 pb-4 border-b border-l border-gray-100 bg-white relative"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(listing.id)}
                    className="absolute top-3 end-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center group"
                    title="إزالة من المقارنة"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
                  </button>

                  {/* Photo */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 h-44 mb-3">
                    {img ? (
                      <img
                        src={img}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {imgCount > 0 && (
                      <span className="absolute bottom-2 end-2 bg-black/55 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                        1 / {imgCount}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <Link
                    href={`/listings/${listing.id}`}
                    className="flex items-start gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-800 transition-colors leading-snug mb-1.5 group"
                  >
                    <span className="line-clamp-2">{listing.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  {/* Price */}
                  <p className="text-xl font-extrabold text-gray-900">
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                </div>
              );
            })}

            {/* Empty slot placeholders (header row) */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`ph-header-${i}`}
                className="px-4 pt-5 pb-4 border-b border-l border-gray-100"
              >
                <Link
                  href="/listings"
                  className="flex flex-col items-center justify-center h-44 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-gray-300 hover:text-blue-400 mb-3 group"
                >
                  <Plus className="w-8 h-8 mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold">أضف إعلان</span>
                </Link>
                <p className="h-5 mb-1.5" />
                <p className="h-7" />
              </div>
            ))}

            {/* ══ SECTION LABEL ROW ════════════════════════════════════════ */}

            <div
              style={{ gridColumn: `1 / ${totalCols + 1}` }}
              className="px-5 py-2.5 bg-blue-600 flex items-center gap-2"
            >
              <Scale className="w-3.5 h-3.5 text-blue-200" />
              <p className="text-[11px] font-bold text-blue-100 uppercase tracking-widest">
                {SECTION_LABEL}
              </p>
            </div>

            {/* ══ SPEC ROWS ════════════════════════════════════════════════ */}

            {SPECS.map(({ key, label }, idx) => {
              const even = idx % 2 === 0;
              const rowBg = even ? 'bg-gray-50/60' : 'bg-white';

              const values = items.map((l) => spec(l, key));
              const allSame = values.length > 1 && values.every((v) => v === values[0]);

              return (
                <Fragment key={key}>
                  {/* Row label */}
                  <div className={`${rowBg} px-5 py-3.5 flex items-center border-t border-gray-100`}>
                    <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
                      {label}
                    </span>
                  </div>

                  {/* Data cells */}
                  {items.map((listing, li) => {
                    const val = values[li];
                    const isDiff = !allSame && val != null;
                    return (
                      <div
                        key={listing.id}
                        className={`${rowBg} px-4 py-3.5 flex items-center justify-center border-t border-l border-gray-100`}
                      >
                        <span
                          className={[
                            'text-[13px] font-semibold text-center',
                            val
                              ? isDiff
                                ? 'text-blue-600'
                                : 'text-gray-800'
                              : 'text-gray-300',
                          ].join(' ')}
                        >
                          {val ?? '—'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Placeholder columns */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                      key={`ph-spec-${i}`}
                      className={`${rowBg} px-4 py-3.5 flex items-center justify-center border-t border-l border-gray-100`}
                    >
                      <span className="text-[13px] text-gray-200">—</span>
                    </div>
                  ))}
                </Fragment>
              );
            })}

            {/* ══ ACTION ROW ═══════════════════════════════════════════════ */}

            {/* Label cell */}
            <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-200" />

            {/* CTA cells */}
            {items.map((listing) => (
              <div
                key={listing.id}
                className="px-4 py-4 bg-gray-50/60 border-t border-l border-gray-200 flex flex-col gap-2"
              >
                <Link
                  href={`/listings/${listing.id}`}
                  className="block w-full text-center text-[13px] font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-xl py-2.5 transition-colors"
                >
                  الذهاب لتفاصيل الإعلان
                </Link>
                <Link
                  href={`/listings/${listing.id}`}
                  className="block w-full text-center text-[13px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl py-2.5 transition-colors"
                >
                  عرض معلومات التواصل
                </Link>
              </div>
            ))}

            {/* Placeholder action cells */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`ph-action-${i}`}
                className="px-4 py-4 bg-gray-50/60 border-t border-l border-gray-200"
              />
            ))}

          </div>
        </div>

        {/* ── Footer hint ─────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 mt-4">
          يتم تمييز القيم المختلفة باللون{' '}
          <span className="font-semibold text-blue-500">الأزرق</span>.
          {emptySlots > 0 && (
            <>
              {' '}
              <Link href="/listings" className="underline hover:text-blue-600 transition-colors">
                يمكنك إضافة المزيد من الإعلانات ({items.length}/3).
              </Link>
            </>
          )}
        </p>

      </div>
    </div>
  );
}
