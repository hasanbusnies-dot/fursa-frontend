'use client';

/**
 * Editable location picker — the seller drops a pin for their listing.
 *
 * Interaction, and why it differs from the read-only `ListingMap`:
 *  · Tap/click anywhere places the pin; the pin is also draggable for fine
 *    tuning. Both, because tapping is fast on mobile and dragging is precise.
 *  · `cooperativeGestures: false` — forcing two fingers to pan while someone is
 *    positioning a pin is hostile. But `scrollZoom: false` so the wheel still
 *    scrolls the wizard page instead of the map eating it; zoom is by pinch or
 *    the +/− buttons.
 *  · The map opens centred on the seller's existing pin, else the governorate
 *    they picked, else Damascus — and a fallback centre NEVER creates a pin.
 *    Auto-dropping one would persist a fake coordinate that the listing page
 *    then renders as a confident exact location. A pin appears only after a tap,
 *    a drag, or the location button.
 *
 * Reached only through `next/dynamic({ ssr: false })` — see Step2AdDetails.
 */

import { useEffect, useRef, useState } from 'react';
import { Marker } from 'maplibre-gl';
import { Crosshair, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  MAP_MARKER_COLOR,
  MAP_PIN_ZOOM,
  MAP_GOVERNORATE_ZOOM,
  governorateCenter,
  pickerInitialView,
  type Coords,
} from '@/lib/map';
import { useListingMapBase, MapSurface } from './useListingMapBase';

/** Six decimals ≈ 0.11 m — far finer than anyone can tap, and stable to read. */
function formatCoord(n: number) {
  return n.toFixed(6);
}

