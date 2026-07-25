'use client';

/**
 * Read-only listing location map — the seller's coordinate on the detail page.
 *
 * Setup, readiness, error handling and sizing all live in `useListingMapBase`;
 * this file is only the read-only behaviour:
 *  · Exact pin, sahibinden-style: the coordinate is rendered as-is — no jitter,
 *    no rounding, no privacy circle. Validation happens in the caller
 *    (`toValidCoords`); this component trusts what it is handed.
 *  · Cooperative gestures ON: scroll-wheel and one-finger drag pass through to
 *    the page, so the map never hijacks scrolling on the location tab.
 *
 * Reached only through `next/dynamic({ ssr: false })` — see the location tab in
 * `app/listings/[id]/page.tsx`.
 */

import { useEffect, useRef } from 'react';
import { Marker } from 'maplibre-gl';
import {
  MAP_DEFAULT_ZOOM,
  MAP_GOVERNORATE_ZOOM,
  MAP_MARKER_COLOR,
  approximateAreaGeoJSON,
  type Coords,
} from '@/lib/map';
import { useListingMapBase, MapSurface } from './useListingMapBase';

const AREA_SOURCE = 'approx-area';
const AREA_FILL   = 'approx-area-fill';
const AREA_LINE   = 'approx-area-line';

export default function ListingMap({
  coords,
  label,
  variant = 'exact',
  onError,
  className = 'h-[300px] sm:h-[400px]',
}: {
  /**
   * `exact`: the seller's own coordinate — drawn as a pin.
   * `approximate`: a governorate centre derived at RENDER TIME from the city
   *   field. Never a stored coordinate, and deliberately never a pin: it is
   *   drawn as a soft circle so it cannot be mistaken for a precise location.
   */
  coords: Coords;
  /** Ad title — the marker's accessible name / tooltip. */
  label?: string;
  variant?: 'exact' | 'approximate';
  /** Called once when the map cannot be shown, so the tab can fall back to text. */
  onError?: () => void;
  className?: string;
}) {
  const markerRef = useRef<Marker | null>(null);
  const labelRef = useRef(label);
  labelRef.current = label;
  const approximate = variant === 'approximate';

  const { containerRef, mapRef, ready } = useListingMapBase({
    center: coords,
    // Approximate views open wide: a street-level zoom on a governorate centre
    // would imply precision we don't have.
    zoom: approximate ? MAP_GOVERNORATE_ZOOM : MAP_DEFAULT_ZOOM,
    // Scroll/one-finger gestures belong to the page, not the map.
    mapOptions: { cooperativeGestures: true },
    locale: approximate ? { 'Map.Title': 'خريطة تقريبية' } : undefined,
    onError,
    setup: (map) => {
      if (approximate) return; // no marker — see the circle effect below
      // Exact coordinate, no offset — brand orange, tip on the point.
      const marker = new Marker({ color: MAP_MARKER_COLOR, anchor: 'bottom' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
      const el = marker.getElement();
      el.setAttribute('aria-label', labelRef.current ?? 'موقع الإعلان');
      el.setAttribute('title', labelRef.current ?? 'موقع الإعلان');
      markerRef.current = marker;
      return () => {
        marker.remove();
        markerRef.current = null;
      };
    },
  });

  // Approximate area circle. Added once the style is ready (layers can't be
  // added before it resolves), and idempotent so a re-run can't stack sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !approximate || !ready) return;
    if (map.getSource(AREA_SOURCE)) return;

    map.addSource(AREA_SOURCE, { type: 'geojson', data: approximateAreaGeoJSON(coords) });
    map.addLayer({
      id: AREA_FILL,
      type: 'fill',
      source: AREA_SOURCE,
      paint: { 'fill-color': MAP_MARKER_COLOR, 'fill-opacity': 0.12 },
    });
    map.addLayer({
      id: AREA_LINE,
      type: 'line',
      source: AREA_SOURCE,
      paint: {
        'line-color': MAP_MARKER_COLOR,
        'line-opacity': 0.5,
        'line-width': 2,
        // Dashed, so the edge never reads as a real boundary.
        'line-dasharray': [2, 2],
      },
    });

    return () => {
      // The map may already be torn down by the base hook's cleanup.
      if (!map.getSource(AREA_SOURCE)) return;
      if (map.getLayer(AREA_LINE)) map.removeLayer(AREA_LINE);
      if (map.getLayer(AREA_FILL)) map.removeLayer(AREA_FILL);
      map.removeSource(AREA_SOURCE);
    };
  }, [approximate, ready, coords, mapRef]);

  // A coordinate change after mount is not a reason to rebuild the map — move
  // the marker and ease the camera instead. (In practice one listing per page.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current) return;
    markerRef.current.setLngLat([coords.lng, coords.lat]);
    map.easeTo({ center: [coords.lng, coords.lat], duration: 300 });
  }, [coords.lat, coords.lng, mapRef]);

  return (
    <MapSurface containerRef={containerRef} ready={ready} className={className}>
      {approximate && ready && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <span className="rounded-full bg-gray-900/75 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm">
            موقع تقريبي
          </span>
        </div>
      )}
    </MapSurface>
  );
}
