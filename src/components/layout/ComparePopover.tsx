'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Scale, X, MapPin, ImageOff } from 'lucide-react';
import { useCompareStore } from '@/store/compare.store';
import type { Listing } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

function primaryImage(listing: Listing): string | null {
  const imgs = listing.images ?? [];
  return (imgs.find((i) => i.isPrimary) ?? imgs[0])?.url ?? null;
}

// ── Row card — identical layout to RecommendationsPopover ─────────────────────

function CompareRow({
  listing,
  onRemove,
  onClose,
}: {
  listing: Listing;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const img  = primaryImage(listing);
  const year = listing.vehicleDetails?.year ?? listing.year;
  const km   = listing.vehicleDetails?.mileage ?? listing.mileage;

  const location = [listing.city, listing.district, listing.neighborhood]
    .filter(Boolean)
    .join(' / ');

  const infoLine = [
    year,
    km != null ? `${new Intl.NumberFormat('tr-TR').format(km)} KM` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div className="group relative flex items-center gap-3.5 px-4 py-3 hover:bg-blue-50/40 transition-colors">
      {/* Thumbnail */}
      <Link href={`/listings/${listing.id}`} onClick={onClose} className="shrink-0">
        <div className="w-[84px] h-[68px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
          {img ? (
            <img src={img} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-5 h-5 text-gray-300" />
          )}
        </div>
      </Link>

      {/* Text */}
      <Link
        href={`/listings/${listing.id}`}
        onClick={onClose}
        className="flex-1 min-w-0 flex flex-col gap-0.5 pr-5"
      >
        <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-snug">
          {listing.title}
        </p>
        {location && (
          <p className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
            <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
            <span className="truncate">{location}</span>
          </p>
        )}
        {infoLine && (
          <p className="text-[11px] text-gray-400">{infoLine}</p>
        )}
        <p className="text-[13px] font-bold text-gray-900 mt-0.5">
          {formatPrice(listing.price, listing.currency)}
        </p>
      </Link>

      {/* Remove */}
      <button
        onClick={() => onRemove(listing.id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center"
        title="Listeden çıkar"
      >
        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
}

// ── Popover ───────────────────────────────────────────────────────────────────

export function ComparePopover() {
  const items      = useCompareStore((s) => s.items);
  const removeItem = useCompareStore((s) => s.removeItem);
  const clearItems = useCompareStore((s) => s.clearItems);

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Outside-click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative">

      {/* Trigger */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={[
          'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
          isOpen
            ? 'text-gray-900 border-orange-500'
            : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-orange-500',
        ].join(' ')}
      >
        {/* Icon with count badge */}
        <span className="relative">
          <Scale className="w-4 h-4 text-blue-400" />
          {items.length > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
              {items.length}
            </span>
          )}
        </span>
        قارن
      </button>

      {/* Floating panel */}
      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-[440px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-[13px] font-semibold text-gray-800">
              قائمة المقارنة
              <span className="ms-2 text-[11px] font-normal text-gray-400">
                ({items.length} / 3 إعلانات)
              </span>
            </p>
            {items.length > 0 && (
              <button
                onClick={clearItems}
                className="text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors"
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* List or empty state */}
          <div className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Scale className="w-7 h-7 text-blue-200" />
                </div>
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  اختر إعلانات للمقارنة.
                </p>
                <p className="text-[11px] text-gray-300 mt-1">
                  اضغط على أيقونة <Scale className="inline w-3 h-3" /> في بطاقة الإعلان.
                </p>
              </div>
            ) : (
              items.map((listing) => (
                <CompareRow
                  key={listing.id}
                  listing={listing}
                  onRemove={removeItem}
                  onClose={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Slot indicators — show how many slots remain */}
          {items.length > 0 && items.length < 3 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              {Array.from({ length: 3 - items.length }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full bg-gray-200 border border-dashed border-gray-300"
                />
              ))}
              <p className="text-[10px] text-gray-400 whitespace-nowrap">
                يمكنك إضافة {3 - items.length} إعلان آخر
              </p>
            </div>
          )}

          {/* Compare CTA — only enabled with ≥ 2 items */}
          <div className="p-3 border-t border-gray-100">
            {items.length >= 2 ? (
              <Link
                href="/compare"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <Scale className="w-4 h-4" />
                قارن {items.length} إعلانات
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed select-none">
                <Scale className="w-4 h-4" />
                اختر إعلانين على الأقل
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
