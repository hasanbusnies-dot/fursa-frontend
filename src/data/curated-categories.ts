// Phosphor icons — imported from the SSR entry (static single-SVG components, no
// React context) so `MobileCategoryList` stays a server component. The mobile tile
// renders these with weight="fill" (solid pictograms, per the sahibinden reference);
// the desktop sidebar renders the same icons with weight="regular" (line).
import {
  HouseIcon, CarIcon, WrenchIcon, ShoppingBagIcon, TractorIcon,
  PaintRollerIcon, GraduationCapIcon, BriefcaseIcon, PawPrintIcon, BabyCarriageIcon,
} from '@phosphor-icons/react/dist/ssr';
// Type-only import from the main entry — erased at compile time, so it pulls no
// client runtime into the server component.
import type { Icon } from '@phosphor-icons/react';

/**
 * The founder's CURATED top-level category nav — 10 roots, his labels, his order,
 * his grouping. Both the mobile homepage list and the desktop sidebar read this.
 *
 * ── Why a local file here is correct, when the one it replaces was a bug ──
 * The retired `sidebar-categories.ts` INVENTED slugs: it encoded a display
 * hierarchy as nested URL paths (`/category/real-estate/residential/for-sale`)
 * whose last segment was a label, not a catalog node. 132 of its 163 links 404'd
 * and 24 more silently opened the WRONG category (`vehicles/commercial` resolved
 * into real-estate). The curation was never the problem — the fabricated slugs were.
 *
 * So the rule this file lives by: **it may NAME catalog nodes, never DESCRIBE them.**
 *   - every `slug` / `group` entry must be a real catalog slug (validated — see below)
 *   - no paths, no hierarchy, no child lists — drill-down comes from the catalog
 *   - `subtitle` is display-only text (never a link) so it cannot 404, only age
 *
 * Validation: `verify_nav_links.py` asserts every slug/group entry resolves via
 * getPath, AND that the 8 mapped roots + the 11 umbrella slugs account for all 19
 * catalog roots — so a newly seeded root surfaces as "not reachable from the nav"
 * instead of silently vanishing. That check is what the old file never had.
 */

export interface CuratedRoot {
  /** Stable local id. NOT a catalog slug — lives in its own URL namespace (/m/g/<id>). */
  id:       string;
  label:    string;
  /** Curated teaser text. Display-only; truncates with the RTL ellipsis. */
  subtitle: string;
  icon:     Icon;
  /** Glyph color + pale-tint tile bg for the DESKTOP sidebar's small square. */
  color:    string;
  bg:       string;
  /** Saturated solid circle fill for the MOBILE category tile (white glyph on top),
      per the sahibinden reference. Kept separate from `bg`/`color` so the desktop
      sidebar's pale-tint square is untouched. Light hues go -600 so white stays legible. */
  fill:     string;
  /** A real catalog slug this root opens. Mutually exclusive with `group`. */
  slug?:    string;
  /** Umbrella: real catalog root slugs listed on a curated landing screen. */
  group?:   string[];
}

