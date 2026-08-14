'use client';

/**
 * The map VIEW — the browse-page panel that replaces the grid/list when the user
 * picks the map. `ListingsMap` draws points and reports clicks; this owns
 * everything around it: the map-points fetch, the cluster sheet, navigation to a
 * listing, and the honesty line about what the map cannot show.
 *
 * Shared by `/listings` and `/category/[...slug]` so the two surfaces cannot
 * drift — the same reason `buildListingQuery` exists one layer down. Each page
 * passes the SAME `listingQuery` object it hands the list, which is what makes
 * the map and the list describe one result set.
 *
 * ── Why its own fetch, and not the list's ────────────────────────────────────
 * The list is PAGINATED; a map of page 1 would be a map of twenty listings
 * pretending to be a map of the search. `getMapPoints` deliberately drops paging
 * and asks for the whole matched set (capped server-side, and the cap is
 * reported rather than hidden — see the summary line below).
 *
 * maplibre-gl is loaded through `next/dynamic({ ssr: false })` so it stays out
 * of the browse route's first load: a user who never opens the map never pays
 * for it. The sheet gets the same treatment for the same reason.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MapPinOff, X } from 'lucide-react';
import {
  listingsService,
  type GetListingsParams,
  type MapPoint,
  type MapPointsMeta,
} from '@/services/listings.service';

const ListingsMap = dynamic(() => import('./ListingsMap'), { ssr: false });
const ClusterListingsSheet = dynamic(() => import('./ClusterListingsSheet'), { ssr: false });

const SURFACE = 'h-[460px] sm:h-[620px]';

/**
 * What the map is NOT showing, said out loud.
 *
 * The map will almost always plot fewer listings than the list counts, for two
 * legitimate reasons the backend reports separately: sellers who opted out of a
 * map, and ads with no pin, no region and no governorate to place them by.
 * Silently showing 18 pins for a «25 إعلان» header would read as a bug — or
 * worse, be taken as the truth. `capped` is the third case: a result set larger
 * than the server's ceiling is trimmed, and that has to be admitted too.
 */
function mapSummary(meta: MapPointsMeta): string {
  const unplaced = meta.hiddenByOptOut + meta.unplaceable;
  const parts = [`يظهر ${meta.returned} إعلان على الخريطة`];
  if (unplaced > 0) parts.push(`${unplaced} بلا موقع محدد`);
  if (meta.capped)  parts.push(`تم عرض أول ${meta.cap} إعلان فقط`);
  return parts.join(' · ');
}

/**
 * Leave the map — a red ✕ over the map's top-right corner (the founder's chosen
 * corner, 2026-08-14).
 *
 * `right-3`, a PHYSICAL property, is deliberate and the one place in this file
 * that ignores the logical-property rule: the founder asked for the top-RIGHT
 * corner specifically, and `end-3` would mirror it to the left in this RTL app.
 * Do not "fix" it to a logical utility.
 *
 * The corner is free: maplibre's own zoom controls are mounted 'top-left' (see
 * useListingMapBase), so nothing is being covered.
 *
 * Red rather than the app's blue or orange: this is the one control on the map
 * that DISMISSES rather than navigates, and it has to be findable instantly over
 * an arbitrary basemap. The white ring is what separates it from whatever tile
 * happens to be underneath — on a busy map a flat button loses its own edge.
 */
function MapCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      // z-10 clears maplibre's controls, which sit at z-index 2 in its own CSS.
      className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-red-700 active:bg-red-800"
      title="إغلاق الخريطة"
      aria-label="إغلاق الخريطة"
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}

export default function ListingsMapView({
  query,
  onClose,
}: {
  query: GetListingsParams;
  /**
   * Leave the map for whichever list view the user was on, clearing `?view=map`.
   * Required, not optional: a map with no way out is the bug this prop exists to
   * prevent, so a new caller has to answer the question rather than inherit a
   * silent default.
   */
  onClose: () => void;
}) {
  const router = useRouter();
  const [points,  setPoints]  = useState<MapPoint[]>([]);
  const [meta,    setMeta]    = useState<MapPointsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);
  /** Ids under the cluster the user opened; null while the sheet is closed. */
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);

  // `query` is memoised by both callers, so this re-runs on a real filter change
  // and not on every render.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    listingsService
      .getMapPoints(query)
      .then((res) => {
        if (cancelled) return;
        setPoints(res.points);
        setMeta(res.meta);
      })
      .catch(() => {
        if (cancelled) return;
        setPoints([]);
        setMeta(null);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query]);

  // The close button rides on all THREE states, not just the drawn map: a user
  // who opened the map while offline, or who is watching the skeleton, needs the
  // way out most — and the view toggle is scrolled off-screen on a phone.
  if (loading) {
    return (
      <div className="relative">
        <div className={`${SURFACE} w-full animate-pulse rounded-card bg-gray-200`} />
        <MapCloseButton onClose={onClose} />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="relative">
        <div className={`${SURFACE} flex w-full flex-col items-center justify-center gap-3 rounded-card bg-gray-50 text-gray-400`}>
          <MapPinOff className="h-10 w-10" />
          <p className="text-base font-medium text-gray-600">تعذّر تحميل الخريطة</p>
        </div>
        <MapCloseButton onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Our own positioning context — NOT the element handed to maplibre. The
          map's container is sized inline inside MapSurface for the reason in
          AGENTS.md §8.11; this wrapper only anchors the close button. */}
      <div className="relative">
        <ListingsMap
          points={points}
          className={SURFACE}
          // One listing → straight to its page. A sheet holding a single row would
          // be an extra tap to reach the same place, and the detail view is a route
          // by standing preference (printable, deep-linkable).
          onSelectListing={(id) => router.push(`/listings/${id}`)}
          // A pile → the list, because the map cannot separate identical coordinates.
          onSelectCluster={setClusterIds}
        />
        <MapCloseButton onClose={onClose} />
      </div>

      {meta && (
        <p className="px-1 text-xs text-gray-500">
          {mapSummary(meta)}
        </p>
      )}

      <p className="px-1 text-[11px] text-gray-400">
        دائرة مصمتة = موقع دقيق من البائع · دائرة مفرغة = موقع تقريبي (مركز المنطقة أو المحافظة)
      </p>

      {clusterIds && (
        <ClusterListingsSheet ids={clusterIds} onClose={() => setClusterIds(null)} />
      )}
    </div>
  );
}
