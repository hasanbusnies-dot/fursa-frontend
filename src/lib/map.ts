/**
 * Map constants + pure helpers for the listing location map.
 *
 * Deliberately maplibre-free: everything here is safe to import from the page
 * bundle. The library itself only ever enters the graph through
 * `components/listings/ListingMap.tsx`, which is loaded via next/dynamic so
 * maplibre-gl stays in its own chunk.
 */

/**
 * Tile/style provider. OpenFreeMap "Liberty" — free, no API key, no usage cap.
 * Pinned to one constant so swapping providers (MapTiler, Protomaps, self-host)
 * is a one-line change here or an env override at build time.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Arabic label shaping for map glyphs. Vendored into /public rather than pulled
 * from unpkg: no third-party origin at runtime, and it keeps working offline in
 * dev. Loaded lazily by maplibre — the browser only fetches it when a style
 * actually needs RTL shaping.
 */
export const MAP_RTL_PLUGIN_URL = '/vendor/mapbox-gl-rtl-text.js';

/**
 * maplibre's tile-parsing worker, served by us instead of by the bundler.
 *
 * Turbopack rewrites `import.meta.url` inside maplibre to a `file://` string.
 * maplibre derives its worker URL from that value and bails to `''` when the
 * scheme isn't http(s), so it ends up calling `new Worker('', {type:'module'})`
 * — which resolves to the current document, gets HTML back, and fails with
 * "non-JavaScript MIME type of 'text/html'". Passing an explicit URL to
 * `setWorkerUrl()` takes the bundler out of the loop.
 *
 * `maplibre-gl-shared.mjs` must stay beside it under that exact name: it is the
 * worker's only import. Both are copied by `scripts/vendor-map-assets.mjs`,
 * which `predev`/`prebuild` run so they can't drift from the installed version.
 */
export const MAP_WORKER_URL = '/vendor/maplibre/maplibre-gl-worker.mjs';

/** Zoom for a single-pin "here is the ad" view — street level, block legible. */
export const MAP_DEFAULT_ZOOM = 15;

/** Zoom for a known point: the seller's own pin, or a GPS fix. */
export const MAP_PIN_ZOOM = 16;

/**
 * Zoom for "somewhere in this governorate" — wide enough that the view reads as
 * an approximation rather than a claim about a specific street.
 */
export const MAP_GOVERNORATE_ZOOM = 11;

/**
 * Zoom for a district — between the governorate overview and a named place.
 * A district is an administrative grouping that can span tens of kilometres, so
 * this stays deliberately wide.
 */
export const MAP_DISTRICT_ZOOM = 12;

/**
 * Zoom for a named neighborhood/village picked from the location catalog.
 *
 * Close enough that the seller can see the streets they're about to drop a pin
 * on, but NOT `MAP_PIN_ZOOM` — a catalog centroid is the middle of a whole
 * place, and opening at pin zoom would frame it like a precise address.
 */
export const MAP_PLACE_ZOOM = 14;

/** Brand orange-500 — the marker colour, matching the CTA palette. */
export const MAP_MARKER_COLOR = '#f97316';

export type Coords = { lat: number; lng: number };

/** Fallback centre when the seller hasn't picked a governorate yet. */
export const DAMASCUS_CENTER: Coords = { lat: 33.5138, lng: 36.2765 };

/**
 * Approximate centre of each Syrian governorate — used ONLY to decide where the
 * picker map opens, so the seller starts near the area they already selected
 * instead of somewhere irrelevant.
 *
 * Two rules that matter:
 *  1. These are never persisted and never become a pin. Centring the view is not
 *     the same as claiming a location: auto-dropping a marker here would save a
 *     fake coordinate that the listing page then renders as a confident exact
 *     pin — strictly worse than having no coordinate at all. A pin exists only
 *     after the seller taps, drags, or uses the location button.
 *  2. Keys are the exact strings in `SYRIAN_GOVERNORATES` (wizard/schema.ts).
 *     The wizard stores the chosen governorate in its `city` field — see the
 *     naming note there — so lookups are keyed off `city`, not `governorate`.
 */
export const GOVERNORATE_CENTERS: Record<string, Coords> = {
  'دمشق':      { lat: 33.5138, lng: 36.2765 },
  'ريف دمشق':  { lat: 33.5500, lng: 36.4500 },
  'حلب':       { lat: 36.2021, lng: 37.1343 },
  'حمص':       { lat: 34.7324, lng: 36.7137 },
  'حماة':      { lat: 35.1318, lng: 36.7578 },
  'اللاذقية':  { lat: 35.5196, lng: 35.7915 },
  'طرطوس':     { lat: 34.8890, lng: 35.8866 },
  'إدلب':      { lat: 35.9306, lng: 36.6339 },
  'دير الزور': { lat: 35.3359, lng: 40.1408 },
  'الرقة':     { lat: 35.9594, lng: 39.0079 },
  'درعا':      { lat: 32.6189, lng: 36.1021 },
  'السويداء':  { lat: 32.7094, lng: 36.5694 },
  'القنيطرة':  { lat: 33.1256, lng: 35.8239 },
  'الحسكة':    { lat: 36.5024, lng: 40.7477 },
};

