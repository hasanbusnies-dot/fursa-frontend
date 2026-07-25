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

/** Brand orange-500 — the marker colour, matching the CTA palette. */
export const MAP_MARKER_COLOR = '#f97316';

export type Coords = { lat: number; lng: number };

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
