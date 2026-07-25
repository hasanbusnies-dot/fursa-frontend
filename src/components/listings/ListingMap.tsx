'use client';

/**
 * Listing location map — MapLibre GL + OpenFreeMap (Liberty).
 *
 * This is the ONLY module that imports maplibre-gl, and it is always reached
 * through `next/dynamic` with `ssr: false` (see the location tab in
 * `app/listings/[id]/page.tsx`). Keeping the import isolated is what keeps the
 * ~800 kB library in its own chunk instead of the listing route's first load.
 *
 * Behaviour notes:
 *  · Exact pin, sahibinden-style: the seller's coordinate is rendered as-is —
 *    no jitter, no rounding, no privacy circle. Coordinate validation happens
 *    in the caller (`toValidCoords`); this component trusts what it is handed.
 *  · Rotation is off entirely (no compass, no drag-rotate, no touch-rotate) —
 *    a tilted/rotated street map is noise for a "where is this ad" view.
 *  · Cooperative gestures: scroll-wheel and one-finger drag pass through to the
 *    page, so the map never hijacks scrolling on the tab. The bypass hint is
 *    Arabic, via maplibre's locale table.
 *  · Anything that goes wrong before the style loads (offline, WebGL missing,
 *    provider down) calls `onError` so the tab can fall back to text.
 */

import { useEffect, useRef, useState } from 'react';
// maplibre-gl v6 is ESM-only with named exports (no default export).
// `MapLibreMap` is the exported alias for the Map class — used as value + type.
import {
  MapLibreMap,
  Marker,
  NavigationControl,
  setRTLTextPlugin,
  getRTLTextPluginStatus,
  setWorkerUrl,
  getWorkerUrl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MAP_STYLE_URL,
  MAP_RTL_PLUGIN_URL,
  MAP_WORKER_URL,
  MAP_DEFAULT_ZOOM,
  MAP_MARKER_COLOR,
  type Coords,
} from '@/lib/map';

/** Arabic UI strings for the controls maplibre renders itself. */
const AR_LOCALE: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'إظهار مصادر الخريطة',
  'AttributionControl.MapFeedback': 'ملاحظات على الخريطة',
  'Map.Title': 'خريطة',
  'Marker.Title': 'موقع الإعلان',
  'NavigationControl.ZoomIn': 'تكبير',
  'NavigationControl.ZoomOut': 'تصغير',
  'CooperativeGesturesHandler.WindowsHelpText': 'اضغط Ctrl + التمرير للتكبير',
  'CooperativeGesturesHandler.MacHelpText': 'اضغط ⌘ + التمرير للتكبير',
  'CooperativeGesturesHandler.MobileHelpText': 'استخدم إصبعين لتحريك الخريطة',
};

/**
 * The RTL shaping plugin is global to maplibre and must be registered before the
 * first Map is constructed. `lazy: true` defers the actual download until a
 * style needs Arabic/Hebrew glyph shaping. Status is checked because React
 * StrictMode mounts this component twice and a second call throws.
 */
function ensureRtlPlugin() {
  try {
    if (getRTLTextPluginStatus() !== 'unavailable') return;
    // Rejections are non-fatal: labels fall back to unshaped glyphs.
    void setRTLTextPlugin(MAP_RTL_PLUGIN_URL, true)?.catch?.(() => {});
  } catch {
    /* already registered by an earlier mount — nothing to do */
  }
}

/**
 * Point maplibre at the worker we serve ourselves. Without this, Turbopack's
 * `file://` rewrite of `import.meta.url` leaves maplibre with an empty worker
 * URL, `new Worker('')` fetches the current page, and the browser rejects the
 * HTML as a module script — the map never initialises. See MAP_WORKER_URL.
 *
 * Global and idempotent; must run before the first Map is constructed.
 */
function ensureWorkerUrl() {
  if (!getWorkerUrl()) setWorkerUrl(MAP_WORKER_URL);
}

/** If the style still hasn't loaded by now, treat the map as unavailable. */
const LOAD_TIMEOUT_MS = 12_000;

/**
 * How often to ask the map whether it's ready, as a backstop to the events.
 *
 * Waiting on a single `load` event is a race we already lost once: the map
 * painted correctly underneath an opaque loading overlay that never cleared,
 * because the one event we listened for was missed. Readiness is now derived
 * from `isStyleLoaded()` — actual map state — and polled, so no missed event
 * can trap a working canvas behind the overlay again.
 */
const READY_POLL_MS = 300;

/** Grace given to an early error before we conclude the map is unusable. */
const ERROR_GRACE_MS = 1_500;

