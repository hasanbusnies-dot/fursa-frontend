'use client';

/**
 * Governorate → [district] → place cascade, with ADAPTIVE depth.
 *
 * The catalog tree is deliberately non-uniform, so the number of steps a seller
 * sees depends on the governorate they picked:
 *
 *   دمشق  — one district holding all 11 places  → 2 steps. The district select
 *           would be a dead single-option control, so it is skipped and its
 *           places are flattened in invisibly.
 *   حلب   — 8 districts, 2,092 places           → 3 steps. Here the district IS
 *           the thing that makes the list navigable.
 *
 * `locationsService.getGovernorateShape` makes that call off `hasChildren`,
 * which already rides on the `?parent=` payload — so it costs no extra request.
 *
 * WHAT IT EMITS (`onChange`): the deepest region the seller settled on, as the
 * `regionSlug` the backend's `resolveLocation` expects — a PLACE slug normally,
 * or the GOVERNORATE slug when they picked «أخرى» and typed a name themselves
 * (Model B). The backend derives city/governorate/neighborhood from that slug and
 * overwrites whatever text we send, so this component never has to keep the
 * denormalized columns in sync.
 *
 * It also emits `center` — the coordinate the map should fly to. That narrows as
 * the seller descends (governorate → district → place); it is a VIEW hint only
 * and never becomes a pin. See `ListingMapPicker`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  locationsService,
  placeGroup,
  placeSearchMode,
  placeTypeLabel,
  PLACE_GROUP_LABELS,
  type Region,
  type GovernorateShape,
} from '@/services/locations.service';
import { SearchableCombobox, type ComboboxGroup, type ComboboxOption } from '@/components/ui/SearchableCombobox';
import type { Coords } from '@/lib/map';

/** Sentinel for the pinned «أخرى» row. Not a slug — no region can collide with it
 *  because catalog slugs are English kebab-case. */
export const OTHER_VALUE = '__other__';

export interface LocationValue {
  /** Deepest region picked — PLACE slug, or the GOVERNORATE slug for «أخرى». */
  regionSlug: string | null;
  /** Free text, only when «أخرى» is active. Rides in `neighborhood` on submit. */
  freeText: string;
  /** True while «أخرى» is the active choice — lets the parent show the input. */
  isOther: boolean;
  /** Governorate slug, kept so the edit path and the map can resolve upward. */
  governorateSlug: string | null;
  /** Arabic governorate name — the wizard's `city` column still wants it. */
  governorateName: string | null;
  /** Where the map should look. Narrows as the seller descends. */
  center: Coords | null;
}

export const EMPTY_LOCATION: LocationValue = {
  regionSlug: null,
  freeText: '',
  isOther: false,
  governorateSlug: null,
  governorateName: null,
  center: null,
};

const PLACE_GROUPS: ComboboxGroup[] = [
  { key: 'urban', label: PLACE_GROUP_LABELS.urban },
  { key: 'rural', label: PLACE_GROUP_LABELS.rural },
];

function coordsOf(r: Pick<Region, 'lat' | 'lng'> | null | undefined): Coords | null {
  if (!r || r.lat == null || r.lng == null) return null;
  return { lat: r.lat, lng: r.lng };
}

function toOption(r: Region): ComboboxOption {
  return {
    value: r.slug,
    label: r.nameAr,
    hint: placeTypeLabel(r.placeType),
    group: placeGroup(r),
  };
}

const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

