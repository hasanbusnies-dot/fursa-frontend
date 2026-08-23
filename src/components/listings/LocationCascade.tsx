'use client';

/**
 * Location cascade — governorate → منطقة → ناحية → حي/قرية, with ADAPTIVE depth.
 *
 * WHY IT IS BUILT AS A LADDER, NOT FOUR FIELDS
 * The tree is 4 levels deep but the number of rungs a seller SEES varies by
 * branch, because the backend collapses whatever would be a dead choice:
 *
 *   حلب → باب المقام            2 steps — the governorate's own «أحياء المدينة»
 *                                group reaches city neighborhoods directly.
 *   حلب → منبج → ناحية → قرية   4 steps — out here every rung is a real fork.
 *   دمشق → حي                   2 steps — دمشق has ONE district, so that rung is
 *                                auto-descended and never rendered.
 *
 * Hardcoding four fields would have to special-case each of those. Instead the
 * component holds an ARRAY of rungs and asks `locationsService.getStep` for the
 * next one: the loader applies the skip rule and the backend supplies the
 * grouping, so depth follows the data. A future 5th level, or a new group, needs
 * no change here.
 *
 * THE ONE INVARIANT: never finalize on a `selectable: false` node. A DISTRICT or
 * SUBDISTRICT is drill-through scaffolding — picking one sets `regionSlug` to
 * null and opens the next rung, which is what makes the create-listing 400 on a
 * bare ناحية structurally impossible rather than merely unlikely.
 *
 * WHAT IT EMITS (`onChange`): the deepest SELECTABLE region the seller settled
 * on, as the `regionSlug` the backend's `resolveLocation` expects — a PLACE slug
 * normally, or the GOVERNORATE slug when they picked «أخرى» and typed a name
 * themselves (Model B). The backend derives city/governorate/neighborhood from
 * that slug and overwrites whatever text we send.
 *
 * It also emits `center` + `centerLevel` — where the map should look and how
 * tightly to frame it. Many catalog rows carry NULL coordinates (باب المقام is
 * one), so the centre falls back to the nearest ancestor that has one and
 * reports THAT level, so the map never frames a ناحية centroid as a street
 * address. It is a VIEW hint only and never becomes a pin. See ListingMapPicker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  locationsService,
  isSelectable,
  hasChildren,
  placeGroup,
  placeSearchMode,
  placeTypeLabel,
  stepItems,
  PLACE_GROUP_LABELS,
  REGION_LEVEL_LABELS,
  type Region,
  type RegionLevel,
  type RegionStep,
} from '@/services/locations.service';
import { SearchableCombobox, type ComboboxGroup, type ComboboxOption } from '@/components/ui/SearchableCombobox';
import type { Coords } from '@/lib/map';

/** Sentinel for the pinned «أخرى» row. Not a slug — no region can collide with it
 *  because catalog slugs are English kebab-case. */
export const OTHER_VALUE = '__other__';

export interface LocationValue {
  /** Deepest SELECTABLE region picked — a PLACE slug, or the GOVERNORATE slug
   *  for «أخرى». Null while the seller is parked on a drill-through node. */
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
  /** Level the centre actually came from — the honest zoom hint. */
  centerLevel: RegionLevel | null;
}

export const EMPTY_LOCATION: LocationValue = {
  regionSlug: null,
  freeText: '',
  isOther: false,
  governorateSlug: null,
  governorateName: null,
  center: null,
  centerLevel: null,
};

/** Urban-before-rural, used only for a plain (backend-ungrouped) rung of places. */
const PLACE_GROUPS: ComboboxGroup[] = [
  { key: 'urban', label: PLACE_GROUP_LABELS.urban },
  { key: 'rural', label: PLACE_GROUP_LABELS.rural },
];

type Centre = { center: Coords | null; level: RegionLevel | null };

const NO_CENTRE: Centre = { center: null, level: null };

