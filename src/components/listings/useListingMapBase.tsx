'use client';

/**
 * Shared MapLibre setup + lifecycle for every map in the app.
 *
 * `ListingMap` (read-only) and `ListingMapPicker` (editable) differ only in what
 * they do with the map once it exists. Everything that was hard to get right is
 * the same for both, and lives here so it has exactly one fix site:
 *
 *  · the vendored worker URL (Turbopack's `file://` rewrite of `import.meta.url`
 *    otherwise leaves maplibre with an empty worker URL — see MAP_WORKER_URL),
 *  · the lazy RTL text plugin (Arabic labels are load-bearing on Liberty),
 *  · readiness derived from `isStyleLoaded()` and POLLED, never from catching a
 *    single `load` event,
 *  · a grace period before an early error is treated as fatal,
 *  · StrictMode-safe disposal, with an instance guard so a disposed map can't
 *    write the visible one's state,
 *  · the inline-sized container (`MapSurface`), because maplibre's own unlayered
 *    CSS outranks Tailwind's layered utilities — AGENTS.md §8.11.
 *
 * This module imports maplibre-gl, so it must only ever be reached through a
 * `next/dynamic({ ssr: false })` boundary. Both components do that, and because
 * they share this file the library stays ONE lazy chunk instead of two copies.
 * `lib/map.ts` deliberately stays maplibre-free so page code can import helpers.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MapLibreMap,
  NavigationControl,
  setRTLTextPlugin,
  getRTLTextPluginStatus,
  setWorkerUrl,
  getWorkerUrl,
  type MapOptions,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL, MAP_RTL_PLUGIN_URL, MAP_WORKER_URL, type Coords } from '@/lib/map';

/** Arabic UI strings for the controls maplibre renders itself. */
export const AR_LOCALE: Record<string, string> = {
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
 * first Map is constructed. `lazy: true` defers the download until a style needs
 * Arabic/Hebrew shaping. Status is checked because StrictMode mounts twice and a
 * second call throws.
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
 * HTML as a module script — the map never initialises.
 */
function ensureWorkerUrl() {
  if (!getWorkerUrl()) setWorkerUrl(MAP_WORKER_URL);
}

/** If the style still hasn't loaded by now, treat the map as unavailable. */
const LOAD_TIMEOUT_MS = 12_000;
/** Backstop cadence for readiness — no missed event can trap a working canvas. */
const READY_POLL_MS = 300;
/** Grace given to an early error before we conclude the map is unusable. */
const ERROR_GRACE_MS = 1_500;

/** Options each caller may set; the rest of the map config is fixed here. */
type BaseOptions = {
  /** Where the map opens. Initial value only — later moves are imperative. */
  center: Coords;
  zoom: number;
  /** Per-surface interaction differences (cooperative gestures, scrollZoom, …). */
  mapOptions?: Partial<Omit<MapOptions, 'container' | 'style' | 'center' | 'zoom' | 'locale'>>;
  /** Extra/overriding Arabic strings, e.g. a different marker title. */
  locale?: Record<string, string>;
  /**
   * Runs once, synchronously, right after the map is constructed — add markers
   * and event handlers here. Its returned cleanup runs before `map.remove()`.
   */
  setup?: (map: MapLibreMap) => void | (() => void);
  /** Called once when the map cannot be shown, so the caller can fall back. */
  onError?: () => void;
};

/**
 * Creates the map ONCE per mount. `center`/`zoom` are initial values captured at
 * mount: re-creating the map when they change would destroy the canvas mid-edit
 * (fatal for the picker, where every pin move changes the coordinate). Callers
 * move the camera imperatively through `mapRef`.
 */
export function useListingMapBase({
  center,
  zoom,
  mapOptions,
  locale,
  setup,
  onError,
}: BaseOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Latest-value refs: none of these should re-create the map.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const initialRef = useRef({ center, zoom, mapOptions, locale });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    ensureWorkerUrl();
    ensureRtlPlugin();

    const init = initialRef.current;
    let disposed = false;
    let revealed = false;
    let failed = false;
    let failTimer = 0;
    let readyPoll = 0;
    let graceTimer = 0;

    /**
     * Tell the caller the map is unusable. Only meaningful before we've revealed
     * one: once the canvas is visible and painting, a late tile error is not a
     * reason to tear everything down.
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
        center: [init.center.lng, init.center.lat],
        zoom: init.zoom,
        locale: { ...AR_LOCALE, ...init.locale },
        // A location map needs no rotation or pitch, on any surface.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true },
        ...init.mapOptions,
      });
    } catch {
      // No WebGL, or a context that failed to initialise.
      fail();
      return;
    }

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false, showZoom: true }), 'top-left');

    const teardownSetup = setupRef.current?.(map);

    /**
     * Clear the loading overlay once the map genuinely has a style to draw.
     * Driven by several events AND a poll, because any single one can be missed.
     * `mapRef.current !== map` filters out a StrictMode predecessor, so a
     * disposed instance can never flip the visible one's state.
     */
    const reveal = () => {
      if (disposed || failed || revealed) return;
      if (mapRef.current !== map) return;
      if (!map.isStyleLoaded()) return;
      revealed = true;
      window.clearTimeout(failTimer);
      window.clearInterval(readyPoll);
      // We may have been mounted before layout settled (a tab, a wizard step).
      map.resize();
      setReady(true);
    };

    failTimer = window.setTimeout(fail, LOAD_TIMEOUT_MS);

    map.on('load', reveal);
    map.on('idle', reveal);
    map.on('styledata', reveal);
    map.on('sourcedata', reveal);
    // The style may already be resolved (warm HTTP cache) by the time we get here.
    reveal();
    readyPoll = window.setInterval(reveal, READY_POLL_MS);

    // Errors after the map is up are usually one missing tile, or a sprite icon
    // the style references and the provider didn't ship — swallowed. Before it is
    // up, a grace check rather than an immediate verdict: one early tile 404
    // shouldn't kill a map whose style resolves a moment later.
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
      teardownSetup?.();
      if (mapRef.current === map) mapRef.current = null;
      // Required: StrictMode's double-mount would otherwise leak a WebGL context
      // and a second canvas into the same container.
      map.remove();
    };
  }, []);

  return { containerRef, mapRef, ready };
}

