import {
  Home, Car, Wrench, Sofa, Shirt, WashingMachine, Smartphone, UtensilsCrossed,
  Sparkles, Briefcase, Baby, PawPrint, GraduationCap, Factory, Phone, Dumbbell,
  Gamepad2, BookOpen, HeartHandshake, Tag, type LucideIcon,
} from 'lucide-react';

/**
 * Visual identity per catalog ROOT, keyed by the stable catalog root slug.
 *
 * This is the one legitimately-local piece of category data: icons and colors
 * are design decisions, not catalog data (the API returns only
 * slug/name/nameAr/type/count/hasChildren).
 *
 * WHY this is not a drift risk the way `sidebar-categories.ts` was: it holds
 * NOTHING but slug → icon + color. No titles, no children, no paths, no
 * hierarchy — so there is nothing here that can contradict the catalog. The only
 * shared key is the slug, and an unknown slug degrades to the neutral fallback
 * rather than disappearing from the nav. A new catalog root therefore renders
 * correctly with zero edits here; adding a palette later is a pure visual upgrade.
 *
 * Never add a title/label to this map. Labels come from the catalog's `nameAr`.
 *
 * ── The 19-hue system ────────────────────────────────────────────────────────
 * Each root owns ONE hue, and the four tokens below are that single hue dressed
 * for two surfaces. Hues are spaced around the whole wheel (mean 19° apart) so
 * neighbouring tiles never read as the same color, and each hue is the
 * conventional one for its subject (red vehicles, amber property, cyan devices,
 * fuchsia fashion). Eight hues are inherited from the founder's color reference
 * — its per-category color LOGIC, not its artwork; the other eleven extend the
 * same family into the gaps. Icons are lucide (the app's existing vector set),
 * never traced from any reference.
 *
 * ── Why raw hex and not Tailwind color classes ───────────────────────────────
 * Two reasons, both load-bearing:
 *  1. globals.css REMAPS the whole `orange-*` scale onto the blue action ramp
 *     (Stitch: blue is the only action color). `text-orange-600` renders BLUE.
 *     The previous version of this map used it for furniture and helpers, so
 *     those two rendered blue-on-blue instead of orange.
 *  2. Tailwind's stock palette cannot supply 19 well-separated vivid hues.
 * Applied via inline `style`, so no JIT class-detection dependency either.
 *
 * ── The symbol is ALWAYS white (founder's call, 2026-08-07) ──────────────────
 * Every category renders the same way: its hue as a solid container, the symbol
 * in white on top. No per-category exceptions — uniformity is the point.
 *
 * That constraint set the lightness for most of the wheel. White needs ≥ 3:1, so
 * hues whose bright form could not carry it were darkened until they could,
 * buying back some of the lost vividness with extra saturation. Biggest move was
 * food-and-drinks #E6D40A → #9E9000: it sits at the yellow peak, where nothing
 * bright holds white.
 *
 * REAL-ESTATE IS THE ONE DELIBERATE EXCEPTION TO THAT RATIO (founder's call,
 * 2026-08-09). It runs #F1A536 with a white symbol at 2.06:1, chosen with the
 * number known: the founder wanted the lighter amber and judged the readability
 * directly. The two are mutually exclusive here — holding white at 3:1 caps
 * luminance at 0.30, and the lightest fill between #F1A536 and the old #BC8400
 * that clears it is #C58909 (3.02:1), 83% of the way back to where it started
 * and visually indistinguishable from it. Lighter won. Recorded so nobody
 * "fixes" it back to an ochre on contrast grounds; it is a decision, not drift.
 *
 * Every other fill clears white at ≥ 3.25:1.
 */
export interface CategoryPalette {
  /** The category's hue as a solid container. Carries the symbol colour below. */
  fill:  string;
  /**
   * Symbol colour ON `fill`. NOTHING SETS THIS TODAY — every category is white,
   * which is the point (see the header). It exists as the one-line escape hatch
   * if a future hue is ever given a dark glyph, so that decision stays a data
   * edit here instead of a hunt through four render sites. Read through
   * `categorySymbol()`, never directly, so every surface resolves it the same way.
   */
  symbol?: string;
  /**
   * Pale wash + its dark glyph — the low-emphasis pair, for any surface that
   * wants a quiet tile instead of a saturated one. Not currently rendered
   * anywhere: every surface uses `fill` + white. Kept because it is the exact
   * revert path if a surface ever wants the pale treatment back, and because
   * `ink` is the readable on-white text colour for a category.
   */
  tint:  string;
  ink:   string;
}