export default function ListingMapPicker({
  value,
  onChange,
  /** The governorate the seller selected — the wizard keeps it in `city`. */
  governorate,
  /**
   * Explicit view target, taking precedence over `governorate`. Fed by the
   * location cascade so the camera narrows as the seller descends
   * (governorate → district → place) instead of only ever knowing the
   * governorate's centre. Still only a VIEW hint: it never creates a pin.
   */
  center,
  /** Zoom to use with `center`. Place-level picks want to be closer in than a
   *  governorate overview. */
  centerZoom,
  onError,
  allowClear = true,
  hint = 'حدّد موقع إعلانك على الخريطة لمساعدة المشترين على العثور عليه. هذه الخطوة اختيارية.',
  className = 'h-[340px]',
}: {
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
  governorate?: string | null;
  center?: Coords | null;
  centerZoom?: number;
  onError?: () => void;
  /**
   * Hidden on the edit surface: the backend's updateListingSchema types
   * latitude/longitude as `optional()` but not `nullable()`, so an omitted field
   * means "leave unchanged" and there is no way to erase a stored pin. Offering a
   * clear button there would look like it worked and silently keep the old
   * coordinate. Tracked in FOLLOWUPS.md.
   */
  allowClear?: boolean;
  hint?: string;
  className?: string;
}) {
  const markerRef = useRef<Marker | null>(null);
  const [locating, setLocating] = useState(false);

  // Latest-value ref so map handlers never close over a stale callback.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Captured once: where the map opens. `hasPin` is true only when the seller
  // already had a coordinate — never for a governorate/Damascus fallback.
  // An explicit `center` (from the location cascade) outranks the governorate
  // name lookup, but never outranks the seller's own existing pin.
  const initialViewRef = useRef(
    !value && center
      ? { center, zoom: centerZoom ?? MAP_GOVERNORATE_ZOOM, hasPin: false }
      : pickerInitialView(value, governorate),
  );

  const { containerRef, mapRef, ready } = useListingMapBase({
    center: initialViewRef.current.center,
    zoom: initialViewRef.current.zoom,
    mapOptions: {
      // Panning must stay single-finger for pin placement…
      cooperativeGestures: false,
      // …but the wheel belongs to the page: this step is long and scrolling
      // past a map that swallows the wheel is maddening.
      scrollZoom: false,
      dragPan: true,
      doubleClickZoom: true,
    },
    locale: { 'Marker.Title': 'موقع الإعلان المحدد' },
    onError,
    setup: (map) => {
      const handleClick = (e: { lngLat: { lat: number; lng: number } }) => {
        onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      };
      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
        markerRef.current?.remove();
        markerRef.current = null;
      };
    },
  });

  // Sync the marker to `value` — covers taps, drags, the GPS button and clearing,
  // without ever rebuilding the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const marker = new Marker({
        color: MAP_MARKER_COLOR,
        anchor: 'bottom',
        draggable: true,
      })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ lat, lng });
      });
      const el = marker.getElement();
      el.setAttribute('aria-label', 'موقع الإعلان المحدد — اسحب للتعديل');
      el.setAttribute('title', 'اسحب لتعديل الموقع');
      el.style.cursor = 'grab';
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value, mapRef, ready]);

  /**
   * Follow the governorate select.
   *
   * `pickerInitialView` only runs at mount, and sellers fill this step top-down —
   * so the map is almost always created before a governorate is chosen, opening
   * on the Damascus fallback and then never moving. This re-centres on each
   * change, but only while there is NO pin: once the seller has placed one,
   * yanking the camera away from their own work would be worse than useless.
   * Still never creates a marker — centring is not a claim about a location.
   */
  const lastGovRef = useRef(governorate);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (governorate === lastGovRef.current) return;
    lastGovRef.current = governorate;
    if (value) return;
    // An explicit `center` owns the camera when one is supplied — otherwise the
    // two effects would fight, and the coarse governorate lookup would win by
    // firing last.
    if (center) return;
    const c = governorateCenter(governorate);
    if (!c) return; // unknown or cleared — leave the view where it is
    map.flyTo({ center: [c.lng, c.lat], zoom: MAP_GOVERNORATE_ZOOM });
  }, [governorate, center, value, mapRef, ready]);

  /**
   * Follow the location cascade. Same rule as the governorate effect — only
   * while there is NO pin, and never creating one — but driven by real region
   * coordinates, so the camera narrows governorate → district → place as the
   * seller descends instead of sitting at the governorate centre the whole time.
   *
   * Compared on VALUE, not identity: the cascade rebuilds its state object on
   * every change, so an identity check would re-fly on unrelated edits.
   */
  const lastCenterRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const key = `${center.lat},${center.lng},${centerZoom ?? ''}`;
    if (key === lastCenterRef.current) return;
    lastCenterRef.current = key;
    if (value) return; // the seller's own pin outranks any derived view
    map.flyTo({ center: [center.lng, center.lat], zoom: centerZoom ?? MAP_GOVERNORATE_ZOOM });
  }, [center, centerZoom, value, mapRef, ready]);

  /**
   * GPS fix → pin. Deliberately behind a button rather than prompted on mount:
   * an unsolicited permission dialog trains sellers to hit "Block", which kills
   * the one feature that needs the permission. Desktop fixes are also often an
   * IP-level guess tens of km out, which must never silently become a saved pin.
   */
  function useMyLocation() {
    // Geolocation needs a secure context: fine on localhost and https, blocked
    // over a LAN IP (which is how the phone reaches a dev server).
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('تحديد الموقع غير مدعوم في هذا المتصفح.');
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      toast.error('تحديد الموقع يتطلب اتصالاً آمناً (HTTPS).');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChangeRef.current(next);
        mapRef.current?.flyTo({ center: [next.lng, next.lat], zoom: MAP_PIN_ZOOM });
        toast.success('تم تحديد موقعك الحالي.');
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('تم رفض الوصول إلى الموقع. يمكنك تحديد الموقع يدوياً على الخريطة.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error('تعذّر تحديد موقعك. حدّد الموقع يدوياً على الخريطة.');
        } else if (err.code === err.TIMEOUT) {
          toast.error('استغرق تحديد الموقع وقتاً طويلاً. حاول مجدداً أو حدّده يدوياً.');
        } else {
          toast.error('تعذّر تحديد موقعك.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50';

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{hint}</p>

      <MapSurface containerRef={containerRef} ready={ready} className={className}>
        {/* "No pin yet" state — only once the map is up, so it doesn't stack on
            the loading spinner. */}
        {ready && !value && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
            <span className="rounded-full bg-gray-900/75 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm">
              انقر على الخريطة لتحديد الموقع
            </span>
          </div>
        )}
      </MapSurface>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={`${btn} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
        >
          <Crosshair className={`h-3.5 w-3.5 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'جارٍ تحديد موقعك…' : 'استخدم موقعي الحالي'}
        </button>

        {value && allowClear && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            إزالة التحديد
          </button>
        )}

        {value ? (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            {/* dir=ltr: coordinates are Latin numerals and must not be reordered. */}
            <span dir="ltr" className="font-mono">
              {formatCoord(value.lat)}, {formatCoord(value.lng)}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">لم يُحدَّد موقع بعد</span>
        )}
      </div>
    </div>
  );
}
