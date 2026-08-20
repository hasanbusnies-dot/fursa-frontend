'use client';

// ═══════════════════════════════════════════════════════════════════════════════
// Step 0 — doushesh cascading catalog picker (category → … → brand → model) + the
// category's dynamic, inherited filter fields. Replaces the old Step0CategorySelect.
//
// Hybrid UI:
//   • Top level (category)      → colorful icon-card grid (the marketplace entry).
//   • Deeper levels (sub/brand/model) → searchable picker rows with count badges.
//   • A back-navigable breadcrumb of path chips.
//   • Dynamic filter fields restyled to the wizard design system.
//
// VISUAL ONLY: the cascading logic (catalogService calls, CatalogState, selectAt,
// categoryId resolution, isVehicle branching, attributes) is unchanged — the new
// UI state (open picker, per-popover search) is local and never enters the payload.
//
// Output (lifted to CreateListingForm): { categorySlug, categoryId, isVehicle, attributes }
// + the picked chain. LOCATION widgets are NOT rendered here — location lives in the
// shared details step's flat fields.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef, useState, Fragment } from 'react';
import {
  Loader2, AlertCircle, Check, Search, ChevronDown, ChevronLeft, X,
} from 'lucide-react';
// One category identity app-wide: icon + hue come from the shared root map, so a
// category looks the same here as in the homepage nav and the group screens.
import { categoryRootMeta, categorySymbol } from '@/data/category-root-meta';
import {
  catalogService,
  VEHICLES_ROOT_SLUG,
  type CatalogNode,
  type CatalogFilterDef,
} from '@/services/catalog.service';
import { BrandMark } from '@/components/listings/BrandMark';

export interface CatalogState {
  levels: CatalogNode[][];          // levels[i] = options at depth i
  picked: CatalogNode[];            // chosen chain (root → leaf)
  filters: CatalogFilterDef[];      // leaf's inherited filter set
  attributes: Record<string, unknown>;
  categorySlug: string | null;      // chosen leaf slug
  categoryId: string | null;        // resolved UUID for POST /listings
  isVehicle: boolean;               // vehicles root + a brand was picked
  /** Brand typed by hand — only when the picked BRAND node is the «أخرى» option. */
  otherMake: string;
  /** Model typed by hand — «أخرى» model node, or a brand with no MODEL children. */
  otherModel: string;
  loading: boolean;                 // fetching children
  resolving: boolean;               // resolving filters + categoryId for a leaf
}

export const initialCatalogState: CatalogState = {
  levels: [], picked: [], filters: [], attributes: {},
  categorySlug: null, categoryId: null, isVehicle: false,
  otherMake: '', otherModel: '',
  loading: false, resolving: false,
};

// ── «أخرى» + manual entry ─────────────────────────────────────────────────────
// The catalog marks its "not listed" option node with `isOther` (a BACKEND FLAG —
// never re-derived from the Arabic name or a `-others` slug suffix). Picking it files
// the listing under the same CATEGORY node as any other brand (resolveCategoryId walks
// up past BRAND/MODEL either way) and the typed name is what reaches the API, in the
// free-text `vehicleDetails.make` / `.model`. Same shape as LocationCascade's «أخرى»:
// the FK stays on the parent, the text rides in a column.

/** VarChar(50) on VehicleDetails.make/.model — the API rejects longer. */
export const CUSTOM_NAME_MAX = 50;

export const pickedBrand = (s: CatalogState): CatalogNode | null =>
  s.picked.find((p) => p.type === 'BRAND') ?? null;

export const pickedModel = (s: CatalogState): CatalogNode | null =>
  s.picked.find((p) => p.type === 'MODEL') ?? null;

/** Seller must type the brand: the «أخرى» brand node is the pick. */
export function needsCustomMake(s: CatalogState): boolean {
  return s.isVehicle && pickedBrand(s)?.isOther === true;
}

