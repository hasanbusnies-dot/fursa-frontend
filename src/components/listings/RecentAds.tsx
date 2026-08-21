'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Megaphone } from 'lucide-react';
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
// This feed is a showcase, not a pager: «عرض الكل ←» jumps to the full filterable
// browse page, and «عرض المزيد» APPENDS the next page below — it never replaces
// what is already on screen. The number below is therefore ONE PAGE's worth, not
// the size of the feed. Desktop lays the grid out 5–6 cards across, where the old
// 12 ran out after two rows and left the page looking empty; 30 fills about five
// rows and still costs a single request (the backend caps /listings at 100 and
// defaults to 30 itself).
const DESKTOP_FEED_LIMIT = 30;
// Mobile deliberately keeps the old count. The same grid is ONE column below `sm`, so
// 30 cards is 30 screens of scrolling to reach PersonalizedAds — and ListingCard
// renders a plain eager <img>, so every extra card is an image pulled over mobile
// data whether or not it is ever scrolled to. On mobile the extra pages are opt-in
// via the button, which is the whole point.
const MOBILE_FEED_LIMIT = 12;
// Matches Tailwind's `lg` — where this grid widens to 5 columns and app/page.tsx
// reveals the sidebar. Same query HomeCategorySidebar gates its fetch on.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function RecentAds({ sectionClassName = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 pb-16' }: { sectionClassName?: string }) {
  // ONE flat, append-only list, held in RENDER order. Page 1 lands showcase-first
  // (see the effect); every later page is concatenated BELOW it, untouched. There
  // is deliberately no sort over this array — re-sorting on append would let a
  // page-3 item float above cards the reader has already scrolled past, which is
  // the one thing a "load more" must never do.
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  // Stays false until page 1 answers, so the button can never appear before we
  // know whether there IS a page 2.
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Every id ever rendered, kept ACROSS loads. A homepage-showcase listing also
  // appears at its natural position in the chronological feed, and that position
  // can be on any page, not just page 1 — rebuilding this per fetch would dedupe
  // only within a page and let the same card come back on the next one.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // The page size chosen at mount, reused for every later page so paging stays
  // aligned with what page 1 asked for (see the resize note in the effect).
  const limitRef = useRef<number>(MOBILE_FEED_LIMIT);
  // Guards a double click / held Enter from firing two requests for the same
  // page; the `loadingMore` state alone is a frame too late.
  const inFlightRef = useRef(false);

  /** Appends only ids not seen before, in the order given. Never re-orders. */
  const appendUnseen = useCallback((incoming: Listing[]) => {
    const fresh: Listing[] = [];
    for (const listing of incoming) {
      if (!listing?.id || seenIdsRef.current.has(listing.id)) continue;
      seenIdsRef.current.add(listing.id);
      fresh.push(listing);
    }
    if (fresh.length) setListings((prev) => [...prev, ...fresh]);
  }, []);

  useEffect(() => {
    // The viewport is read HERE rather than kept in state: this effect runs once,
    // after mount, and the grid it feeds sits behind skeletons until the fetch lands
    // — so there is no server markup to mismatch and no second request the way a
    // state-then-refetch would cost every desktop load. The trade is that a
    // mid-session resize keeps the count it loaded with, which is fine for a feed
    // that grows by appending pages of that same size.
    const limit =
      typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_QUERY)?.matches
        ? DESKTOP_FEED_LIMIT
        : MOBILE_FEED_LIMIT;
    limitRef.current = limit;

    Promise.allSettled([
      // PAGE 1 ONLY. The showcase block is a fixed masthead for this feed, not part
      // of the pagination — «عرض المزيد» must never re-fetch it, or every page
      // would repeat the same doped listings at the bottom of the grid.
      listingsService.getShowcase('HOMEPAGE'),
      listingsService.getListings({ limit, page: 1 }),
    ]).then(([showcaseResult, recentResult]) => {
      const showcase = showcaseResult.status === 'fulfilled' ? showcaseResult.value : [];
      const recent   = recentResult.status   === 'fulfilled' ? recentResult.value.listings : [];

      // Homepage sort: ONLY Anasayfa Vitrini (`homepageShowcaseUntil`) gets priority,
      // and ONLY here, over page 1. Other doping types (categoryShowcase, topOfSearch,
      // highlight, urgent) do NOT affect homepage order. Sorting page 1 before it is
      // on screen keeps the look this feed had; the result is then frozen as the head
      // of the list and every later page lands underneath it.
      const now = Date.now();
      const isActiveShowcase = (l: Listing) =>
        !!l.homepageShowcaseUntil && new Date(l.homepageShowcaseUntil).getTime() > now;
      // Array.prototype.sort is stable, so equal-score items keep API order.
      const firstPage = [...showcase, ...recent].sort(
        (a, b) => (isActiveShowcase(b) ? 1 : 0) - (isActiveShowcase(a) ? 1 : 0),
      );

      appendUnseen(firstPage);

      if (recentResult.status === 'fulfilled') {
        const { page: gotPage, totalPages } = recentResult.value;
        setHasMore(recent.length > 0 && gotPage < totalPages);
      }
    }).finally(() => setLoading(false));
  }, [appendUnseen]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !hasMore) return;
    inFlightRef.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);

    const nextPage = page + 1;
    try {
      // The chronological feed only — no getShowcase here, by design.
      const result = await listingsService.getListings({ limit: limitRef.current, page: nextPage });
      setPage(nextPage);
      // Anything already on screen (a showcase card pinned at the top, or a listing
      // that straddled a page boundary) is dropped by the seen-Set.
      appendUnseen(result.listings);
      setHasMore(result.listings.length > 0 && result.page < result.totalPages);
    } catch {
      // Keep the button so the click is retryable — the page counter did not move.
      setLoadMoreFailed(true);
    } finally {
      inFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [appendUnseen, hasMore, page]);

  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">واجهة فرصة</h2>
        {/* Kept alongside «عرض المزيد»: the button is for casual browsing in place,
            this link is the way out to the full filterable browse page. */}
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Rendered once, outside the map: a promo card, not a feed item. */}
            <ShowcasePlaceholderCard />
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} showCompare={false} isHomepageView={true} />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center justify-center gap-2 min-w-[200px] px-8 py-3 rounded-xl border border-blue-200 bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 hover:border-blue-300 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ التحميل...
                  </>
                ) : (
                  'عرض المزيد'
                )}
              </button>
              {loadMoreFailed && (
                <p className="text-xs text-red-600">تعذّر تحميل المزيد، حاول مرة أخرى</p>
              )}
            </div>
          ) : (
            // Only once the reader has actually asked for more — on a short feed
            // that ends on page 1 there is nothing to explain.
            page > 1 && (
              <p className="mt-8 text-center text-sm text-gray-500">لا مزيد من الإعلانات</p>
            )
          )}
        </>
      )}
    </section>
  );
}