export default function ListingMap({
  coords,
  label,
  onError,
  className = 'h-[300px] sm:h-[400px]',
}: {
  coords: Coords;
  /** Ad title — the marker's accessible name / popup-free tooltip. */
  label?: string;
  /** Called once when the map cannot be shown, so the caller can fall back. */
  onError?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Latest-value ref: the map is built once per coordinate, and re-creating it
  // because a callback identity changed would flash the canvas.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const labelRef = useRef(label);
  labelRef.current = label;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    ensureWorkerUrl();
    ensureRtlPlugin();

    let disposed = false;
    let revealed = false;
    let failed = false;
    let failTimer = 0;
    let readyPoll = 0;

    /**
     * Hand the tab back to text. Only meaningful before we've revealed a map:
     * once the canvas is visible and painting, a late tile error is not a reason
     * to tear the whole thing down.
     */
    const fail = () => {
      if (failed || disposed || revealed) return;
      failed = true;
      window.clearTimeout(failTimer);
      window.clearInterval(readyPoll);
      onErrorRef.current?.();
    };

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
        center: [coords.lng, coords.lat],
        zoom: MAP_DEFAULT_ZOOM,
        locale: AR_LOCALE,
        // Scroll/one-finger gestures belong to the page, not the map.
        cooperativeGestures: true,
        // A location pin needs no rotation or pitch.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true },
      });
    } catch {
      // No WebGL, or a context that failed to initialise.
      fail();
      return;
    }

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();

    map.addControl(
      new NavigationControl({ showCompass: false, showZoom: true }),
      'top-left',
    );

    // Exact coordinate, no offset — brand orange, tip on the point.
    const marker = new Marker({ color: MAP_MARKER_COLOR, anchor: 'bottom' })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    const markerEl = marker.getElement();
    markerEl.setAttribute('aria-label', labelRef.current ?? 'موقع الإعلان');
    markerEl.setAttribute('title', labelRef.current ?? 'موقع الإعلان');

    /**
     * Clear the loading overlay once the map genuinely has a style to draw.
     *
     * Called from several events AND from a poll, because any single one of them
     * can be missed — and `mapRef.current !== map` filters out a StrictMode
     * predecessor, so a disposed instance can never flip the state that belongs
     * to the visible one.
     */
    const reveal = () => {
      if (disposed || failed || revealed) return;
      if (mapRef.current !== map) return;
      if (!map.isStyleLoaded()) return;
      revealed = true;
      window.clearTimeout(failTimer);
      window.clearInterval(readyPoll);
      // The tab can mount us before layout settles; match the canvas to its
      // container at the moment we show it.
      map.resize();
      setReady(true);
    };

    failTimer = window.setTimeout(() => {
      // Still no style after all this time — offline, provider down, or a bad
      // style URL. `fail` no-ops if we already revealed.
      fail();
    }, LOAD_TIMEOUT_MS);

    map.on('load', reveal);
    map.on('idle', reveal);
    map.on('styledata', reveal);
    map.on('sourcedata', reveal);
    // The style may already be resolved (warm HTTP cache) by the time we get here.
    reveal();
    readyPoll = window.setInterval(reveal, READY_POLL_MS);

    // Errors after the map is up are usually one missing tile, or a sprite icon
    // the style references and the provider didn't ship — the map is still
    // useful, so those are swallowed.
    //
    // Errors before it is up get a grace period rather than an immediate verdict:
    // one early tile 404 shouldn't tear down a map whose style resolves a moment
    // later. If the style really is unreachable, nothing reveals and this (or the
    // outer timeout) drops us to text.
    let graceTimer = 0;
    map.on('error', () => {
      if (revealed || failed || disposed || graceTimer) return;
      graceTimer = window.setTimeout(() => {
        graceTimer = 0;
        if (!map.isStyleLoaded()) fail();
      }, ERROR_GRACE_MS);
    });

    return () => {
      disposed = true;
      window.clearTimeout(failTimer);
      window.clearTimeout(graceTimer);
      window.clearInterval(readyPoll);
      if (mapRef.current === map) mapRef.current = null;
      // Required: StrictMode's double-mount would otherwise leak a WebGL
      // context and a second canvas into the same container.
      map.remove();
    };
  }, [coords.lat, coords.lng]);

  return (
    // dir="ltr" is scoped to the map only: maplibre positions its controls and
    // attribution with physical left/right, and inherits the page's RTL
    // otherwise. The surrounding Arabic layout is untouched.
    <div dir="ltr" className={`relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${className}`}>
      {/* Sized with an INLINE style, deliberately — do not switch this back to
          `absolute inset-0`.
          maplibre adds its own `maplibregl-map` class to whatever element it is
          given, and `maplibre-gl.css` declares `.maplibregl-map{position:relative}`
          UNLAYERED. Our Tailwind utilities live in `@layer utilities`, and
          unlayered CSS outranks any layered rule regardless of order or
          specificity — so `absolute` lost to `relative`, `inset-0` stretched
          nothing, the height collapsed to auto→0 (the canvas container inside is
          absolutely positioned), and the canvas rendered at 0×0. The map painted
          nothing while the style, worker and tiles were all perfectly healthy.
          Inline styles beat both layers, and 100% of the sized parent is what
          maplibre wants next to its own `position: relative`. */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Spinner only — no opaque fill. Even if readiness were somehow misread,
          a painting canvas stays visible underneath instead of being covered. */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
        </div>
      )}
    </div>
  );
}