export const CURATED_ROOTS: CuratedRoot[] = [
  {
    id: 'real-estate', label: 'عقارات',
    subtitle: 'عقارات سكنية، عقارات تجارية، أراضي، مشاريع سكنية، أبنية / عمارات، ملكية مشتركة (تايم شير)، منشآت سياحية، مسابح للإيجار',
    icon: HouseIcon, color: 'text-red-600', bg: 'bg-red-50', fill: 'bg-red-500',
    slug: 'real-estate',
  },
  {
    id: 'vehicles', label: 'مركبات',
    // Latin comma after «سيارات رياضية» fixed here (was FOLLOWUPS §0a, tracked
    // against the retired file — resolved rather than dropped with it).
    subtitle: 'سيارات، مركبات الطرق الوعرة، سيارات رياضية، بيكاب، سيارات كهربائية، دراجات نارية، ميني فان وفان، مركبات تجارية، مركبات للإيجار، مركبات بحرية، مركبات متضررة، كرفانات',
    icon: CarIcon, color: 'text-blue-600', bg: 'bg-blue-50', fill: 'bg-blue-600',
    slug: 'vehicles',
  },
  {
    id: 'car-parts', label: 'قطع غيار وإكسسوارات وتعديل',
    subtitle: 'معدات السيارات، معدات الدراجات النارية، معدات المركبات البحرية',
    icon: WrenchIcon, color: 'text-slate-600', bg: 'bg-slate-100', fill: 'bg-slate-600',
    // Promoted to top level by the founder; the catalog files it under `vehicles`.
    // Hidden from the vehicles drill-down so it is reachable in exactly one place.
    slug: 'car-parts-accessories',
  },
  {
    id: 'market', label: 'سوق المستعمل والجديد',
    subtitle: 'حواسيب، هواتف محمولة وإكسسوارات، كاميرات وتصوير، ديكور المنزل، إلكترونيات منزلية، أجهزة منزلية كهربائية، أزياء وإكسسوارات، ساعات، أم وطفل، هوايات وألعاب',
    icon: ShoppingBagIcon, color: 'text-orange-600', bg: 'bg-orange-50', fill: 'bg-orange-500',
    // Pure curated umbrella: the catalog has NO parent above these 11 (all are
    // roots with parent=null), so tapping this opens a curated landing, not a
    // catalog node. Order is the founder's emphasis — electronics first.
    group: [
      'electronic-devices',
      'electric-appliances',
      'furniture-home-accessories',
      'fashion',
      'health-and-beauty',
      'kids-and-baby',
      'video-games',
      'sports-and-outdoor',
      'books-and-stationery',
      'food-and-drinks',
      'special-numbers',
    ],
  },
  {
    id: 'industrial', label: 'آلات صناعية ومعدات',
    subtitle: 'آلات ثقيلة، آلات زراعية، صناعة، كهرباء وطاقة',
    icon: TractorIcon, color: 'text-purple-600', bg: 'bg-purple-50', fill: 'bg-purple-600',
    slug: 'professional-equipment',
  },
  {
    id: 'services', label: 'حرفيون وخدمات',
    subtitle: 'تجديد وديكور المنزل، نقل وشحن، صيانة وخدمات السيارات',
    icon: PaintRollerIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', fill: 'bg-emerald-600',
    slug: 'services',
  },
  {
    id: 'tutors', label: 'مدرسون خصوصيون',
    subtitle: 'ثانوي وجامعي، ابتدائي وإعدادي، لغات أجنبية، حاسوب، قيادة، رياضة، فنون، رقص، موسيقى وآلات موسيقية، مسرح وتمثيل، تنمية بشرية، دروس مهنية',
    icon: GraduationCapIcon, color: 'text-yellow-600', bg: 'bg-yellow-50', fill: 'bg-amber-600',
    slug: 'private-lessons',
  },
  {
    id: 'jobs', label: 'وظائف',
    subtitle: 'محاماة واستشارات قانونية، تعليم، ترفيه وأنشطة، تجميل وعناية، تكنولوجيا المعلومات وتطوير البرمجيات، موارد بشرية، بناء وإنشاءات، إدارة وأعمال، حراسة وأمن',
    icon: BriefcaseIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', fill: 'bg-indigo-600',
    slug: 'job-listings',
  },
  {
    id: 'pets', label: 'عالم الحيوان',
    subtitle: 'إكسسوارات ومعدات، أعلاف وطعام، حيوانات أليفة، أسماك زينة، دواجن، مواشي (أبقار)، مواشي (أغنام)، كائنات بحرية',
    icon: PawPrintIcon, color: 'text-teal-600', bg: 'bg-teal-50', fill: 'bg-teal-600',
    slug: 'pets-and-plants',
  },
  {
    id: 'helpers', label: 'باحثون عن مساعدين',
    subtitle: 'جليسة أطفال ورضع، رعاية مسنين ومرضى، عاملة نظافة ومساعدة منزلية',
    icon: BabyCarriageIcon, color: 'text-orange-600', bg: 'bg-orange-50', fill: 'bg-orange-500',
    slug: 'helpers',
  },
];

/** Where a curated root navigates. Umbrellas get their own URL namespace. */
export function curatedHref(root: CuratedRoot, surface: 'mobile' | 'desktop'): string {
  if (root.group) return `/m/g/${root.id}`;
  return surface === 'mobile' ? `/m/categories/${root.slug}` : `/category/${root.slug}`;
}

/**
 * Catalog slugs promoted to curated top-level roots. The drill-down hides these
 * from their catalog parent's children so a promoted node is reachable in exactly
 * one place (today: car-parts-accessories, which the catalog files under vehicles).
 * Derived from the config — promoting another node needs no code change here.
 */
export const PROMOTED_SLUGS: ReadonlySet<string> = new Set(
  CURATED_ROOTS.map((r) => r.slug).filter((s): s is string => !!s),
);
