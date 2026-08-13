'use client';

/**
 * The browse map — MANY listings, clustered. Sibling to `ListingMap`, not a
 * variant of it: that one renders ONE coordinate for the detail page (a single
 * `Marker`, a soft circle, and a camera that follows the coordinate), and every
 * one of those behaviours is wrong for a result set. They share what actually is
 * shared: `useListingMapBase` for the map lifecycle and `MapSurface` for sizing.
 *
 * ── Why clustering, and why clicking a cluster does NOT zoom ─────────────────
 * Most listings have no seller pin, so the backend places them on their region's
 * centroid. Every pinless listing in المزة therefore has the SAME coordinate —
 * live data already shows 25 listings on 14 distinct points, one of them a pile
 * of 6. Points at zero distance never separate, so the usual "click a cluster to
 * zoom in and watch it split" is a dead end here: past `clusterMaxZoom` the pile
 * doesn't spread out, it just becomes N perfectly stacked circles with the count
 * removed — strictly less information than the cluster.
 *
 * So a cluster click resolves to a LIST of what is there (`getClusterLeaves`),
 * which answers the user's real question and behaves identically whether the
 * points are coincident or merely close. `clusterMaxZoom` is set high so centroid
 * piles stay honestly grouped instead of degrading into stacks.
 *
 * Deliberately NOT jittering coordinates to force clusters apart: it would make
 * the interaction prettier by inventing precision the data does not have — the
 * same reason the detail page draws a circle instead of a pin for these listings.
 *
 * Reached only through `next/dynamic({ ssr: false })`, like `ListingMap`, so
 * maplibre-gl stays out of the browse route's first load.
 */

import { useEffect, useRef } from 'react';
import {
  LngLatBounds,
  type FilterSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
} from 'maplibre-gl';
import {
  MAP_CLUSTER_COLOR,
  MAP_COUNTRY_ZOOM,
  MAP_FIT_MAX_ZOOM,
  MAP_MARKER_COLOR,
  MAP_PRICE_PILL_BG,
  MAP_PRICE_PILL_BORDER,
  MAP_PRICE_PILL_TEXT,
  SYRIA_CENTER,
} from '@/lib/map';
import { formatListingPrice } from '@/lib/money';
import type { MapPoint } from '@/services/listings.service';
import { useListingMapBase, MapSurface } from './useListingMapBase';

const SRC           = 'listing-points';
const LAYER_CLUSTER = 'listing-clusters';
const LAYER_POINT   = 'listing-point';
const LAYER_PRICE   = 'listing-price-label';

/**
 * Kept high on purpose. The default (one below max zoom) would un-cluster the
 * centroid piles into stacked markers; at 17 a pile stays a labelled cluster
 * until the user is far enough in that anything genuinely separate has already
 * separated.
 */
const CLUSTER_MAX_ZOOM = 17;
const CLUSTER_RADIUS   = 50;

/** Glyphs shipped by the Liberty style itself — verified against its font stacks. */
const MAP_FONT = ['Noto Sans Bold'];

/**
 * ── Price labels: WHICH points get one ──────────────────────────────────────
 *
 * EVERY unclustered listing, whether its coordinate is the seller's own pin or a
 * region centroid. The single remaining clause is the load-bearing one: a cluster
 * is a pile of several ads and has no honest single price — they are not even in
 * one currency (the live set is 21 USD / 4 SYP), so summing or averaging would
 * invent a number. Piles get a count pill instead.
 *
 * Precision deliberately does NOT gate the label. A price is useful information
 * regardless of how precisely the ad is placed, and the marker beneath the pill
 * already carries the precision claim — solid dot for an exact pin, hollow for a
 * centroid. Gating the label too would say the same thing twice and withhold
 * useful information to do it.
 */
const PRICE_LABEL_FILTER: FilterSpecification = ['!', ['has', 'point_count']];

