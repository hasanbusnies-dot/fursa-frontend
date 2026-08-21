'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { recommendationsService } from '@/services/recommendations.service';
import { useAuthStore } from '@/store/auth.store';
import { ListingCard } from '@/components/listings/ListingCard';
import type { Listing } from '@/types';

/**
 * «إعلانات مخصصة لك» — the personalized strip at the BOTTOM of the mobile homepage.
 *
 * Data: `recommendationsService.getSuggested()` — the exact call the header's
 * RecommendationsPopover makes for its "إعلانات قد تهمك" tab. The backend derives it
 * from the signed-in user's own view history (most-viewed category → newest ACTIVE
 * listings there they haven't seen yet), capped at 3.
 *
 * AUTH — the whole `/recommendations` router sits behind `requireAuth`, so there is no
 * anonymous/generic variant to fall back to: a logged-out visitor gets 401, not popular
 * listings. The section therefore renders NOTHING when logged out rather than borrowing
 * the general feed and labelling it "personalized" — which would be a lie, and the
 * homepage feed directly above already IS that general feed.
 *
 * EMPTY — a signed-in user with no view history gets `[]` from the backend (that check
 * is explicit in recommendations.service.ts). Nothing renders: no orphan heading.
 *
 * MOBILE-ONLY — `md:hidden`. The founder asked for the app homepage; desktop is
 * untouched. NOTE: MobileCategoryList above it is `lg:hidden`, not `md:hidden` —
 * it has to cover tablets because it is the only category nav below `lg`. This
 * section has no such pairing, so it stays phone-only.
 */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-card shadow-pebble overflow-hidden">
      {/* h-36 + p-2.5 mirrors ListingCard's `layout="stacked"` metrics, so the
          skeleton occupies the exact box the real card lands in. */}
      <div className="bg-gray-200 h-36 w-full animate-pulse" />
      <div className="p-2.5 space-y-2">
        <div className="bg-gray-200 h-4 rounded-md w-3/4 animate-pulse" />
        <div className="bg-gray-200 h-4 rounded-md w-1/3 animate-pulse" />
        <div className="bg-gray-200 h-3 rounded-md w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

export function PersonalizedAds() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Zustand's persist rehydrates AFTER the first client render, so `isAuthenticated`
    // starts false even for a returning user — keeping it in the deps is what makes the
    // fetch fire once the session lands.
    if (!isAuthenticated) {
      setListings([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    recommendationsService
      .getSuggested()
      .then((res) => { if (!cancelled) setListings(res); })
      .catch(() => { if (!cancelled) setListings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Logged out, or signed in with nothing to suggest → the section does not exist.
  if (!isAuthenticated) return null;
  if (!loading && listings.length === 0) return null;

  return (
    <section className="md:hidden pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-bold text-gray-900">إعلانات مخصصة لك</h2>
      </div>

      {/* Two columns on a phone — which is why the cards are passed
          `layout="stacked"`: the default 'auto' shape is a full-width row whose
          112px thumbnail leaves no room for text inside a half-width column. */}
      <div className="grid grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                layout="stacked"
                showCompare={false}
                isHomepageView
              />
            ))}
      </div>

      {/* «عرض الكل» — the founder's design puts it BELOW the cards, not beside the
          heading the way RecentAds does: this section is the tail of the page, so the
          link is the last thing the thumb reaches rather than something scrolled past.
          Hidden while loading so it can't be tapped before we know the section stays.
          ArrowLeft, not ArrowRight — "forward" points LEFT under RTL. */}
      {!loading && (
        <Link
          href="/recommendations"
          className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-card border border-gray-200 bg-white py-3 text-sm font-semibold text-blue-600 shadow-pebble active:bg-gray-50 transition-colors"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}
    </section>
  );
}
