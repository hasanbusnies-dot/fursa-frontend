'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { listingsService } from '@/services/listings.service';
import { ListingCard } from './ListingCard';
import type { Listing } from '@/types';

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

function ShowcasePlaceholderCard() {
  return (
    <Link
      href="/vitrin"
      className="group flex flex-col items-center justify-center gap-3 h-full min-h-[260px] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all cursor-pointer px-4 py-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
        <Megaphone className="w-7 h-7 text-blue-500" />
      </div>
      <div>
        <p className="font-bold text-blue-700 text-sm leading-snug">
          احجز مكانك هنا
        </p>
        <p className="text-[11px] text-blue-500 mt-1">
          احصل على واجهة الصفحة الرئيسية ←
        </p>
      </div>
    </Link>
  );
}

// ── Feed size ─────────────────────────────────────────────────────────────────
// This feed is a fixed count, not a pager: «عرض الكل ←» is the only way to more, so
// the number below IS the homepage feed. Desktop lays the grid out 5–6 cards across,
// where the old 12 ran out after two rows and left the page looking empty; 30 fills
// about five rows and still costs a single request (the backend caps /listings at
// 100 and defaults to 30 itself).
const DESKTOP_FEED_LIMIT = 30;
// Mobile deliberately keeps the old count. The same grid is ONE column below `sm`, so
// 30 cards is 30 screens of scrolling to reach PersonalizedAds — and ListingCard
// renders a plain eager <img>, so every extra card is an image pulled over mobile
// data whether or not it is ever scrolled to.
const MOBILE_FEED_LIMIT = 12;
// Matches Tailwind's `lg` — where this grid widens to 5 columns and app/page.tsx
// reveals the sidebar. Same query HomeCategorySidebar gates its fetch on.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function RecentAds({ sectionClassName = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 pb-16' }: { sectionClassName?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Homepage sort: ONLY Anasayfa Vitrini (`homepageShowcaseUntil`) gets priority here.
  // Other doping types (categoryShowcase, topOfSearch, highlight, urgent) do NOT affect homepage order.
  const sortedListings = useMemo(() => {
    const now = Date.now();
    return [...listings].sort((a, b) => {
      const aScore = (!!a.homepageShowcaseUntil && new Date(a.homepageShowcaseUntil).getTime() > now) ? 1 : 0;
      const bScore = (!!b.homepageShowcaseUntil && new Date(b.homepageShowcaseUntil).getTime() > now) ? 1 : 0;
      return bScore - aScore;
    });
  }, [listings]);

  useEffect(() => {
    // The viewport is read HERE rather than kept in state: this effect runs once,
    // after mount, and the grid it feeds sits behind skeletons until the fetch lands
    // — so there is no server markup to mismatch and no second request the way a
    // state-then-refetch would cost every desktop load. The trade is that a
    // mid-session resize keeps the count it loaded with, which is fine for a feed
    // whose "more" affordance is a link to /listings.
    const limit =
      typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_QUERY)?.matches
        ? DESKTOP_FEED_LIMIT
        : MOBILE_FEED_LIMIT;

    Promise.allSettled([
      listingsService.getShowcase('HOMEPAGE'),
      listingsService.getListings({ limit, page: 1 }).then((r) => r.listings),
    ]).then(([showcaseResult, recentResult]) => {
      const showcase = showcaseResult.status === 'fulfilled' ? showcaseResult.value : [];
      const recent   = recentResult.status   === 'fulfilled' ? recentResult.value   : [];
      // Deduplicate by id — showcase entries take precedence (appear first in Set order)
      const seen = new Set<string>();
      const merged: Listing[] = [];
      for (const listing of [...showcase, ...recent]) {
        if (!seen.has(listing.id)) {
          seen.add(listing.id);
          merged.push(listing);
        }
      }
      setListings(merged);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">واجهة فرصة</h2>
        <Link href="/listings" className="text-sm text-blue-600 hover:underline font-medium">
          عرض الكل ←
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <SkeletonCard />
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <ShowcasePlaceholderCard />
          {sortedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} showCompare={false} isHomepageView={true} />
          ))}
        </div>
      )}
    </section>
  );
}
