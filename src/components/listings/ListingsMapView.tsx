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
import { MapPinOff } from 'lucide-react';
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

export default function ListingsMapView({ query }: { query: GetListingsParams }) {
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

  if (loading) {
    return <div className={`${SURFACE} w-full animate-pulse rounded-card bg-gray-200`} />;
  }

  if (failed) {
    return (
      <div className={`${SURFACE} flex w-full flex-col items-center justify-center gap-3 rounded-card bg-gray-50 text-gray-400`}>
        <MapPinOff className="h-10 w-10" />
        <p className="text-base font-medium text-gray-600">تعذّر تحميل الخريطة</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
