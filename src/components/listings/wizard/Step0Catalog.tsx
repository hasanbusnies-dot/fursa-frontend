'use client';

// ═══════════════════════════════════════════════════════════════════════════════
// Step 0 — doushesh cascading catalog picker (category → … → brand → model) + the
// category's dynamic, inherited filter fields. Replaces the old Step0CategorySelect.
//
// Adapted from the reference AddListingCatalog.tsx: rewired from raw fetch/VITE env to
// `catalogService` (the project api wrapper), restyled to the wizard design system, and
// controlled via lifted state so the selection survives back/forward navigation.
//
// Output (lifted to CreateListingForm): { categorySlug, categoryId, isVehicle, attributes }.
// LOCATION widgets are intentionally NOT rendered here — location is captured by the
// shared details step's flat fields (country / governorate / district / neighborhood).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import {
  catalogService,
  VEHICLES_ROOT_SLUG,
  type CatalogNode,
  type CatalogFilterDef,
} from '@/services/catalog.service';

export interface CatalogState {
  levels: CatalogNode[][];          // levels[i] = options at depth i
  picked: CatalogNode[];            // chosen chain (root → leaf)
  filters: CatalogFilterDef[];      // leaf's inherited filter set
  attributes: Record<string, unknown>;
  categorySlug: string | null;      // chosen leaf slug
  categoryId: string | null;        // resolved UUID for POST /listings
  isVehicle: boolean;               // vehicles root + a brand was picked
  loading: boolean;                 // fetching children
  resolving: boolean;               // resolving filters + categoryId for a leaf
}

export const initialCatalogState: CatalogState = {
  levels: [], picked: [], filters: [], attributes: {},
  categorySlug: null, categoryId: null, isVehicle: false,
  loading: false, resolving: false,
};

// A leaf is selected once we have a resolved categoryId. For generic categories, every
// required (non-LOCATION) filter must also be filled before the step is complete.
export function catalogStepIncomplete(s: CatalogState): boolean {
  if (!s.categoryId) return true;
  if (s.isVehicle) return false; // vehicle attributes are collected in later steps
  return s.filters.some(
    (f) => f.isRequired && f.widget !== 'LOCATION' && isEmpty(s.attributes[f.key]),
  );
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

interface Props {
  state: CatalogState;
  onChange: (next: CatalogState) => void;
  error?: string;
}

export function Step0Catalog({ state, onChange, error }: Props) {
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

  const visibleFilters = state.filters.filter((f) => f.widget !== 'LOCATION');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">اختر الفئة</h2>
        <p className="text-sm text-gray-500 mt-1">
          اختر التصنيف ثم الماركة والموديل — ستظهر حقول الفئة تلقائياً.
        </p>
      </div>

      {/* ── Cascading category / brand / model selects ── */}
      <div className="space-y-4">
        {state.levels.map((opts, i) => (
          <Field key={i} label={levelLabel(opts[0]?.type)}>
            <select
              value={state.picked[i]?.slug ?? ''}
              onChange={(e) => {
                const n = opts.find((o) => o.slug === e.target.value);
                if (n) selectAt(i, n);
              }}
              className={inputCls()}
            >
              <option value="" disabled>اختر…</option>
              {opts.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.nameAr}{o.count ? ` (${o.count})` : ''}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>

      {(state.loading || state.resolving) && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}

      {/* ── Leaf selected ── */}
      {state.categoryId && !state.resolving && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          تم اختيار:{' '}
          <strong className="ms-1">
            {state.picked.map((p) => p.nameAr).join(' › ')}
          </strong>
        </div>
      )}

      {/* ── Dynamic filter fields (generic categories only) ── */}
      {state.categoryId && !state.isVehicle && visibleFilters.length > 0 && (
        <div className="space-y-5 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">تفاصيل الفئة</h3>
          {visibleFilters.map((f) => (
            <FilterField
              key={f.key}
              def={f}
              value={state.attributes[f.key]}
              onChange={(v) => setAttr(f.key, v)}
            />
          ))}
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
      const val = (value as { min?: number; max?: number }) ?? {};
      const set = (k: 'min' | 'max', raw: string) =>
        onChange({ ...val, [k]: raw ? Number(raw) : undefined });
      return (
        <Field label={label} required={def.isRequired} hint={def.hint}>
          <div className="flex items-center gap-2">
            <input
              type="number" inputMode="numeric"
              placeholder={def.range?.min != null ? String(def.range.min) : 'من'}
              value={val.min ?? ''} onChange={(e) => set('min', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className={inputCls()}
            />
            <span className="text-gray-400">—</span>
            <input
              type="number" inputMode="numeric"
              placeholder={def.range?.max != null ? String(def.range.max) : 'إلى'}
              value={val.max ?? ''} onChange={(e) => set('max', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className={inputCls()}
            />
          </div>
        </Field>
      );
    }

    case 'BOOLEAN':
      return (
        <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
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