/**
 * Radius of the "somewhere around here" circle drawn when a listing has no pin.
 *
 * It is not a claim about the governorate's boundary — governorates range from
 * Damascus city to al-Hasakah — it's a deliberately soft area that reads as
 * "approximately here" next to the «موقع تقريبي» label doing the real work.
 */
export const MAP_APPROX_RADIUS_KM = 10;

/**
 * Key under which the seller's "don't show a map on my listing" choice rides in
 * `Listing.attributes` (JSONB).
 *
 * Underscore-prefixed by the existing convention for non-catalog internal keys
 * (`_seed`/`_seedKey` from the backend test seeder) — the detail page's spec
 * table already skips every `_`-prefixed key, so this never surfaces as a row.
 * See FOLLOWUPS.md: a real boolean column is the better long-term home, and only
 * this constant plus one payload line change when it lands.
 */
export const HIDE_MAP_ATTR_KEY = '_hideMap';

/** Did the seller ask for no map at all on this listing? */
export function isLocationMapHidden(attributes?: Record<string, unknown> | null): boolean {
  const v = attributes?.[HIDE_MAP_ATTR_KEY];
  return v === true || v === 'true';
}

/**
 * A circle as a GeoJSON polygon, in real ground units so it scales honestly when
 * the buyer zooms (a pixel-radius circle would silently claim a different area
 * at every zoom level).
 */
export function approximateAreaGeoJSON(
  center: Coords,
  radiusKm: number = MAP_APPROX_RADIUS_KM,
  steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
  // Degrees per km, corrected for latitude on the longitude axis.
  const dLng = radiusKm / (111.320 * Math.cos((center.lat * Math.PI) / 180));
  const dLat = radiusKm / 110.574;
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([center.lng + dLng * Math.cos(t), center.lat + dLat * Math.sin(t)]);
  }
  ring.push(ring[0]); // close it
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/**
 * Centre of a named governorate, or null when the name isn't one we know.
 *
 * Returning null rather than a Damascus fallback matters for the recentre path:
 * an unrecognised or cleared selection should leave the map where it is, not
 * yank the seller to Damascus.
 */
export function governorateCenter(governorate?: string | null): Coords | null {
  const g = governorate?.trim();
  return (g && GOVERNORATE_CENTERS[g]) || null;
}

/**
 * Where the picker map should open, and how close.
 *
 * Precedence: the seller's existing pin → the governorate they picked → Damascus.
 * `hasPin` tells the caller whether to draw a marker; it is true ONLY for case
 * one, never for a fallback centre.
 */
export function pickerInitialView(
  existing: Coords | null,
  governorate?: string | null,
): { center: Coords; zoom: number; hasPin: boolean } {
  if (existing) return { center: existing, zoom: MAP_PIN_ZOOM, hasPin: true };
  return {
    center: governorateCenter(governorate) ?? DAMASCUS_CENTER,
    zoom: MAP_GOVERNORATE_ZOOM,
    hasPin: false,
  };
}

/**
 * Accepts a listing's raw lat/lng and returns usable coordinates or null.
 *
 * Rejects: null/undefined, non-numeric strings, NaN/Infinity, out-of-range
 * values, and the exact (0, 0) null-island — which is what a half-filled form
 * or a zero-defaulted DB column produces, never a real Syrian address.
 */
export function toValidCoords(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): Coords | null {
  const la = typeof lat === 'string' ? Number(lat) : lat;
  const ln = typeof lng === 'string' ? Number(lng) : lng;
  if (la == null || ln == null) return null;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

/**
 * Human address line, most-specific first (RTL reads it right-to-left, so the
 * neighborhood leads). Blank/duplicate parts are dropped — listings frequently
 * repeat city in governorate.
 */
export function formatAddressLine(parts: {
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  governorate?: string | null;
}): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [parts.neighborhood, parts.district, parts.city, parts.governorate]) {
    const t = p?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join('، ');
}

type Platform = 'android' | 'ios' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS 13+ reports a desktop Safari UA; the touch-point count gives it away.
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1) return 'ios';
  return 'other';
}

/**
 * Plain consumer deep link to turn-by-turn directions — no API, no key, no SDK.
 *
 *  · Android → `geo:` intent, which hands the user their own app chooser
 *    (Google Maps / Waze / Yandex — the last two matter in Syria).
 *  · iOS     → Apple Maps universal link; opens the app, falls back to web.
 *  · else    → Google Maps directions URL (desktop + any unknown platform).
 *
 * SSR-safe: called with no platform on the server/first paint it returns the
 * Google link, which is a valid destination everywhere.
 */
export function directionsUrl({ lat, lng }: Coords, label?: string, platform?: Platform): string {
  const p = platform ?? detectPlatform();
  const dest = `${lat},${lng}`;
  if (p === 'android') {
    const q = label ? `${dest}(${encodeURIComponent(label)})` : dest;
    return `geo:${dest}?q=${q}`;
  }
  if (p === 'ios') {
    return `https://maps.apple.com/?daddr=${dest}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/** Client-only platform probe, for components that swap the href after mount. */
export function currentPlatform(): Platform {
  return detectPlatform();
}