function centreOf(r: Region | null | undefined): Centre {
  if (!r || r.lat == null || r.lng == null) return NO_CENTRE;
  return { center: { lat: r.lat, lng: r.lng }, level: r.level };
}

/**
 * Centre → the two LocationValue fields, keeping them in lockstep. A centre and
 * a level that disagree would frame a ناحية centroid at street zoom, so they are
 * only ever written together — and a resolve that found nothing leaves BOTH
 * fields alone rather than blanking the map.
 */
function applyCentre(c: Centre, prev: LocationValue): Pick<LocationValue, 'center' | 'centerLevel'> {
  if (!c.center) return { center: prev.center, centerLevel: prev.centerLevel };
  return { center: c.center, centerLevel: c.level };
}

/** A rendered rung plus the state that belongs to it. */
interface Rung {
  step: RegionStep;
  selected: string | null;
  /**
   * Best centre known when this rung opened — the fallback for a pick whose own
   * coordinate is NULL. Already folds in any auto-skipped node, which is often
   * the only ancestor with a coordinate (دمشق's hidden district has one).
   */
  inherited: Centre;
}

/** Deepest auto-skipped node that carries a coordinate, if any. */
function skippedCentre(step: RegionStep, fallback: Centre): Centre {
  for (let i = step.skipped.length - 1; i >= 0; i--) {
    const c = centreOf(step.skipped[i]);
    if (c.center) return c;
  }
  return fallback;
}

/**
 * Turn a resolved ladder (prefill / search landing) into rungs, threading the
 * centre chain forward exactly as an interactive descent would.
 */
function buildRungs(
  steps: { step: RegionStep; selected: string }[],
  govCentre: Centre,
): Rung[] {
  let inherited = govCentre;
  return steps.map(({ step, selected }) => {
    const withSkips = skippedCentre(step, inherited);
    const rung: Rung = { step, selected, inherited: withSkips };
    const node = stepItems(step).find((i) => i.slug === selected) ?? null;
    const own = centreOf(node);
    inherited = own.center ? own : withSkips;
    return rung;
  });
}

/**
 * Field label for a rung. Levels are read off the rows themselves: a rung of
 * SUBDISTRICTs is «الناحية», a rung of PLACEs is «الحي / القرية». The grouped
 * governorate view mixes both (neighborhoods AND districts in one control), so
 * it gets a label that honestly covers the choice on offer.
 */