/**
 * ── Label pills, as 9-slice stretchable sprites ──────────────────────────────
 *
 * Both label kinds — a price and a cluster count — sit on a shaped background
 * that must GROW with its text («$650» vs «19,900,000 ل.س», «4 إعلان» vs
 * «125 إعلان»), and maplibre has no "text background" paint property. The
 * supported way is `icon-text-fit`: an icon image whose declared stretch zones
 * are expanded to wrap the label.
 *
 * Why stretch zones rather than just letting the icon scale: a plain scaled image
 * would smear the rounded corners horizontally, so the caps must be excluded and
 * only the flat middle band allowed to grow. Hence a rounded RECT (radius 14 of a
 * 44px height) and not a lozenge — a fully-rounded lozenge has no flat vertical
 * band to stretch, and its stretchY zone would be zero-height.
 *
 * Numbers below are RAW SPRITE PIXELS, declared to maplibre at `pixelRatio: 2`,
 * so everything renders at half these values in CSS pixels (a 22px-tall pill).
 * The stretch/content coordinates are in this same raw space — confirmed against
 * the `addImage` contract in maplibre-gl's own d.ts, where a 600px-wide image
 * takes `stretchX: [[16, 584]]`.
 *
 * ONE geometry, two paint jobs. The shape is identical on purpose — both are
 * "a label about what is here" — and the COLOUR is what separates them:
 *
 *   · price   — white ground, orange rim, dark text. Reads as a value, and stays
 *               legible over roads/parks/water where a tinted fill would not.
 *   · cluster — solid brand blue, white rim, white text. Reads as an OBJECT
 *               rather than a value: filled-and-dark against outlined-and-light
 *               is the strongest distinction available at 22px, and it keeps the
 *               orange/blue split the markers already use (orange = one ad,
 *               blue = a group of ads).
 */
const PRICE_PILL_IMAGE   = 'listing-price-pill';
const CLUSTER_PILL_IMAGE = 'listing-cluster-pill';
const PILL_W      = 120;
const PILL_H      = 44;
const PILL_R      = 14;
const PILL_STROKE = 3;

type PillSprite = {
  image: ImageData;
  stretchX: [number, number][];
  stretchY: [number, number][];
  content: [number, number, number, number];
};

function buildPill(fill: string, stroke: string): PillSprite | null {
  const canvas = document.createElement('canvas');
  canvas.width  = PILL_W;
  canvas.height = PILL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null; // headless/blocked canvas — caller degrades to bare text

  // Rounded rect by hand rather than ctx.roundRect(): the latter is still absent
  // from some in-use Safari/WebView versions, and this is four arcs.
  const i  = PILL_STROKE / 2;              // stroke straddles the path
  const x0 = i, y0 = i, x1 = PILL_W - i, y1 = PILL_H - i;
  const r  = PILL_R - i;
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - r, y0);
  ctx.arcTo(x1, y0, x1, y0 + r, r);
  ctx.lineTo(x1, y1 - r);
  ctx.arcTo(x1, y1, x1 - r, y1, r);
  ctx.lineTo(x0 + r, y1);
  ctx.arcTo(x0, y1, x0, y1 - r, r);
  ctx.lineTo(x0, y0 + r);
  ctx.arcTo(x0, y0, x0 + r, y0, r);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth   = PILL_STROKE;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  return {
    image: ctx.getImageData(0, 0, PILL_W, PILL_H),
    // Only the flat spans between the corners may grow.
    stretchX: [[PILL_R, PILL_W - PILL_R]],
    stretchY: [[PILL_R, PILL_H - PILL_R]],
    // Where the text is allowed to live. The horizontal inset is the corner
    // radius (text never rides onto a curve); the vertical inset is deliberately
    // smaller than the radius so the pill hugs the label instead of towering
    // over it — this is what sets the final pill height.
    content: [PILL_R, 8, PILL_W - PILL_R, PILL_H - 8],
  };
}

