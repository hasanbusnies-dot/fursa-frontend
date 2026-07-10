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
  Tag, Building2, Car, Wrench, Sofa, Shirt, PlugZap, Smartphone, UtensilsCrossed,
  Sparkles, Briefcase, Baby, PawPrint, GraduationCap, Factory, Hash, Dumbbell,
  Gamepad2, BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  catalogService,
  VEHICLES_ROOT_SLUG,
  type CatalogNode,
  type CatalogFilterDef,
} from '@/services/catalog.service';
import {
  siAcura, siAudi, siBmw, siBentley, siCadillac, siChevrolet, siChrysler, siCitroen,
  siDacia, siFiat, siFord, siHonda, siHyundai, siInfiniti, siJeep, siKia, siLada, siMg,
  siMaserati, siMazda, siMini, siMitsubishi, siNissan, siOpel, siPeugeot, siPorsche,
  siProton, siRenault, siSkoda, siSubaru, siSuzuki, siToyota, siVolkswagen, siVolvo,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';
// car-brand-logos (MIT-packaged set) — full-color marks for brands Simple Icons dropped.
import cblAlfaRomeo from 'car-brand-logos/alfa-romeo-logo.svg';
import cblByd from 'car-brand-logos/byd-logo.svg';
import cblBrilliance from 'car-brand-logos/brilliance-logo.png';
import cblChangan from 'car-brand-logos/changan-logo.png';
import cblChery from 'car-brand-logos/chery-logo.png';
import cblDfsk from 'car-brand-logos/dfsk-logo.svg';
import cblDaewoo from 'car-brand-logos/daewoo-logo.png';
import cblDaihatsu from 'car-brand-logos/daihatsu-logo.svg';
import cblDodge from 'car-brand-logos/dodge-logo.png';
import cblDongfeng from 'car-brand-logos/dongfeng-logo.png';
import cblGmc from 'car-brand-logos/gmc-logo.png';
import cblGeely from 'car-brand-logos/geely-logo.svg';
import cblGenesis from 'car-brand-logos/genesis-logo.svg';
import cblGreatWall from 'car-brand-logos/great-wall-logo.png';
import cblIsuzu from 'car-brand-logos/isuzu-logo.svg';
import cblJac from 'car-brand-logos/jac-logo.png';
import cblJaguar from 'car-brand-logos/jaguar-logo.svg';
import cblJetour from 'car-brand-logos/jetour-logo.svg';
import cblLandRover from 'car-brand-logos/land-rover-logo.svg';
import cblLexus from 'car-brand-logos/lexus-logo.png';
import cblLincoln from 'car-brand-logos/lincoln-logo.svg';
import cblMaybach from 'car-brand-logos/maybach-logo.png';
import cblMercedesBenz from 'car-brand-logos/mercedes-benz-logo.svg';
import cblRover from 'car-brand-logos/rover-logo.png';
import cblSaab from 'car-brand-logos/saab-logo.png';
import cblSsangYong from 'car-brand-logos/ssangyong-logo.png';
import cblZotye from 'car-brand-logos/zotye-logo.png';

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
  if (s.isVehicle) return false; // vehicle attributes are collected in later steps
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

// ── Root-category visuals (reused from the old Step0CategorySelect) ─────────────────
const CARD_SCHEMES = [
  { border: 'border-t-red-500',     icon: 'text-red-600',     bg: 'bg-red-50'     },
  { border: 'border-t-blue-500',    icon: 'text-blue-600',    bg: 'bg-blue-50'    },
  { border: 'border-t-emerald-500', icon: 'text-emerald-600', bg: 'bg-emerald-50' },
  { border: 'border-t-orange-500',  icon: 'text-orange-600',  bg: 'bg-orange-50'  },
  { border: 'border-t-purple-500',  icon: 'text-purple-600',  bg: 'bg-purple-50'  },
  { border: 'border-t-cyan-500',    icon: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  { border: 'border-t-yellow-500',  icon: 'text-yellow-600',  bg: 'bg-yellow-50'  },
  { border: 'border-t-pink-500',    icon: 'text-pink-600',    bg: 'bg-pink-50'    },
  { border: 'border-t-teal-500',    icon: 'text-teal-600',    bg: 'bg-teal-50'    },
  { border: 'border-t-indigo-500',  icon: 'text-indigo-600',  bg: 'bg-indigo-50'  },
] as const;

// Keyed by SLUG (stable) — the catalog's nameAr differs from the old category names.
const ROOT_ICONS: Record<string, LucideIcon> = {
  'real-estate':                 Building2,
  'vehicles':                    Car,
  'services':                    Wrench,
  'furniture-home-accessories':  Sofa,
  'fashion':                     Shirt,
  'electric-appliances':         PlugZap,
  'electronic-devices':          Smartphone,
  'food-and-drinks':             UtensilsCrossed,
  'health-and-beauty':           Sparkles,
  'job-listings':                Briefcase,
  'kids-and-baby':               Baby,
  'pets-and-plants':             PawPrint,
  'private-lessons':             GraduationCap,
  'professional-equipment':      Factory,
  'special-numbers':             Hash,
  'sports-and-outdoor':          Dumbbell,
  'video-games':                 Gamepad2,
  'books-and-stationery':        BookOpen,
};

// ── Brand logos (Simple Icons, CC0) ────────────────────────────────────────────────
// Normalize a catalog brand `name` (NOT the messy slug) to a logo-map key, accent-insensitive.
//   "Citroën"/"Citroen" → citroen, "Mercedes-Benz" → mercedesbenz, "MG" → mg
const normBrand = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Brand name (normalized) → Simple Icons mark. ~34 of the 69 vehicle brands are covered;
// the rest (Mercedes-Benz, Land Rover, Jaguar, GMC, BYD, …) gracefully use the letter avatar.
const BRAND_LOGOS: Record<string, SimpleIcon> = {
  acura: siAcura, audi: siAudi, bmw: siBmw, bentley: siBentley, cadillac: siCadillac,
  chevrolet: siChevrolet, chrysler: siChrysler, citroen: siCitroen, dacia: siDacia,
  fiat: siFiat, ford: siFord, honda: siHonda, hyundai: siHyundai, infiniti: siInfiniti,
  jeep: siJeep, kia: siKia, lada: siLada, mg: siMg, maserati: siMaserati, mazda: siMazda,
  mini: siMini, mitsubishi: siMitsubishi, nissan: siNissan, opel: siOpel, peugeot: siPeugeot,
  porsche: siPorsche, proton: siProton, renault: siRenault, skoda: siSkoda, subaru: siSubaru,
  suzuki: siSuzuki, toyota: siToyota, volkswagen: siVolkswagen, volvo: siVolvo,
};

// Brand-tinted logo fill: use the logo's own hex, but if it's too light to read on the
// light circle (e.g. Opel's near-yellow, Renault's gold) fall back to gray-700 so no mark
// ever vanishes. Relative luminance via the standard 0.299/0.587/0.114 weights.
function logoFill(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78 ? '#374151' : `#${hex}`;
}

// Image imports resolve to a StaticImageData object ({ src }) for png and `any` (also a
// StaticImageData at runtime) for svg — normalize both to a plain URL string.
type ImgImport = string | { src: string };
const imgSrc = (m: ImgImport): string => (typeof m === 'string' ? m : m.src);

// Brand name (normalized) → car-brand-logos full-color asset. Fills the gaps Simple Icons
// dropped (Mercedes-Benz, Land Rover, Lexus, GMC, …). 7 niche brands remain on the avatar.
const CAR_LOGO_FILES: Record<string, ImgImport> = {
  alfaromeo: cblAlfaRomeo, byd: cblByd, brilliance: cblBrilliance, changan: cblChangan,
  chery: cblChery, dfsk: cblDfsk, daewoo: cblDaewoo, daihatsu: cblDaihatsu, dodge: cblDodge,
  dongfeng: cblDongfeng, gmc: cblGmc, geely: cblGeely, genesis: cblGenesis, greatwall: cblGreatWall,
  isuzu: cblIsuzu, jac: cblJac, jaguar: cblJaguar, jetour: cblJetour, landrover: cblLandRover,
  lexus: cblLexus, lincoln: cblLincoln, maybach: cblMaybach, mercedesbenz: cblMercedesBenz,
  rover: cblRover, saab: cblSaab, ssangyong: cblSsangYong, zotye: cblZotye,
};

// A logo image inside the standard brand-mark circle (used for node.icon + car-brand-logos).
function CircleImg({ src, onError }: { src: string; onError: () => void }) {
  return (
    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-5 h-5 object-contain" onError={onError} />
    </span>
  );
}

// Initial-letter avatar — the universal fallback (also used as-is for MODEL nodes).
function LetterAvatar({ node }: { node: CatalogNode }) {
  return (
    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
      {(node.name || node.nameAr).trim().charAt(0).toUpperCase()}
    </span>
  );
}

// BRAND mark — render priority:
//   (a) catalog node.icon URL (future-proof for a DB-populated Category.icon)
//   (b) Simple Icons mark, brand-tinted (its 34 brands)
//   (c) car-brand-logos full-color asset (fills the gaps Simple Icons dropped)
//   (d) initial-letter avatar (7 niche brands neither set covers)
function BrandMark({ node }: { node: CatalogNode }) {
  const [iconFailed, setIconFailed] = useState(false);
  const [cblFailed, setCblFailed] = useState(false);
  const key = normBrand(node.name);
  const iconUrl = node.icon && /^https?:\/\//i.test(node.icon) ? node.icon : null;

  if (iconUrl && !iconFailed) {
    return <CircleImg src={iconUrl} onError={() => setIconFailed(true)} />;
  }

  const si = BRAND_LOGOS[key];
  if (si) {
    return (
      <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <svg role="img" viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4" fill={logoFill(si.hex)}>
          <path d={si.path} />
        </svg>
      </span>
    );
  }

  const cbl = CAR_LOGO_FILES[key];
  if (cbl && !cblFailed) {
    return <CircleImg src={imgSrc(cbl)} onError={() => setCblFailed(true)} />;
  }

  return <LetterAvatar node={node} />;
}

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
          {(state.levels[0] ?? []).map((node, idx) => (
            <RootCategoryCard key={node.slug} node={node} idx={idx} onClick={() => selectAt(0, node)} />
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

      {/* Loading deeper levels / resolving a leaf */}
      {(state.loading || state.resolving) && state.picked.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
        </p>
      )}

      {/* Leaf confirmation */}
      {state.categoryId && !state.resolving && (
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
function RootCategoryCard({ node, idx, onClick }: {
  node: CatalogNode; idx: number; onClick: () => void;
}) {
  const scheme = CARD_SCHEMES[idx % CARD_SCHEMES.length];
  const Icon = ROOT_ICONS[node.slug] ?? Tag;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white text-center
        border border-gray-200 border-t-4 ${scheme.border}
        hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        transition-all duration-150 w-full`}
    >
      <div className={`w-11 h-11 rounded-xl ${scheme.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${scheme.icon}`} />
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
  const filtered = query
    ? options.filter((o) => `${o.nameAr} ${o.name}`.toLowerCase().includes(query))
    : options;

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
                    {o.type === 'BRAND' ? <BrandMark node={o} /> : o.type === 'MODEL' ? <LetterAvatar node={o} /> : null}
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
