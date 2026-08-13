'use client';

/**
 * The answer to "what is actually at this point?".
 *
 * Most listings have no seller pin, so the backend places them on their region's
 * centroid — every pinless ad in المزة lands on ONE identical coordinate. The map
 * physically cannot separate those: zooming in never splits a pile at zero
 * distance, which is why a cluster click resolves to a LIST instead of a zoom
 * (see the note at the top of `ListingsMap`). This sheet is that list.
 *
 * It is a sheet and not a route because it answers a question ABOUT the map while
 * the user is still reading the map — closing it must put them back exactly where
 * they were, at the same zoom, with the same filters. The listings it lists are
 * still routes: every row is a real `<Link>` to `/listings/:id`, so the printable,
 * deep-linkable detail view stays a page (AGENTS §3.6). Nothing here is a
 * substitute for a listing page; it is a way into them.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, ImageOff } from 'lucide-react';
import { listingsService, MAX_LISTINGS_BY_ID } from '@/services/listings.service';
import { listingSpecChips, SPEC_CHIP_BASE, SPEC_CHIP_TONE } from './ListingCard';
import { formatListingPrice } from '@/lib/money';
import { formatAddressLine, formatRegionPath } from '@/lib/map';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types';

/**
 * Most-specific-first, because the row is already anchored to a point on a map.
 *
 * `locationPath` is the richer source ONLY when it actually has depth. It is the
 * one place the middle rungs (منطقة / ناحية) exist, but a listing filed straight
 * against a governorate comes back as a SINGLE node — and preferring that over
 * the denormalised columns would turn «قدسيا، دمشق» into a bare «دمشق», throwing
 * away the neighbourhood on exactly the centroid-placed listings this sheet
 * exists to disambiguate. Live example: `locationPath` = [دمشق] while the columns
 * carry neighborhood «قدسيا».
 *
 * So: use the path when it expresses more than the governorate, else the columns
 * (which `formatAddressLine` already de-duplicates), else whatever the path had.
 */
function locationLine(listing: Listing): string {
  const path = listing.locationPath;
  if (path && path.length > 1) return formatRegionPath(path, { specificFirst: true });
  return (
    formatAddressLine({
      neighborhood: listing.neighborhood,
      district: listing.district,
      city: listing.city,
      governorate: listing.governorate,
    }) || formatRegionPath(path, { specificFirst: true })
  );
}

function SheetRow({ listing }: { listing: Listing }) {
  const primary = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const specs = listingSpecChips(listing);
  const where = locationLine(listing);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-start gap-3 p-3 text-start transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element -- same raw <img> the
          // card uses for listing photos; these are arbitrary remote uploads.
          <img
            src={primary.url}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{listing.title}</p>
        <p className="mt-0.5 text-sm font-bold text-blue-600">
          {formatListingPrice(listing.price, listing.currency)}
        </p>
        {where && <p className="mt-0.5 truncate text-xs text-gray-500">{where}</p>}
        {specs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {specs.map((chip) => (
              <span key={chip.key} className={cn(SPEC_CHIP_BASE, SPEC_CHIP_TONE[chip.tone])}>
                {chip.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-3 p-3">
      <div className="h-16 w-20 shrink-0 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 w-3/4 rounded bg-gray-200" />
        <div className="h-3.5 w-1/3 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function ClusterListingsSheet({
  ids,
  onClose,
}: {
  /** Every listing id under the clicked cluster, in the map's own order. */
  ids: string[];
  onClose: () => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [failed, setFailed]     = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fetched on open, never up front: the ids are known from the map's own data,
  // but the cards behind them are only worth a request once someone asks.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    listingsService
      .getListingsByIds(ids)
      .then((rows) => {
        if (cancelled) return;
        setListings(rows);
        // One batch request now backs this. Getting NOTHING back for a non-empty
        // ask is a real failure; a short result is not — the backend omits ids it
        // will not serve (deleted or moderated between the map response and the
        // click), so five rows out of six is a correct sheet.
        setFailed(rows.length === 0 && ids.length > 0);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ids]);

  // Escape closes, and the close button takes focus on open so a keyboard user
  // lands inside the sheet rather than behind it on the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The page behind must not scroll while the sheet owns the screen — on iOS a
  // scrolling backdrop is what makes a bottom sheet feel broken.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const truncated = ids.length > MAX_LISTINGS_BY_ID;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${ids.length} إعلان في هذا الموقع`}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />

      <div className="relative flex max-h-[78vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[70vh] sm:max-w-md sm:rounded-2xl">
        {/* Grab handle — mobile affordance only; it says "this pulls down". */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-gray-900">
              {ids.length} إعلان في هذا الموقع
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {truncated
                ? `تُعرض أول ${MAX_LISTINGS_BY_ID} إعلاناً`
                : 'إعلانات تشترك في نفس النقطة على الخريطة'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
          {loading ? (
            Array.from({ length: Math.min(ids.length, 4) }).map((_, i) => <RowSkeleton key={i} />)
          ) : failed ? (
            <p className="p-6 text-center text-sm text-gray-500">
              تعذّر تحميل الإعلانات. أغلق النافذة وحاول مرة أخرى.
            </p>
          ) : (
            listings.map((l) => <SheetRow key={l.id} listing={l} />)
          )}
        </div>
      </div>
    </div>
  );
}