/**
 * The map's visual shell, shared so the sizing rule lives in one place.
 *
 * The inner element is sized with an INLINE style, deliberately — do not switch
 * it to `absolute inset-0`. maplibre stamps its own `maplibregl-map` class on
 * whatever element it is given, and `maplibre-gl.css` declares
 * `.maplibregl-map{position:relative}` UNLAYERED. Tailwind utilities live in
 * `@layer utilities`, and unlayered CSS outranks any layered rule regardless of
 * order or specificity — so `absolute` lost to `relative`, `inset-0` stretched
 * nothing, the height collapsed to auto→0 (the canvas container inside is
 * absolutely positioned), and the canvas rendered at 0×0 while the style, worker
 * and tiles were all healthy. Inline styles beat both layers. AGENTS.md §8.11.
 */
export function MapSurface({
  containerRef,
  ready,
  className = 'h-[300px] sm:h-[400px]',
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  className?: string;
  /** Overlay content (empty-state badges, hints) drawn above the canvas. */
  children?: ReactNode;
}) {
  return (
    // dir="ltr" is scoped to the map only: maplibre positions its controls and
    // attribution with physical left/right. The surrounding Arabic layout is
    // untouched.
    <div
      dir="ltr"
      className={`relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${className}`}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Spinner only — no opaque fill, so a painting canvas can never end up
          hidden behind the loading state even if readiness were misread. */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
        </div>
      )}
      {children}
    </div>
  );
}