function FieldShell({
  label, required, error, hint, children,
}: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function LocationCascade({
  value,
  onChange,
  governorateError,
  disabled,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  governorateError?: string;
  disabled?: boolean;
}) {
  const [governorates, setGovernorates] = useState<Region[]>([]);
  const [shape, setShape] = useState<GovernorateShape | null>(null);
  const [districtSlug, setDistrictSlug] = useState<string | null>(null);
  const [districtPlaces, setDistrictPlaces] = useState<Region[]>([]);
  const [loadingShape, setLoadingShape] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // Server-side search results, scoped to the governorate. The cascade alone
  // can't reach a place whose district the seller doesn't know, and al-Hasakah's
  // largest district holds 487 rows — so typing queries the whole governorate.
  const [searchHits, setSearchHits] = useState<Region[] | null>(null);
  const [searching, setSearching] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Governorates (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    locationsService.getGovernorates().then((rows) => {
      if (alive) setGovernorates(rows);
    });
    return () => { alive = false; };
  }, []);

  // ── Governorate → shape ─────────────────────────────────────────────────────
  // Keyed on the slug so a re-render can't refetch, and guarded by `alive` so a
  // fast second pick can't have its result overwritten by the slower first.
  const govSlug = value.governorateSlug;

  useEffect(() => {
    if (!govSlug) {
      setShape(null);
      setDistrictSlug(null);
      setDistrictPlaces([]);
      return;
    }
    let alive = true;
    setLoadingShape(true);
    locationsService
      .getGovernorateShape(govSlug)
      .then((s) => { if (alive) setShape(s); })
      .finally(() => { if (alive) setLoadingShape(false); });
    return () => { alive = false; };
  }, [govSlug]);

  // ── District → places ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!districtSlug) {
      setDistrictPlaces([]);
      return;
    }
    let alive = true;
    setLoadingPlaces(true);
    locationsService
      .getChildren(districtSlug)
      .then((rows) => { if (alive) setDistrictPlaces(rows.filter((r) => r.level === 'PLACE')); })
      .finally(() => { if (alive) setLoadingPlaces(false); });
    return () => { alive = false; };
  }, [districtSlug]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const pickGovernorate = (slug: string | null) => {
    const gov = governorates.find((g) => g.slug === slug) ?? null;
    setDistrictSlug(null);
    setDistrictPlaces([]);
    setSearchHits(null);
    // Changing governorate invalidates the place: keeping it would leave a
    // listing whose region belongs to a different governorate than the one shown.
    onChangeRef.current({
      ...EMPTY_LOCATION,
      governorateSlug: gov?.slug ?? null,
      governorateName: gov?.nameAr ?? null,
      center: coordsOf(gov),
    });
  };

  const pickDistrict = (slug: string | null) => {
    setDistrictSlug(slug);
    setSearchHits(null);
    const d = shape?.districts.find((x) => x.slug === slug) ?? null;
    // Descending a level clears the place but keeps the governorate, and moves
    // the camera to the district so the next list opens somewhere relevant.
    onChangeRef.current({
      ...value,
      regionSlug: null,
      isOther: false,
      freeText: '',
      center: coordsOf(d) ?? value.center,
    });
  };

  /** The list the combobox browses, before any typing. */
  const localPlaces = useMemo(() => {
    if (shape?.mode === 'places') return shape.places;
    return [...(shape?.places ?? []), ...districtPlaces];
  }, [shape, districtPlaces]);

  /**
   * HYBRID: small lists filter in the browser (instant, no network); large ones
   * hand typing to the server, whose SQL ranking surfaces the intended row far
   * better than substring matching across 400+ names. See PLACE_FETCH_ALL_MAX.
   */
  const searchMode = placeSearchMode(localPlaces.length);

  const placePool = useMemo(
    () => searchHits ?? localPlaces,
    [searchHits, localPlaces],
  );

  const pickPlace = (slug: string | null) => {
    if (slug === OTHER_VALUE) {
      // Model B: the FK points at the GOVERNORATE so the listing stays findable
      // by governorate, and the seller's text lives in `neighborhood`.
      const gov = governorates.find((g) => g.slug === value.governorateSlug) ?? null;
      onChangeRef.current({
        ...value,
        regionSlug: value.governorateSlug,
        isOther: true,
        freeText: '',
        center: coordsOf(gov) ?? value.center,
      });
      return;
    }
    if (!slug) {
      onChangeRef.current({ ...value, regionSlug: null, isOther: false, freeText: '' });
      return;
    }
    const place = placePool.find((p) => p.slug === slug) ?? null;
    onChangeRef.current({
      ...value,
      regionSlug: slug,
      isOther: false,
      freeText: '',
      center: coordsOf(place) ?? value.center,
    });
  };

  // Debounced governorate-scoped search. A stale response must never replace a
  // newer one, so each run carries a token checked before it commits.
  const searchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending keystroke on unmount so a fired timer can't setState on a
  // component that's gone.
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const runSearch = useCallback(
    (q: string) => {
      const token = ++searchSeq.current;
      // Cancel the keystroke before this one — without it every character would
      // still fire its own request 250ms later, which is not a debounce at all.
      if (searchTimer.current) clearTimeout(searchTimer.current);

      if (q.trim().length < 2) {
        setSearchHits(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchTimer.current = setTimeout(() => {
        locationsService
          .search(q, value.governorateSlug ?? undefined)
          .then((hits) => {
            if (token !== searchSeq.current) return;
            // DISTRICT rows are not selectable (the backend rejects them —
            // `SELECTABLE` in listing.location.ts), so offering one is a dead end.
            setSearchHits(hits.filter((h) => h.level === 'PLACE'));
          })
          .finally(() => {
            if (token === searchSeq.current) setSearching(false);
          });
      }, 250);
    },
    [value.governorateSlug],
  );

  // ── Options ─────────────────────────────────────────────────────────────────

  const govOptions: ComboboxOption[] = useMemo(
    () => governorates.map((g) => ({ value: g.slug, label: g.nameAr })),
    [governorates],
  );

  const districtOptions: ComboboxOption[] = useMemo(
    () => (shape?.districts ?? []).map((d) => ({ value: d.slug, label: d.nameAr })),
    [shape],
  );

  const placeOptions: ComboboxOption[] = useMemo(() => {
    const rows = placePool.map(toOption);
    // «أخرى» is ungrouped, so the combobox renders it above every group header.
    return [{ value: OTHER_VALUE, label: 'أخرى — أدخل الاسم يدوياً' }, ...rows];
  }, [placePool]);

  const showDistrictStep = shape?.mode === 'districts';
  const placeDisabled =
    disabled || !value.governorateSlug || (showDistrictStep && !districtSlug && !searchHits);

  const placeValue = value.isOther ? OTHER_VALUE : value.regionSlug;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="المحافظة" required error={governorateError}>
          <SearchableCombobox
            value={value.governorateSlug}
            onChange={pickGovernorate}
            options={govOptions}
            placeholder="اختر المحافظة"
            searchPlaceholder="ابحث عن محافظة…"
            searchable={false}
            disabled={disabled}
            invalid={!!governorateError}
          />
        </FieldShell>

        {showDistrictStep && (
          <FieldShell
            label="المنطقة"
            hint="اختر المنطقة لعرض القرى والبلدات التابعة لها."
          >
            <SearchableCombobox
              value={districtSlug}
              onChange={pickDistrict}
              options={districtOptions}
              placeholder="اختر المنطقة"
              searchPlaceholder="ابحث عن منطقة…"
              searchable={districtOptions.length > 8}
              disabled={disabled || loadingShape}
            />
          </FieldShell>
        )}

        <FieldShell
          label={showDistrictStep ? 'القرية / البلدة' : 'الحي / المنطقة'}
          hint={
            placeDisabled && !disabled
              ? showDistrictStep
                ? 'اختر المنطقة أولاً.'
                : 'اختر المحافظة أولاً.'
              : searchMode === 'server'
                ? 'القائمة كبيرة — اكتب اسم حيّك أو قريتك للبحث في كامل المحافظة.'
                : 'اكتب للبحث ضمن القائمة، أو اختر «أخرى» إن لم تجد مكانك.'
          }
        >
          <SearchableCombobox
            value={placeValue}
            onChange={pickPlace}
            options={placeOptions}
            groups={PLACE_GROUPS}
            placeholder={loadingShape || loadingPlaces ? 'جارٍ التحميل…' : 'اختر الحي أو القرية'}
            searchPlaceholder={
              searchMode === 'server' ? 'اكتب للبحث في كامل المحافظة…' : 'اكتب للبحث…'
            }
            emptyText={searching ? 'جارٍ البحث…' : 'لا توجد نتائج — جرّب «أخرى»'}
            // Only large lists reach for the network. Below the threshold the
            // fetched array is already in memory, so a request would be strictly
            // slower AND worse (the combobox's Arabic folding beats ILIKE on
            // «المزه» → «المزة»).
            onSearchChange={searchMode === 'server' ? runSearch : undefined}
            loading={searching || loadingPlaces}
            loadingText="جارٍ البحث…"
            disabled={placeDisabled}
          />
        </FieldShell>
      </div>

      {/* «أخرى» → free text. The FK still points at the governorate, so the ad
          stays findable even though the exact place isn't in the catalog. */}
      {value.isOther && (
        <FieldShell
          label="اسم الحي / القرية"
          hint="اكتب اسم منطقتك كما يعرفه الناس محلياً."
        >
          <input
            value={value.freeText}
            onChange={(e) => onChangeRef.current({ ...value, freeText: e.target.value.slice(0, 100) })}
            placeholder="مثال: حي الورود"
            maxLength={100}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </FieldShell>
      )}

      {loadingShape && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          جارٍ تحميل المناطق…
        </p>
      )}
    </div>
  );
}
