'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageOff, Star } from 'lucide-react';
import { listingsService } from '@/services/listings.service';
import type { Listing } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function FeaturedSkeleton() {
  return (
    <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden animate-pulse">
      <div className="h-28 bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-white/20 rounded w-3/4" />
        <div className="h-4 bg-white/20 rounded w-1/2" />
        <div className="h-2.5 bg-white/10 rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Individual premium card ───────────────────────────────────────────────────

function FeaturedCard({ listing }: { listing: Listing }) {
  const thumb =
    listing.images?.find((i) => i.isPrimary)?.url ??
    listing.images?.[0]?.url;

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="bg-white rounded-xl border-2 border-amber-400/80 shadow-md hover:shadow-xl hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col">

        {/* Image */}
        <div className="relative h-28 bg-gray-100 shrink-0 overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <ImageOff className="w-7 h-7 text-gray-300" />
            </div>
          )}
          {/* Vitrin badge */}
          <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-sm">
            <Star className="w-2.5 h-2.5 fill-amber-900" />
            Vitrin
          </span>
        </div>

        {/* Details */}
        <div className="p-2.5 flex flex-col flex-1">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5 flex-1">
            {listing.title}
          </p>
          <p className="text-sm font-extrabold text-orange-600 leading-none">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 truncate">{listing.city}</p>
        </div>
      </div>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export function FeaturedSection() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // First try the real featured endpoint; if no featured listings exist yet,
    // fall back to the 5 most-recent listings so the hero is never blank.
    listingsService
      .getListings({ isFeatured: true, limit: 5, page: 1 })
      .then((r) => {
        const featured = (r.listings ?? []).slice(0, 5);
        if (featured.length > 0) return featured;
        // No featured ads yet — fall back to recents
        return listingsService
          .getListings({ limit: 5, page: 1 })
          .then((rb) => (rb.listings ?? []).slice(0, 5));
      })
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Don't render the section at all if there's nothing to show (avoids empty hero gap)
  if (!loading && listings.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Section header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-amber-300 text-[11px] font-bold uppercase tracking-widest mb-0.5">
            ✦ Vitrin İlanları
          </p>
          <h2 className="text-white text-xl font-extrabold leading-tight">
            Günün Fırsatları
          </h2>
        </div>
        <Link
          href="/listings"
          className="text-blue-200 hover:text-white text-sm font-medium transition-colors shrink-0"
        >
          Tümünü Gör →
        </Link>
      </div>

      {/* Card grid — 2 cols mobile, 3 tablet, 5 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <FeaturedSkeleton key={i} />)
          : listings.map((l) => <FeaturedCard key={l.id} listing={l} />)
        }
      </div>
    </div>
  );
}