/**
 * Seller must type the model — two cases, one input:
 *   • the «أخرى» model node was picked, or
 *   • the picked BRAND is itself the leaf (no MODEL children at all).
 * The second case is why motorcycles, trucks, buses, minivans and electric cars were
 * unpublishable: `model` is required on the vehicle path (schema.ts superRefine) and
 * those branches have no model nodes to supply it, so the wizard could never be satisfied.
 */
export function needsCustomModel(s: CatalogState): boolean {
  if (!s.isVehicle) return false;
  const brand = pickedBrand(s);
  if (!brand) return false;
  const model = pickedModel(s);
  return model ? model.isOther === true : !brand.hasChildren;
}

/**
 * The make/model that go to the API — typed values WIN over the catalog node's name
 * wherever the seller was asked to type one. `make` for the «أخرى» node would otherwise
 * literally be "أخرى", which is what every card, breadcrumb and spec table would show.
 */
export function resolvedMakeModel(s: CatalogState): { make: string; model: string } {
  if (!s.isVehicle) return { make: '', model: '' };
  return {
    make:  needsCustomMake(s)  ? s.otherMake.trim()  : (pickedBrand(s)?.name ?? ''),
    model: needsCustomModel(s) ? s.otherModel.trim() : (pickedModel(s)?.name ?? ''),
  };
}

// Browse-only filter keys that must NOT appear as add-listing attribute fields:
//   • price   → the listing's price is a SINGLE value + currency, entered in Step2AdDetails
//               (a min–max range only makes sense when FILTERING the browse view).
//   • adDate  → "listing date" is a browse-time facet, not a property of a new listing.
//   • hasVideo → derived from whether media is attached, not a manual creation field.
const BROWSE_ONLY_FILTER_KEYS = new Set(['price', 'adDate', 'hasVideo']);

// Filters shown as creation fields: skip LOCATION (collected in the details step) and
// the browse-only facets above.
function isCreationFilter(f: CatalogFilterDef): boolean {
  return f.widget !== 'LOCATION' && !BROWSE_ONLY_FILTER_KEYS.has(f.key);
}

// A leaf is selected once we have a resolved categoryId. For generic categories, every
// required creation filter must also be filled before the step is complete.
export function catalogStepIncomplete(s: CatalogState): boolean {
  if (!s.categoryId) return true;
  if (s.isVehicle) {
    // Vehicle attributes are collected in later steps — except the hand-typed brand/model,
    // which are asked for HERE and are required (the vehicle path's schema demands both).
    if (needsCustomMake(s)  && !s.otherMake.trim())  return true;
    if (needsCustomModel(s) && !s.otherModel.trim()) return true;
    return false;
  }
  return s.filters.some((f) => f.isRequired && isCreationFilter(f) && isEmpty(s.attributes[f.key]));
}