function rungLabel(step: RegionStep): string {
  const levels = new Set(stepItems(step).map((i) => i.level));
  if (levels.size === 1) {
    const [only] = [...levels];
    return REGION_LEVEL_LABELS[only];
  }
  return 'الحي أو المنطقة';
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
  const [rungs, setRungs] = useState<Rung[]>([]);
  const [loadingRung, setLoadingRung] = useState(false);

  // Governorate-scoped server search, wired only on rungs too large to scan.
  const [searchHits, setSearchHits] = useState<Region[] | null>(null);
  const [searching, setSearching] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Latest value, readable from async callbacks that would otherwise close over
  // a stale one (the centre refinement below lands after a round trip).
  const valueRef = useRef(value);
  valueRef.current = value;

  /** Guards the async centre refinement so a stale resolve can't move the map
   *  after the seller has already picked somewhere else. */
  const centreSeq = useRef(0);

  /**
   * Guards every async ladder mutation. A seller who picks حلب then دمشق before
   * the first fetch lands must not have حلب's rungs arrive on top of دمشق's.
   */
  const ladderSeq = useRef(0);

  // ── Governorates (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    locationsService.getGovernorates().then((rows) => {
      if (alive) setGovernorates(rows);
    });
    return () => { alive = false; };
  }, []);

  const govSlug = value.governorateSlug;
  const governorate = useMemo(
    () => governorates.find((g) => g.slug === govSlug) ?? null,
    [governorates, govSlug],
  );

  /** Append the rung below `parentSlug`, discarding anything deeper. */
  const openRung = useCallback(async (parentSlug: string, depth: number, inherited: Centre) => {
    const token = ++ladderSeq.current;
    setLoadingRung(true);
    const step = await locationsService.getStep(parentSlug);
    if (token !== ladderSeq.current) return;
    setLoadingRung(false);

    // An empty rung means the branch dead-ends: render nothing and let «أخرى»
    // on the rung above carry the seller.
    if (!step.total) {
      setRungs((prev) => prev.slice(0, depth));
      return;
    }
    setRungs((prev) => [
      ...prev.slice(0, depth),
      { step, selected: null, inherited: skippedCentre(step, inherited) },
    ]);
  }, []);

  // ── Prefill ─────────────────────────────────────────────────────────────────
  /**
   * Rebuild the ladder for a `regionSlug` that arrived from outside — the edit
   * page, or the wizard remounting on back-navigation. `resolveCascade` descends
   * with the same loader interactive use runs, so the rebuilt ladder is exactly
   * the one the seller would have built by hand (2 rungs for باب المقام, not the
   * 3 its raw path would suggest).
   *
   * Runs only when the ladder is empty but a region is already set. Waits for
   * the governorate list so the centre chain starts from a real coordinate
   * instead of nothing.
   */
  const needsPrefill =
    !!value.regionSlug && !value.isOther && rungs.length === 0 && governorates.length > 0;
  const prefilling = useRef(false);

  useEffect(() => {
    if (!needsPrefill || prefilling.current) return;
    const slug = value.regionSlug!;
    prefilling.current = true;
    const token = ++ladderSeq.current;
    setLoadingRung(true);

    (async () => {
      const { steps } = await locationsService.resolveCascade(slug);
      if (token !== ladderSeq.current) { prefilling.current = false; return; }
      setRungs(buildRungs(steps, centreOf(governorate)));
      setLoadingRung(false);
      prefilling.current = false;
    })();
  }, [needsPrefill, value.regionSlug, governorate]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const pickGovernorate = (slug: string | null) => {
    ladderSeq.current++; // strand any in-flight rung from the previous governorate
    centreSeq.current++; // …and any centre resolve still chasing the old branch
    const gov = governorates.find((g) => g.slug === slug) ?? null;
    setRungs([]);
    setSearchHits(null);
    setLoadingRung(false);
    // Changing governorate invalidates the place: keeping it would leave a
    // listing whose region belongs to a different governorate than the one shown.
    onChangeRef.current({
      ...EMPTY_LOCATION,
      governorateSlug: gov?.slug ?? null,
      governorateName: gov?.nameAr ?? null,
      ...applyCentre(centreOf(gov), EMPTY_LOCATION),
    });
    if (gov) void openRung(gov.slug, 0, centreOf(gov));
  };

  /** Land on a region that did NOT come from the visible ladder (a search hit). */
  const jumpTo = useCallback(async (hit: Region) => {
    const token = ++ladderSeq.current;
    centreSeq.current++;
    setSearchHits(null);
    setLoadingRung(true);

    const [{ steps }, resolved] = await Promise.all([
      locationsService.resolveCascade(hit.slug),
      locationsService.resolveCenter(hit),
    ]);
    if (token !== ladderSeq.current) return;
    setLoadingRung(false);
    setRungs(buildRungs(steps, centreOf(governorate)));

    onChangeRef.current({
      ...value,
      regionSlug: isSelectable(hit) ? hit.slug : null,
      isOther: false,
      freeText: '',
      ...applyCentre({ center: resolved?.center ?? null, level: resolved?.level ?? null }, value),
    });
  }, [governorate, value]);

  /** «أخرى» → Model B: the FK points at the GOVERNORATE so the listing stays
   *  findable by governorate, and the seller's text lives in `neighborhood`. */
  const applyOther = () => {
    centreSeq.current++;
    onChangeRef.current({
      ...value,
      regionSlug: value.governorateSlug,
      isOther: true,
      freeText: '',
      // Back out to the whole-governorate view: «أخرى» means the exact place
      // isn't in the catalog, so a narrower frame would be a claim we can't back.
      ...applyCentre(centreOf(governorate), value),
    });
  };

  const pickAt = (depth: number, slug: string | null) => {
    const rung = rungs[depth];
    if (!rung) return;

    if (slug === OTHER_VALUE) {
      ladderSeq.current++;
      setRungs((prev) => prev.slice(0, depth + 1).map((r, i) =>
        i === depth ? { ...r, selected: OTHER_VALUE } : r,
      ));
      applyOther();
      return;
    }

    if (!slug) {
      ladderSeq.current++;
      setRungs((prev) => prev.slice(0, depth + 1).map((r, i) =>
        i === depth ? { ...r, selected: null } : r,
      ));
      onChangeRef.current({ ...value, regionSlug: null, isOther: false, freeText: '' });
      return;
    }

    // A search hit can name a row outside this rung — rebuild around it instead.
    const node = stepItems(rung.step).find((i) => i.slug === slug) ?? null;
    if (!node) {
      const hit = searchHits?.find((h) => h.slug === slug);
      if (hit) void jumpTo(hit);
      return;
    }

    ladderSeq.current++;
    setSearchHits(null);
    setRungs((prev) => prev.slice(0, depth + 1).map((r, i) =>
      i === depth ? { ...r, selected: slug } : r,
    ));

    const own = centreOf(node);
    const centre = own.center ? own : rung.inherited;
    const centreToken = ++centreSeq.current;

    onChangeRef.current({
      ...value,
      // THE INVARIANT: a drill-through node is never a final answer.
      regionSlug: isSelectable(node) ? node.slug : null,
      isOther: false,
      freeText: '',
      ...applyCentre(centre, value),
    });

    /**
     * NULL-coordinate row (the catalog's Tier-3 tail — باب المقام is one). The
     * ladder's own fallback is the best coordinate we walked PAST, which for a
     * pick out of the grouped «أحياء المدينة» list is the whole governorate —
     * the group flattens the ancestry, so the seller never descended through the
     * ناحية that actually knows where this neighborhood is. Ask the tree for it.
     *
     * Fired after the synchronous emit above, so the map moves immediately to
     * the rough centre and then tightens, rather than sitting still until the
     * round trip lands.
     */
    if (!own.center) {
      void locationsService.resolveCenter(node).then((res) => {
        if (!res || centreToken !== centreSeq.current) return;
        const prev = valueRef.current;
        onChangeRef.current({
          ...prev,
          ...applyCentre({ center: res.center, level: res.level }, prev),
        });
      });
    }

    if (hasChildren(node)) void openRung(node.slug, depth + 1, centre);
  };

  // ── Governorate-scoped search ───────────────────────────────────────────────
  // A stale response must never replace a newer one, so each run carries a token
  // checked before it commits.
  const searchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            // The endpoint returns DISTRICT/SUBDISTRICT rows too; offering one
            // as a result would be a dead end the seller can't finalize.
            setSearchHits(hits.filter(isSelectable));
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

  /** The deepest rung is the only one that offers «أخرى» and server search. */
  const lastDepth = rungs.length - 1;

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

        {rungs.map((rung, depth) => {
          const isLast = depth === lastDepth;
          const showHits = isLast && !!searchHits;
          const rows = showHits ? searchHits! : stepItems(rung.step);

          // Groups come from the BACKEND for the governorate rung («أحياء
          // المدينة» then «المناطق»). A plain rung falls back to the urban/rural
          // split, and search hits — which span the whole governorate — use it
          // too since their backend grouping doesn't apply.
          const backendGroups = rung.step.groups.filter((g) => g.key && g.labelAr);
          const useBackendGroups = !showHits && backendGroups.length > 0;

          const options: ComboboxOption[] = rows.map((r) => ({
            value: r.slug,
            label: r.nameAr,
            hint: placeTypeLabel(r.placeType),
            group: useBackendGroups
              ? rung.step.groups.find((g) => g.items.some((i) => i.slug === r.slug))?.key
              : placeGroup(r),
          }));

          const groups: ComboboxGroup[] = useBackendGroups
            ? backendGroups.map((g) => ({ key: g.key, label: g.labelAr }))
            : PLACE_GROUPS;

          // «أخرى» is ungrouped, so the combobox renders it above every header.
          const withOther: ComboboxOption[] = isLast
            ? [{ value: OTHER_VALUE, label: 'أخرى — أدخل الاسم يدوياً' }, ...options]
            : options;

          const mode = placeSearchMode(rung.step.total);
          const serverSearch = isLast && mode === 'server';

          return (
            <FieldShell
              key={`${rung.step.requestedSlug}-${depth}`}
              label={rungLabel(rung.step)}
              hint={
                !isLast
                  ? undefined
                  : serverSearch
                    ? 'القائمة كبيرة — اكتب اسم حيّك أو قريتك للبحث في كامل المحافظة.'
                    : 'اكتب للبحث ضمن القائمة، أو اختر «أخرى» إن لم تجد مكانك.'
              }
            >
              <SearchableCombobox
                value={rung.selected}
                onChange={(slug) => pickAt(depth, slug)}
                options={withOther}
                groups={groups}
                placeholder={loadingRung && isLast ? 'جارٍ التحميل…' : 'اختر…'}
                searchPlaceholder={
                  serverSearch ? 'اكتب للبحث في كامل المحافظة…' : 'اكتب للبحث…'
                }
                emptyText={searching ? 'جارٍ البحث…' : 'لا توجد نتائج — جرّب «أخرى»'}
                // Only large rungs reach for the network. Below the threshold the
                // fetched rows are already in memory, so a request would be
                // strictly slower AND worse (the combobox's Arabic folding beats
                // ILIKE on «المزه» → «المزة»).
                onSearchChange={serverSearch ? runSearch : undefined}
                loading={isLast && (searching || loadingRung)}
                loadingText="جارٍ البحث…"
                disabled={disabled}
              />
            </FieldShell>
          );
        })}

        {/* A governorate whose branch yields no rung at all (a fetch that failed,
            or a province the catalog hasn't filled in). Without this the seller
            would have a governorate and no way to say anything more precise —
            «أخرى» is the escape hatch that keeps the wizard finishable. */}
        {!!govSlug && rungs.length === 0 && !loadingRung && (
          <FieldShell label="الحي / القرية" hint="لا تتوفر تفاصيل أدق لهذه المحافظة — أدخل الاسم يدوياً.">
            <SearchableCombobox
              value={value.isOther ? OTHER_VALUE : null}
              onChange={(v) => {
                if (v === OTHER_VALUE) applyOther();
                else onChangeRef.current({ ...value, regionSlug: null, isOther: false, freeText: '' });
              }}
              options={[{ value: OTHER_VALUE, label: 'أخرى — أدخل الاسم يدوياً' }]}
              placeholder="اختر…"
              searchable={false}
              disabled={disabled}
            />
          </FieldShell>
        )}
      </div>

      {/* Parked on a drill-through node: the seller has chosen a منطقة/ناحية but
          nothing that can carry the listing yet. Say so rather than letting the
          form look complete. */}
      {!!value.governorateSlug && !value.regionSlug && rungs.length > 0 && !loadingRung && (
        <p className="text-xs text-gray-400">
          تابع الاختيار حتى تصل إلى الحي أو القرية، أو اختر «أخرى» لإدخال الاسم يدوياً.
        </p>
      )}

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
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-[16px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </FieldShell>
      )}

      {loadingRung && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          جارٍ تحميل المناطق…
        </p>
      )}
    </div>
  );
}