function toFeatureCollection(points: MapPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      // `id` rides in properties, not as the feature id: feature ids must be
      // numeric for supercluster, and we need the listing's UUID back on click.
      properties: {
        id: p.id,
        price: p.price,
        currency: p.currency,
        precision: p.precision,
        // Formatted HERE rather than as a maplibre expression: the style spec has
        // no thousands-separator, and routing this through the same helper the
        // cards use is what guarantees «$65,000» on the map is «$65,000» on the
        // card. Computed for every point, not just the labelled ones, so widening
        // PRICE_LABEL_FILTER stays a one-line change.
        priceLabel: formatListingPrice(p.price, p.currency),
      },
    })),
  };
}

export default function ListingsMap({
  points,
  onSelectListing,
  onSelectCluster,
  onError,
  className = 'h-[420px] sm:h-[560px]',
}: {
  points: MapPoint[];
  /** A single listing was clicked. Omitted ⇒ the debug popup below (S4 replaces it). */
  onSelectListing?: (id: string) => void;
  /** A cluster was clicked, resolved to the listing ids underneath it. */
  onSelectCluster?: (ids: string[]) => void;
  onError?: () => void;
  className?: string;
}) {
  // Latest points without re-running the layer setup — layers are added once, and
  // new data arrives through `setData` instead of a teardown/rebuild.
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const onSelectListingRef = useRef(onSelectListing);
  onSelectListingRef.current = onSelectListing;
  const onSelectClusterRef = useRef(onSelectCluster);
  onSelectClusterRef.current = onSelectCluster;

  const { containerRef, mapRef, ready } = useListingMapBase({
    center: SYRIA_CENTER,
    zoom: MAP_COUNTRY_ZOOM,
    // Unlike the detail map this one IS the content, so it keeps the wheel: it
    // fills its own surface and there is nothing behind it to scroll past.
    mapOptions: { cooperativeGestures: false },
    locale: { 'Map.Title': 'خريطة الإعلانات' },
    onError,
  });

  // ── Source + layers + handlers: added once, after the style resolves ────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getSource(SRC)) return; // idempotent — a re-run must not stack layers

    map.addSource(SRC, {
      type: 'geojson',
      data: toFeatureCollection(pointsRef.current),
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });

    // Both sprites must exist before any layer references them. If the canvas is
    // unavailable the layers are still added: maplibre draws the labels without
    // an icon, which is why both carry a text halo — bare-but-readable beats
    // nothing.
    for (const [id, fill, stroke] of [
      [PRICE_PILL_IMAGE,   MAP_PRICE_PILL_BG, MAP_PRICE_PILL_BORDER],
      [CLUSTER_PILL_IMAGE, MAP_CLUSTER_COLOR, '#ffffff'],
    ] as const) {
      if (map.hasImage(id)) continue;
      const pill = buildPill(fill, stroke);
      if (pill) {
        map.addImage(id, pill.image, {
          pixelRatio: 2,
          stretchX: pill.stretchX,
          stretchY: pill.stretchY,
          content:  pill.content,
        });
      }
    }

    // ── Clusters: a pill, FIRST ────────────────────────────────────────────────
    // Added before the price layer on purpose. maplibre places symbols layer by
    // layer in style order, and an earlier symbol blocks a later one — so being
    // first is precisely what makes a cluster outrank a price when the two
    // collide. A pile of ads matters more than any one ad's number.
    //
    // This REPLACES the old count-in-a-circle. The circle could not hold the word
    // «إعلان» (a 32px disc against ~50px of text), and stacking a pill on top of a
    // circle would have drawn the same object twice. The magnitude cue the circle
    // carried in its radius moves into the text size below.
    map.addLayer({
      id: LAYER_CLUSTER,
      type: 'symbol',
      source: SRC,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': CLUSTER_PILL_IMAGE,
        'icon-text-fit': 'both',
        'icon-text-fit-padding': [2, 7, 2, 7],
        // `point_count_abbreviated` keeps 1.2k-style shortening at big counts.
        // Forced through `to-string`: `concat` only accepts strings, and this
        // property is a string by convention rather than by contract — a number
        // slipping through would fail the whole layer, not just the label.
        'text-field': ['concat', ['to-string', ['get', 'point_count_abbreviated']], ' إعلان'],
        'text-font': MAP_FONT,
        // What the circle's stepped radius used to say: a pile reads as a pile
        // before the number is legible. Steps, not a ramp — three sizes are
        // tellable apart at a glance, a smooth interpolation is not.
        'text-size': ['step', ['get', 'point_count'], 12, 10, 13, 50, 14],
        // The cluster pill is the marker itself, so it sits ON the coordinate.
        'text-anchor': 'center',
        // Kept ALWAYS-VISIBLE, unlike the price pills. A dropped price label
        // costs one number the user can still get by clicking; a dropped cluster
        // would silently hide every listing underneath it. `ignore-placement`
        // stays false, so the pill still blocks price labels — it wins collisions
        // without ever losing one.
        'icon-allow-overlap': true,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        // Blue halo, so white text is still readable against a light basemap if
        // the sprite is ever missing.
        'text-halo-color': MAP_CLUSTER_COLOR,
        'text-halo-width': 1.2,
      },
    });

    map.addLayer({
      id: LAYER_POINT,
      type: 'circle',
      source: SRC,
      filter: ['!', ['has', 'point_count']],
      paint: {
        // The precision distinction, kept quiet: an exact seller pin is a SOLID
        // orange dot; a centroid-placed listing is hollow — the same colour, but
        // open in the middle, so "we know roughly where this is" is visible
        // without a legend and without shouting. Same shape, same size, so
        // approximate listings are not visually demoted.
        'circle-color': [
          'case',
          ['==', ['get', 'precision'], 'exact'], MAP_MARKER_COLOR,
          '#ffffff',
        ],
        'circle-stroke-color': MAP_MARKER_COLOR,
        'circle-stroke-width': 2,
        'circle-radius': 7,
      },
    });

    map.addLayer({
      id: LAYER_PRICE,
      type: 'symbol',
      source: SRC,
      filter: PRICE_LABEL_FILTER,
      layout: {
        'icon-image': PRICE_PILL_IMAGE,
        // 'both' — the pill wraps the label on each axis. With icon-text-fit the
        // icon is bound to the text's box, so the TEXT anchor/offset below place
        // the pair; icon-anchor/icon-offset are left alone on purpose.
        'icon-text-fit': 'both',
        'icon-text-fit-padding': [2, 6, 2, 6],
        'text-field': ['get', 'priceLabel'],
        'text-font': MAP_FONT,
        'text-size': 12,
        // Sit the pill ABOVE its dot: 'bottom' puts the label's underside on the
        // coordinate, and the offset lifts it clear of the 7px circle + 2px
        // stroke rather than covering the precision cue it belongs to.
        'text-anchor': 'bottom',
        'text-offset': [0, -1.1],
        // Placement is deliberately left at maplibre's DEFAULTS
        // (icon/text-allow-overlap: false, icon/text-ignore-placement: false).
        // That default IS the anti-mush behaviour: labels that would collide are
        // dropped whole rather than drawn on top of each other, and they come
        // back as soon as zooming separates their points. Setting allow-overlap
        // true here — as the cluster pills above deliberately do, because losing
        // one would hide every ad beneath it — would turn a dense city into
        // exactly the pile of overlapping text we don't want.
      },
      paint: {
        'text-color': MAP_PRICE_PILL_TEXT,
        // Survives a missing sprite, and keeps the label legible where the pill's
        // white ground meets a light basemap.
        'text-halo-color': MAP_PRICE_PILL_BG,
        'text-halo-width': 1.2,
      },
    });

    // ── Interactions ─────────────────────────────────────────────────────────
    // Both handlers are pure REPORTERS: they resolve what was clicked and hand it
    // up. The map does not open sheets and does not navigate — S4's sheet and the
    // route push both live with the page that owns them, so this component stays
    // usable from anywhere. With no callback wired a click is simply inert; the
    // debug popups that used to stand in here are gone now that there is real UI.
    const onClusterClick = async (e: { features?: MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const clusterId = f.properties?.cluster_id as number | undefined;
      const count = (f.properties?.point_count as number | undefined) ?? 0;
      if (clusterId == null) return;

      const source = map.getSource(SRC) as GeoJSONSource | undefined;
      if (!source) return;
      let leaves: GeoJSON.Feature[] = [];
      try {
        // `count` as the limit, not a fixed page — a cluster's leaves ARE the
        // answer, and truncating them would silently hide listings.
        leaves = await source.getClusterLeaves(clusterId, count, 0);
      } catch {
        return; // map torn down mid-request
      }
      const ids = leaves
        .map((l) => l.properties?.id)
        .filter((id): id is string => typeof id === 'string');

      onSelectClusterRef.current?.(ids);
    };

    const onPointClick = (e: { features?: MapGeoJSONFeature[] }) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id !== 'string') return;
      onSelectListingRef.current?.(id);
    };

    const enter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', LAYER_CLUSTER, onClusterClick);
    map.on('click', LAYER_POINT, onPointClick);
    // The pill sits ABOVE its dot, so it is what the cursor actually lands on —
    // it has to answer to the same click as the marker it labels, or the most
    // obvious target on the map would be inert.
    map.on('click', LAYER_PRICE, onPointClick);
    map.on('mouseenter', LAYER_CLUSTER, enter);
    map.on('mouseleave', LAYER_CLUSTER, leave);
    map.on('mouseenter', LAYER_POINT, enter);
    map.on('mouseleave', LAYER_POINT, leave);
    map.on('mouseenter', LAYER_PRICE, enter);
    map.on('mouseleave', LAYER_PRICE, leave);

    return () => {
      map.off('click', LAYER_CLUSTER, onClusterClick);
      map.off('click', LAYER_POINT, onPointClick);
      map.off('click', LAYER_PRICE, onPointClick);
      map.off('mouseenter', LAYER_CLUSTER, enter);
      map.off('mouseleave', LAYER_CLUSTER, leave);
      map.off('mouseenter', LAYER_POINT, enter);
      map.off('mouseleave', LAYER_POINT, leave);
      map.off('mouseenter', LAYER_PRICE, enter);
      map.off('mouseleave', LAYER_PRICE, leave);
      // The base hook may already have removed the map — same guard idiom as
      // ListingMap's circle layers.
      if (!map.getSource(SRC)) return;
      // The sprite deliberately outlives the layers: re-adding it on every remount
      // would re-decode the same bitmap, and `hasImage` above already guards it.
      for (const id of [LAYER_CLUSTER, LAYER_POINT, LAYER_PRICE]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      map.removeSource(SRC);
    };
  }, [ready, mapRef]);

  // ── Data updates + fit ──────────────────────────────────────────────────────
  // A new filter result replaces the source's data rather than the layers, then
  // reframes. Separate from the effect above so a refetch never rebuilds layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SRC) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData(toFeatureCollection(points));
    if (points.length === 0) return;

    const bounds = new LngLatBounds();
    for (const p of points) bounds.extend([p.lng, p.lat]);
    // maxZoom matters: a result set can be a single point, or several listings on
    // one centroid, and zero-width bounds would otherwise fit to maximum zoom.
    map.fitBounds(bounds, { padding: 48, maxZoom: MAP_FIT_MAX_ZOOM, duration: 0 });
  }, [points, ready, mapRef]);

  return (
    <MapSurface containerRef={containerRef} ready={ready} className={className}>
      {ready && points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <span className="rounded-full bg-gray-900/75 px-4 py-2 text-xs font-medium text-white shadow-sm">
            لا توجد إعلانات بموقع محدد ضمن هذا البحث
          </span>
        </div>
      )}
    </MapSurface>
  );
}