function isEmpty(v: unknown): boolean {
  if (v == null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

const inputCls = (err?: boolean) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
    err
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
  }`;

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string | null; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function levelLabel(type: CatalogNode['type'] | undefined): string {
  return type === 'BRAND' ? 'الماركة' : type === 'MODEL' ? 'الموديل' : 'التصنيف';
}

// Root-category visuals now come from `category-root-meta.ts`. The two local maps
// that used to live here are gone on purpose:
//   • CARD_SCHEMES picked a color by ARRAY INDEX (`idx % 10`), so a category's
//     color was a function of its position in the catalog response — reorder the
//     roots and every card changed color, and none of them matched the color the
//     same category wore in the homepage nav.
//   • ROOT_ICONS was a second slug→icon map that had drifted (it was missing
//     `helpers`, so that root fell back to the generic tag).

interface Props {
  state: CatalogState;
  onChange: (next: CatalogState) => void;
  error?: string;
}

export function Step0Catalog({ state, onChange, error }: Props) {
  // Which picker popover is open (UI-only; never persisted in CatalogState).
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  // Load root categories once.
  useEffect(() => {
    if (state.levels.length) return;
    let alive = true;
    onChange({ ...state, loading: true });
    catalogService.getChildren(null).then((roots) => {
      if (alive) onChange({ ...initialCatalogState, levels: [roots] });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectAt = useCallback(async (levelIdx: number, node: CatalogNode) => {
    setOpenLevel(null); // close any open picker on selection (UI-only)
    const picked = [...state.picked.slice(0, levelIdx), node];
    const levels = state.levels.slice(0, levelIdx + 1);

    // Optimistic: reflect the pick, clear everything downstream, show loading.
    onChange({
      ...initialCatalogState, levels, picked, loading: true,
    });

    if (node.hasChildren) {
      const kids = await catalogService.getChildren(node.slug);
      const nextLevels = [...levels];
      if (kids.length) nextLevels[levelIdx + 1] = kids;
      onChange({ ...initialCatalogState, levels: nextLevels, picked });
      return;
    }

    // Leaf reached → resolve the listing categoryId + load the inherited filters.
    onChange({ ...initialCatalogState, levels, picked, resolving: true });
    const [filters, categoryId] = await Promise.all([
      catalogService.getFilters(node.slug),
      catalogService.resolveCategoryId(node.slug).catch(() => null),
    ]);
    const isVehicle =
      picked[0]?.slug === VEHICLES_ROOT_SLUG && picked.some((p) => p.type === 'BRAND');
    onChange({
      ...initialCatalogState,
      levels, picked, filters,
      categorySlug: node.slug, categoryId, isVehicle,
    });
  }, [state, onChange]);

  const setAttr = (key: string, value: unknown) =>
    onChange({ ...state, attributes: { ...state.attributes, [key]: value } });

  // Re-pick from a given level: drop that level's pick + everything downstream, keep its
  // options loaded, and reopen its picker. Pure state slice — same transform selectAt does.
  const editFromLevel = useCallback((levelIdx: number) => {
    onChange({
      ...initialCatalogState,
      levels: state.levels.slice(0, levelIdx + 1),
      picked: state.picked.slice(0, levelIdx),
    });
    setOpenLevel(levelIdx >= 1 ? levelIdx : null);
  }, [state, onChange]);

  const visibleFilters = state.filters.filter(isCreationFilter);
  const loadingRoots = state.levels.length === 0 && state.loading;

  // Hand-typed brand/model — see needsCustomMake/needsCustomModel above.
  const askMake  = needsCustomMake(state);
  const askModel = needsCustomModel(state);
  // A brand with no MODEL children (motorcycles, trucks, buses…) vs. the «أخرى» model
  // node: same input, different reason, so the hint says which.
  const modelHint = pickedModel(state)?.isOther
    ? 'اكتب اسم الموديل كما تريد أن يظهر في الإعلان.'
    : 'لا توجد موديلات مسجّلة لهذه الماركة — اكتب الموديل يدوياً.';
  const customPending =
    (askMake && !state.otherMake.trim()) || (askModel && !state.otherModel.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">اختر الفئة</h2>
        <p className="text-sm text-gray-500 mt-1">
          اختر التصنيف ثم الماركة والموديل — ستظهر حقول الفئة تلقائياً.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}

      {/* ── Selection ── */}
      {loadingRoots ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[104px] bg-gray-100 rounded-xl border border-gray-200 border-t-4 border-t-gray-200" />
          ))}
        </div>
      ) : state.picked.length === 0 ? (
        // Top level: colorful icon-card grid (the signature entry moment).
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(state.levels[0] ?? []).map((node) => (
            <RootCategoryCard key={node.slug} node={node} onClick={() => selectAt(0, node)} />
          ))}
        </div>
      ) : (
        <>
          <PathChips picked={state.picked} onEdit={editFromLevel} />
          <div className="space-y-3">
            {state.levels.slice(1).map((opts, idx) => {
              const levelIdx = idx + 1;
              return (
                <LevelPicker
                  key={levelIdx}
                  label={levelLabel(opts[0]?.type)}
                  options={opts}
                  selected={state.picked[levelIdx] ?? null}
                  open={openLevel === levelIdx}
                  onToggle={() => setOpenLevel(openLevel === levelIdx ? null : levelIdx)}
                  onClose={() => setOpenLevel(null)}
                  onSelect={(n) => selectAt(levelIdx, n)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── «أخرى» / no-catalog-model → type it here ────────────────────────────
          Inline under the picker (LocationCascade's pattern) rather than a step later:
          the seller just told us the list doesn't cover their vehicle, so the place to
          say what it IS is right where they said it. */}
      {(askMake || askModel) && !state.resolving && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">
            {askMake ? 'اكتب الماركة والموديل' : 'اكتب الموديل'}
          </h3>
          {askMake && (
            <Field
              label="الماركة"
              required
              hint="اكتب اسم الماركة كما تريد أن تظهر في الإعلان."
            >
              <input
                type="text"
                value={state.otherMake}
                onChange={(e) =>
                  onChange({ ...state, otherMake: e.target.value.slice(0, CUSTOM_NAME_MAX) })
                }
                maxLength={CUSTOM_NAME_MAX}
                placeholder="مثال: شيري"
                className={inputCls()}
              />
            </Field>
          )}
          {askModel && (
            <Field label="الموديل" required hint={modelHint}>
              <input
                type="text"
                value={state.otherModel}
                onChange={(e) =>
                  onChange({ ...state, otherModel: e.target.value.slice(0, CUSTOM_NAME_MAX) })
                }
                maxLength={CUSTOM_NAME_MAX}
                placeholder="مثال: تيجو 4"
                className={inputCls()}
              />
            </Field>
          )}
        </div>
      )}

      {/* Loading deeper levels / resolving a leaf */}
      {(state.loading || state.resolving) && state.picked.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
        </p>
      )}

      {/* Leaf confirmation */}
      {state.categoryId && !state.resolving && !customPending && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          تم تحديد الفئة
        </div>
      )}

      {/* ── Dynamic filter fields (generic categories only) ── */}
      {state.categoryId && !state.isVehicle && visibleFilters.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">تفاصيل الفئة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleFilters.map((f) => (
              <div key={f.key} className={isWideWidget(f.widget) ? 'sm:col-span-2' : ''}>
                <FilterField
                  def={f}
                  value={state.attributes[f.key]}
                  onChange={(v) => setAttr(f.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function isWideWidget(w: CatalogFilterDef['widget']): boolean {
  return w === 'MULTISELECT' || w === 'BOOLEAN';
}

// ─── Root category card — colored top border + icon tile, hover-lift ────────────────
function RootCategoryCard({ node, onClick }: {
  node: CatalogNode; onClick: () => void;
}) {
  const meta = categoryRootMeta(node.slug);
  const { icon: Icon, fill } = meta;
  return (
    <button
      type="button"
      onClick={onClick}
      // borderTopColor inline: the top rule is the category's own hue, and these
      // are raw hex (see category-root-meta.ts on why Tailwind classes can't
      // carry this palette).
      style={{ borderTopColor: fill }}
      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white text-center
        border border-gray-200 border-t-4
        hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        transition-all duration-150 w-full`}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: fill }}
      >
        <Icon className="w-5 h-5" style={{ color: categorySymbol(meta) }} />
      </div>
      <span className="text-xs sm:text-sm font-bold text-gray-800 leading-snug line-clamp-2">
        {node.nameAr}
      </span>
      {node.count > 0 && (
        <span className="text-[10px] text-gray-400">{node.count.toLocaleString('en-US')} إعلان</span>
      )}
    </button>
  );
}

