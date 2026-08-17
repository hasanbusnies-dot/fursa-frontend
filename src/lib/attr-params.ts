/**
 * The ONE place catalog attribute filters become wire params — and read back again.
 *
 * `FilterValues.attributes` is what `CatalogFilterView` collects from a category's
 * inherited filter defs (rooms, area, furnished, «الناشر» …). Until now nothing
 * serialised it: the sidebar wrote the values, the chips showed them as active, and
 * the request never carried them. Every catalog-driven filter on every non-vehicle
 * root was decorative. This module is the missing half.
 *
 * Backend contract (frozen 2026-08-17, commit 24c9d30 — see
 * ../forsa-backend/docs/ATTRIBUTE_FILTERING_PLAN.md):
 *
 *   SELECT / MULTISELECT   attr_{key}={value}        REPEATED for any-of (OR)
 *   RANGE                  attr_{key}_min|_max={n}
 *   BOOLEAN                attr_{key}=true
 *
 * THREE RULES THAT ARE EASY TO GET WRONG:
 *
 * 1. REPEATED PARAMS, NEVER COMMA-JOINED. This is the exact opposite of the fixed
 *    enum params next door (`fuelType=GASOLINE,DIESEL`), and the difference is not
 *    stylistic: fixed params carry a closed ASCII enum where a comma cannot occur,
 *    while attribute values are opaque catalog strings served by the API («سطحة / سحب»,
 *    «2+1», «دفع رباعي (4x4)»). Comma-joining one that contains a comma would corrupt
 *    it into two values that match nothing. Hence `append`, never `set`.
 * 2. VALUES ARE PASSED THROUGH BYTE-FOR-BYTE. Whatever `GET /catalog/.../filters`
 *    served as `option.value` is exactly what the listing stored and exactly what the
 *    backend compares against. Never invent a machine value (REAL_ESTATE_OFFICE-style)
 *    and never normalise Arabic — both sides come from the same filter_options row, so
 *    they are byte-identical, and "helpful" transformation is what breaks that.
 * 3. attr_* REQUIRES A CATEGORY. Without one the backend has no whitelist to validate
 *    against and reports every key as `no_category`. Callers must not send them
 *    unscoped — `buildListingQuery` enforces this.
 */

/** A single wire param. Kept as a tuple because ORDER and REPETITION both matter. */
export type AttrParam = [name: string, value: string];

/**
 * Catalog keys that must never ride `attr_*`, mirroring the backend's own hard-drop
 * list. Sending them is harmless (they come back in `ignoredFilters`) but pointless,
 * and the reasons differ:
 *
 *   price     — a column, not an attribute. Rides minPrice/maxPrice.
 *   location  — four columns + a region FK. Rides city/district.
 *   hasVideo  — no data source anywhere yet; nothing records it.
 *
 * `adDate` is deliberately NOT here. It looks virtual but the backend honours it,
 * mapping the catalog's own option strings («آخر أسبوع») onto `created_at`. It
 * serialises as an ordinary SELECT and needs no special case on this side.
 */
export const NON_ATTR_KEYS = new Set(['price', 'location', 'hasVideo']);

const isRangeDraft = (v: unknown): v is { min?: string; max?: string } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `FilterValues.attributes` → wire params, in the shapes above.
 *
 * Empty values are dropped rather than sent as blanks, so an untouched filter never
 * reaches the query string. BOOLEAN emits only `true`: a browse checkbox has two
 * states, not three, so "unchecked" means "don't care" — not "must be false". (The
 * backend does support `=false` as a real filter; nothing in this UI can express it,
 * so nothing here emits it. See CatalogFilterView, which prunes on uncheck to keep
 * the draft and the wire in agreement.)
 */
export function attributesToParams(attributes: Record<string, unknown> | undefined): AttrParam[] {
  if (!attributes) return [];
  const out: AttrParam[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    if (!key || NON_ATTR_KEYS.has(key)) continue;

    if (typeof value === 'boolean') {
      if (value) out.push([`attr_${key}`, 'true']);
      continue;
    }

    if (Array.isArray(value)) {
      // MULTISELECT — one param per value; the backend ORs them.
      for (const v of value) {
        const s = String(v ?? '').trim();
        if (s) out.push([`attr_${key}`, s]);
      }
      continue;
    }

    if (isRangeDraft(value)) {
      const min = String(value.min ?? '').trim();
      const max = String(value.max ?? '').trim();
      if (min) out.push([`attr_${key}_min`, min]);
      if (max) out.push([`attr_${key}_max`, max]);
      continue;
    }

    const s = String(value ?? '').trim();
    if (s) out.push([`attr_${key}`, s]);
  }

  return out;
}

/** Appends the params onto a URLSearchParams. `append`, not `set` — repetition IS the OR. */
export function appendAttrParams(qs: URLSearchParams, attributes: Record<string, unknown> | undefined): void {
  for (const [name, value] of attributesToParams(attributes)) qs.append(name, value);
}

/**
 * Wire params → `FilterValues.attributes`, so a shared/bookmarked filtered URL
 * rehydrates the sidebar it was created from.
 *
 * Shape recovery is unavoidably lossy on its own — `attr_rooms=3+1` could be a SELECT
 * string or a one-element MULTISELECT array — so the rule is: `_min`/`_max` rebuild a
 * range draft, a REPEATED key rebuilds an array, `true`/`false` rebuild a boolean, and
 * a single value stays a string. `CatalogFilterView` then re-renders it against the
 * category's real defs, which is where the authoritative widget lives; a value whose
 * widget disagrees is simply not shown as selected, matching the backend dropping it.
 */
export function attributesFromSearchParams(
  p: { forEach: (cb: (value: string, key: string) => void) => void },
): Record<string, unknown> {
  const multi = new Map<string, string[]>();
  const ranges = new Map<string, { min?: string; max?: string }>();

  p.forEach((value, name) => {
    if (!name.startsWith('attr_') || !value) return;
    const rest = name.slice(5);
    if (!rest) return;

    if (rest.endsWith('_min') || rest.endsWith('_max')) {
      const key = rest.slice(0, -4);
      const bound = rest.endsWith('_min') ? 'min' : 'max';
      if (!key) return;
      ranges.set(key, { ...(ranges.get(key) ?? {}), [bound]: value });
      return;
    }

    multi.set(rest, [...(multi.get(rest) ?? []), value]);
  });

  const out: Record<string, unknown> = {};
  for (const [key, { min, max }] of ranges) out[key] = { ...(min ? { min } : {}), ...(max ? { max } : {}) };
  for (const [key, values] of multi) {
    if (values.length > 1) { out[key] = values; continue; }
    // A lone `true` is a BOOLEAN checkbox. `false` is not read back: nothing in this
    // UI emits it (see above), so a `false` in a URL is a hand-edit, and rehydrating
    // it would show an unchecked box while silently filtering.
    out[key] = values[0] === 'true' ? true : values[0];
  }
  return out;
}