export interface CategoryRootMeta extends CategoryPalette {
  icon: LucideIcon;
}

/** Unknown slug — a newly seeded root renders neutrally rather than vanishing. */
export const CATEGORY_ROOT_FALLBACK: CategoryRootMeta = {
  icon: Tag, fill: '#64748B', tint: '#F1F5F9', ink: '#475569',
};

export const CATEGORY_ROOT_META: Record<string, CategoryRootMeta> = {
  // ── warm arc: property, people, goods you live with ──
  // Lighter amber, white symbol at 2.06:1 — the founder's deliberate exception to
  // the ≥ 3:1 rule the rest of the map follows. See the header before changing it.
  'real-estate':                { icon: Home,            fill: '#F1A536', tint: '#FEF8E9', ink: '#936C10' },
  'vehicles':                   { icon: Car,             fill: '#E72923', tint: '#FDEBEA', ink: '#D31E17' },
  'helpers':                    { icon: HeartHandshake,  fill: '#F75B00', tint: '#FEF1E9', ink: '#B85014' },
  // Wood brown — a dark amber. Separated from its warm neighbours by LIGHTNESS
  // rather than hue, which is also the honest color for furniture.
  'furniture-home-accessories': { icon: Sofa,            fill: '#A7661B', tint: '#FCF4EB', ink: '#A1621A' },
  // Also darkened from #E6D40A for the white symbol; lands on an olive-gold.
  'food-and-drinks':            { icon: UtensilsCrossed, fill: '#9E9000', tint: '#FEFCE9', ink: '#7F760E' },

  // ── green arc: work, study, growth, the outdoors ──
  'job-listings':               { icon: Briefcase,       fill: '#709C08', tint: '#F8FEE9', ink: '#5D7F0E' },
  'sports-and-outdoor':         { icon: Dumbbell,        fill: '#3DA30A', tint: '#F0FEE9', ink: '#36830F' },
  'books-and-stationery':       { icon: BookOpen,        fill: '#1AA22D', tint: '#EBFCED', ink: '#168424' },
  'private-lessons':            { icon: GraduationCap,   fill: '#09A457', tint: '#E9FEF4', ink: '#0F844A' },
  'pets-and-plants':            { icon: PawPrint,        fill: '#00A08B', tint: '#E9FEFB', ink: '#0E8172' },

  // ── cool arc: technology, services, connectivity ──
  'electronic-devices':         { icon: Smartphone,      fill: '#009BBB', tint: '#E9FAFE', ink: '#107C92' },
  'services':                   { icon: Wrench,          fill: '#1C86E3', tint: '#EBF4FC', ink: '#1871C0' },
  'special-numbers':            { icon: Phone,           fill: '#355FE9', tint: '#EAEFFD', ink: '#1743D3' },

  // ── violet arc: machines, play, self-expression ──
  'video-games':                { icon: Gamepad2,        fill: '#6047E1', tint: '#EEEBFC', ink: '#3D21CA' },
  'professional-equipment':     { icon: Factory,         fill: '#8F47E1', tint: '#F3EBFC', ink: '#7021CA' },
  'electric-appliances':        { icon: WashingMachine,  fill: '#B239D0', tint: '#F8ECFB', ink: '#A12DBE' },
  'fashion':                    { icon: Shirt,           fill: '#DB24BD', tint: '#FCEBF9', ink: '#C320A7' },
  'kids-and-baby':              { icon: Baby,            fill: '#E42585', tint: '#FCEBF4', ink: '#CF1A75' },
  'health-and-beauty':          { icon: Sparkles,        fill: '#E33154', tint: '#FCEBEE', ink: '#CE1C40' },
};

export function categoryRootMeta(slug: string): CategoryRootMeta {
  return CATEGORY_ROOT_META[slug] ?? CATEGORY_ROOT_FALLBACK;
}

/** Default symbol colour on a category `fill`. */
export const CATEGORY_SYMBOL_DEFAULT = '#FFFFFF';

/**
 * The colour a category's symbol should be drawn in on its own `fill`.
 *
 * Every render site goes through this rather than hardcoding `text-white`, which
 * is what let one hue opt out without hunting down four call sites — and what
 * stops the next one from being missed.
 */
export function categorySymbol(palette: Pick<CategoryPalette, 'symbol'>): string {
  return palette.symbol ?? CATEGORY_SYMBOL_DEFAULT;
}
