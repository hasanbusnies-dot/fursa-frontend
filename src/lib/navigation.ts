'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── Smart back navigation ────────────────────────────────────────────────────
//
// Every back button in the app used to push a destination derived from the URL
// string (strip the last segment) or a hardcoded constant. That answers "what is
// above this URL", never "where was the user" — so back from a listing landed on
// the generic all-listings page even when the user had walked
// مركبات › سيارات › سيارات للبيع to get there, because the listing route
// (/listings/<id>) is FLAT and carries no category at all.
//
// The fix is the pattern classifieds/e-commerce apps actually use:
//
//   real in-app history when there is any, otherwise a CONTEXTUAL fallback the
//   page supplies from its own content (a listing → its category, not the URL's
//   parent).
//
// Two halves live here: the per-tab history depth (below) and `useSmartBack`.
//
// WHY A COUNTER: Next exposes no history-depth API (see
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md
// — push/replace/back/forward/prefetch and nothing else), and the browser's own
// signals are useless for this: `history.length` counts entries from before the
// user reached us and never decreases, and `document.referrer` is empty across
// client-side navigations. So the depth is tracked by NavigationTracker, which
// is mounted once in the root layout.
//
// sessionStorage, not module state: it must survive a reload of a deep page
// (the history entries still exist afterwards) while a link opened in a NEW tab
// — the deep-link case this whole file exists for — starts empty and therefore
// at depth 0.

const DEPTH_KEY = 'forsa-nav-depth';
const PREV_KEY  = 'forsa-nav-prev';
const SKIP_KEY  = 'forsa-nav-skip';

// sessionStorage throws in private mode / with storage disabled. Every read
// degrades to "no in-app history", which routes back to the contextual
// fallback — the safe direction, and still a sensible destination.
function read(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* no storage — depth stays 0 */ }
}
function drop(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* see above */ }
}

/** How many in-app navigations happened in THIS tab. 0 ⇒ direct/deep-link entry. */
export function inAppDepth(): number {
  const n = Number(read(DEPTH_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The pathname we navigated away from, or null on the first page of a session. */
export function previousPathname(): string | null {
  return read(PREV_KEY);
}

/**
 * Record one in-app navigation. Called ONLY by NavigationTracker.
 *
 * The count is deliberately monotonic: it answers "is there anything behind us
 * in this tab", and a `router.back()` that lands on an older page is itself a
 * navigation that leaves history behind us either way. It is never decremented.
 */
export function recordNavigation(from: string): void {
  write(PREV_KEY, from);
  // A synthetic back (see useSmartBack) REPLACED the current entry rather than
  // stacking a new one, so the tab is no deeper than it was.
  if (read(SKIP_KEY)) { drop(SKIP_KEY); return; }
  write(DEPTH_KEY, String(inAppDepth() + 1));
}

/** Marks the next navigation as one that replaces the current entry, not a push. */
export function markSyntheticNavigation(): void {
  write(SKIP_KEY, '1');
}

// A listing detail route — `/listings/<id>`, but not `/listings/edit/<id>`
// (two segments) and not the bare browse page. `/listings/create` matches, and
// that is wanted: publishing hands off to the new listing, and back from there
// must not drop the seller into the wizard again.
const LISTING_ROUTE = /^\/listings\/[^/]+$/;

/**
 * Would `router.back()` just walk one step along a chain of the same kind of
 * page? Listing → listing hops (a seller's other ads, a store's grid) are the
 * real case: the user thinks of «رجوع» as "out of the listings, back to the
 * category", not "the previous listing", and walking the chain one ad at a time
 * is what makes a back button feel broken.
 */
function isChainedHop(current: string): boolean {
  const prev = previousPathname();
  return !!prev && LISTING_ROUTE.test(current) && LISTING_ROUTE.test(prev);
}

/**
 * A back handler: real history when this tab has any, else `fallback`.
 *
 * `fallback` is the CONTEXTUAL destination the calling surface derives from its
 * own content — a listing passes its deepest catalog category, a category page
 * passes its parent crumb, notifications and messages pass the home page. It is
 * what a deep-linked visitor (shared WhatsApp link, Google result, new tab) gets,
 * and it must always be somewhere that makes sense standing alone.
 *
 * The fallback navigates with REPLACE, not push, and that is load-bearing: a
 * push would leave the deep-linked page sitting behind us in history, so the
 * next back would return to it, whose back would come here again — an infinite
 * ping-pong between two pages. Replacing keeps depth at 0, so each further back
 * walks one more rung UP the fallback chain (listing → its category → that
 * category's parent → الرئيسية) and terminates.
 */
export function useSmartBack(fallback: string): () => void {
  const router   = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    // Resolved at CLICK time, never during render: reading sessionStorage while
    // rendering would put storage-dependent output in the server/first-client
    // markup and desync hydration.
    if (inAppDepth() > 0 && !isChainedHop(pathname)) {
      router.back();
      return;
    }
    markSyntheticNavigation();
    router.replace(fallback);
  }, [router, pathname, fallback]);
}
