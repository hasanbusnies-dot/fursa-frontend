'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, MapPin, ImageOff, Loader2 } from 'lucide-react';
import { recommendationsService } from '@/services/recommendations.service';
import { useAuthStore } from '@/store/auth.store';
import type { Listing } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function primaryImage(listing: Listing): string | null {
  const imgs = listing.images ?? [];
  return (imgs.find((i) => i.isPrimary) ?? imgs[0])?.url ?? null;
}

// ── Listing row ───────────────────────────────────────────────────────────────

function ListingRow({
  listing,
  onRemove,
  onClose,
}: {
  listing: Listing;
  onRemove?: (id: string) => void;
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
    km != null ? `${new Intl.NumberFormat('en-US').format(km)} كم` : null,
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
      <Link href={`/listings/${listing.id}`} onClick={onClose} className="flex-1 min-w-0 flex flex-col gap-0.5 pe-5">
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

      {/* Remove (recent tab only, on hover) */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(listing.id); }}
          className="absolute end-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center"
          title="إزالة من السجل"
        >
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'suggested' | 'recent' }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-purple-200" />
      </div>
      <p className="text-[13px] text-gray-400 leading-relaxed max-w-[260px]">
        {tab === 'suggested'
          ? 'ليس لديك سجل مشاهدات كافٍ لاقتراح إعلانات لك.'
          : 'لم تشاهد أي إعلان بعد.'}
      </p>
    </div>
  );
}

// ── Popover ───────────────────────────────────────────────────────────────────

type Tab = 'suggested' | 'recent';

export function RecommendationsPopover() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [isOpen,    setIsOpen]    = useState(false);
  const [tab,       setTab]       = useState<Tab>('suggested');
  const [suggested, setSuggested] = useState<Listing[]>([]);
  const [recent,    setRecent]    = useState<Listing[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fetched,   setFetched]   = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  // Fetch both tabs on first open
  useEffect(() => {
    if (!isOpen || fetched || !isAuthenticated) return;
    setLoading(true);
    Promise.all([
      recommendationsService.getSuggested(),
      recommendationsService.getRecent(),
    ])
      .then(([s, r]) => { setSuggested(s); setRecent(r); setFetched(true); })
      .catch(() => setFetched(true))
      .finally(() => setLoading(false));
  }, [isOpen, fetched, isAuthenticated]);

  const handleRemove = async (listingId: string) => {
    setRecent((prev) => prev.filter((l) => l.id !== listingId));
    try { await recommendationsService.removeFromHistory(listingId); } catch { /* best-effort */ }
  };

  const displayed = tab === 'suggested' ? suggested : recent;

  return (
    <div ref={wrapperRef} className="relative">

      {/* Trigger — styled to match adjacent sub-header links */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={[
          'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
          isOpen
            ? 'text-gray-900 border-orange-500'
            : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-orange-500',
        ].join(' ')}
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        إعلانات مخصصة لك
      </button>

      {/* Floating panel — rendered outside overflow clipping via z-[100] */}
      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-[440px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {([
              { key: 'suggested' as Tab, label: 'إعلانات قد تهمك' },
              { key: 'recent'    as Tab, label: 'إعلانات شاهدتها مؤخراً' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={[
                  'flex-1 py-3 text-[11px] font-semibold tracking-wide transition-all border-b-2 -mb-px',
                  tab === key
                    ? 'text-blue-600 border-blue-500 bg-white'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/60',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable list */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : displayed.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              displayed.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onRemove={tab === 'recent' ? handleRemove : undefined}
                  onClose={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {!loading && displayed.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{displayed.length} إعلان</span>
              <Link
                href={tab === 'suggested' ? '/account/onerilen' : '/account/gecmis'}
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
              >
                عرض الكل
              </Link>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