// ─── Path chips — breadcrumb of the picked chain; tap a chip to re-pick that level ──
function PathChips({ picked, onEdit }: {
  picked: CatalogNode[]; onEdit: (levelIdx: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {picked.map((node, i) => (
        <Fragment key={node.slug}>
          {i > 0 && <ChevronLeft className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
          <button
            type="button"
            onClick={() => onEdit(i)}
            title="تعديل"
            className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium
              hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors"
          >
            {node.nameAr}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

// ─── Searchable picker row — styled trigger + popover list with count badges ────────
function LevelPicker({
  label, options, selected, open, onToggle, onClose, onSelect,
}: {
  label: string;
  options: CatalogNode[];
  selected: CatalogNode | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (node: CatalogNode) => void;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const query = q.trim().toLowerCase();
  // «أخرى» always sits at the bottom of the list — it is the escape hatch, not a peer of
  // the real brands (the catalog returns it in plain sort order, e.g. 2nd for motorcycles).
  const ordered = [...options].sort((a, b) => Number(!!a.isOther) - Number(!!b.isOther));
  const filtered = query
    ? ordered.filter((o) => `${o.nameAr} ${o.name}`.toLowerCase().includes(query))
    : ordered;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-lg text-sm transition-colors ${
          open ? 'border-blue-500 ring-1 ring-blue-100' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className={selected ? 'text-gray-800 font-medium truncate' : 'text-gray-400'}>
          {selected ? selected.nameAr : 'اختر…'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white shadow-pebble rounded-card shadow-lg overflow-hidden">
          <div className="relative p-2 border-b border-gray-100">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث…"
              className="w-full ps-9 pe-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج.</p>
            ) : (
              filtered.map((o) => {
                const isSel = selected?.slug === o.slug;
                return (
                  <button
                    key={o.slug}
                    type="button"
                    onClick={() => onSelect(o)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-start transition-colors ${
                      isSel ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {o.type === 'BRAND' || o.type === 'MODEL' ? (
                      // MODEL nodes have no logo of their own — BrandMark's letter
                      // avatar is exactly the old LetterAvatar behaviour for them.
                      <BrandMark
                        name={o.type === 'BRAND' ? o.name : ''}
                        label={o.nameAr || o.name}
                        iconUrl={o.type === 'BRAND' ? o.icon : null}
                      />
                    ) : null}
                    <span className="flex-1 truncate">{o.nameAr}</span>
                    {o.count > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">
                        {o.count.toLocaleString('en-US')}
                      </span>
                    )}
                    {isSel && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── One dynamic filter field, rendered by widget type ──────────────────────────────
function FilterField({
  def, value, onChange,
}: { def: CatalogFilterDef; value: unknown; onChange: (v: unknown) => void }) {
  const label = `${def.labelAr}${def.unit ? ` (${def.unit})` : ''}`;

  switch (def.widget) {
    case 'SELECT':
      return (
        <Field label={label} required={def.isRequired} hint={def.hint}>
          <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls()}>
            <option value="">اختر</option>
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.labelAr}</option>
            ))}
          </select>
        </Field>
      );

    case 'MULTISELECT': {
      const arr = (value as string[]) ?? [];
      const toggle = (v: string) =>
        onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
      return (
        <Field label={label} required={def.isRequired} hint={def.hint}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {def.options?.map((o) => (
              <label
                key={o.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                  arr.includes(o.value)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={arr.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.labelAr}
              </label>
            ))}
          </div>
        </Field>
      );
    }

    case 'RANGE': {
      // A RANGE filter is a min–max facet for BROWSING. When ADDING a listing you enter
      // ONE value (e.g. frontage = 6 m, area = 120 m²), so render a single numeric input
      // and store a single number — same principle as the price field. (Min–max lives in
      // the browse FilterSidebar.)
      const num = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
      return (
        <Field label={label} required={def.isRequired} hint={def.hint}>
          <input
            type="number" inputMode="numeric"
            placeholder={def.range?.min != null ? `مثال: ${def.range.min}` : ''}
            value={num}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            onWheel={(e) => e.currentTarget.blur()}
            className={inputCls()}
          />
        </Field>
      );
    }

    case 'BOOLEAN':
      return (
        <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 cursor-pointer">
          <span className="text-sm font-medium text-gray-800">
            {def.labelAr}{def.isRequired && <span className="text-red-500"> *</span>}
          </span>
          <input
            type="checkbox"
            className="w-5 h-5 accent-blue-600"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </label>
      );

    case 'TEXT':
      return (
        <Field label={label} required={def.isRequired} hint={def.hint}>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.hint ?? ''}
            className={inputCls()}
          />
        </Field>
      );

    default:
      return null;
  }
}
