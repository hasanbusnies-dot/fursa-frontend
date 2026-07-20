import {
  Building2, Car, Wrench, Sofa, Shirt, PlugZap, Smartphone, UtensilsCrossed,
  Sparkles, Briefcase, Baby, PawPrint, GraduationCap, Factory, Hash, Dumbbell,
  Gamepad2, BookOpen, UserPlus, Tag, type LucideIcon,
} from 'lucide-react';

/**
 * Visual identity per catalog ROOT, keyed by the stable catalog root slug.
 *
 * This is the one legitimately-local piece of category data: icons and colors
 * are design decisions, not catalog data (the API returns only
 * slug/name/nameAr/type/count/hasChildren).
 *
 * WHY this is not a drift risk the way `sidebar-categories.ts` was: it holds
 * NOTHING but slug → icon. No titles, no children, no paths, no hierarchy — so
 * there is nothing here that can contradict the catalog. The only shared key is
 * the slug, and an unknown slug degrades to the neutral fallback rather than
 * disappearing from the nav. A new catalog root therefore renders correctly with
 * zero edits here; adding an icon later is a pure visual upgrade.
 *
 * Never add a title/label to this map. Labels come from the catalog's `nameAr`.
 */
export interface CategoryRootMeta {
  icon:  LucideIcon;
  color: string;
  bg:    string;
}

export const CATEGORY_ROOT_FALLBACK: CategoryRootMeta = {
  icon: Tag, color: 'text-gray-500', bg: 'bg-gray-100',
};

export const CATEGORY_ROOT_META: Record<string, CategoryRootMeta> = {
  'real-estate':                { icon: Building2,       color: 'text-red-600',     bg: 'bg-red-50'     },
  'vehicles':                   { icon: Car,             color: 'text-blue-600',    bg: 'bg-blue-50'    },
  'services':                   { icon: Wrench,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'furniture-home-accessories': { icon: Sofa,            color: 'text-orange-600',  bg: 'bg-orange-50'  },
  'fashion':                    { icon: Shirt,           color: 'text-pink-600',    bg: 'bg-pink-50'    },
  'electric-appliances':        { icon: PlugZap,         color: 'text-purple-600',  bg: 'bg-purple-50'  },
  'electronic-devices':         { icon: Smartphone,      color: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  'food-and-drinks':            { icon: UtensilsCrossed, color: 'text-yellow-600',  bg: 'bg-yellow-50'  },
  'health-and-beauty':          { icon: Sparkles,        color: 'text-teal-600',    bg: 'bg-teal-50'    },
  'job-listings':               { icon: Briefcase,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  'kids-and-baby':              { icon: Baby,            color: 'text-pink-600',    bg: 'bg-pink-50'    },
  'pets-and-plants':            { icon: PawPrint,        color: 'text-teal-600',    bg: 'bg-teal-50'    },
  'private-lessons':            { icon: GraduationCap,   color: 'text-yellow-600',  bg: 'bg-yellow-50'  },
  'professional-equipment':     { icon: Factory,         color: 'text-purple-600',  bg: 'bg-purple-50'  },
  'special-numbers':            { icon: Hash,            color: 'text-gray-600',    bg: 'bg-gray-100'   },
  'sports-and-outdoor':         { icon: Dumbbell,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
  'video-games':                { icon: Gamepad2,        color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  'books-and-stationery':       { icon: BookOpen,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  // 19th root — was missing from the old HomeCategorySidebar map, so it rendered
  // with the neutral fallback. Icon carried over from the retired hand file.
  'helpers':                    { icon: UserPlus,        color: 'text-orange-600',  bg: 'bg-orange-50'  },
};

export function categoryRootMeta(slug: string): CategoryRootMeta {
  return CATEGORY_ROOT_META[slug] ?? CATEGORY_ROOT_FALLBACK;
}
