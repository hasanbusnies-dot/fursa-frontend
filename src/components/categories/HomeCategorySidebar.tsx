'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, LayoutGrid, Tag,
  Building2, Car, Wrench, Sofa, Shirt, PlugZap, Smartphone, UtensilsCrossed,
  Sparkles, Briefcase, Baby, PawPrint, GraduationCap, Factory, Hash, Dumbbell,
  Gamepad2, BookOpen, type LucideIcon,
} from 'lucide-react';
import { catalogService, type CatalogNode } from '@/services/catalog.service';

// Per-root icon + color, keyed by the stable catalog root slug. Falls back to a
// neutral Tag mark for any root not listed (so new catalog roots still render).
const ROOT_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
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
};

// ── SubItem — a level-2 subcategory row. Always a navigation link; clicking
// drills down to the category page (no inline list expansion in the sidebar). ──

function SubItem({ node }: { node: CatalogNode }) {
  return (
    <Link
      href={`/category/${node.slug}`}
      className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-100/40 transition-colors"
    >
      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
      {node.nameAr}
    </Link>
  );
}

// ── Root group — ALWAYS expanded. The heading links to the category page; its
// level-2 children are passed in already-resolved (see HomeCategorySidebar), so the
// sub-list paints together with the heading — no second-wave fetch, no pop-in. ──

function RootGroup({ root, subs }: { root: CatalogNode; subs: CatalogNode[] }) {
  const meta = ROOT_META[root.slug] ?? { icon: Tag, color: 'text-gray-500', bg: 'bg-gray-100' };
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — links to the category page */}
      <Link
        href={`/category/${root.slug}`}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
      >
        <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 text-start">
          {root.nameAr}
        </span>
      </Link>

      {/* Subcategory list — always shown */}
      {subs.length > 0 && (
        <div className="border-t border-gray-100 border-b border-gray-200 bg-slate-50 py-2">
          {subs.map((sub) => (
            <SubItem key={sub.slug} node={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

type RootWithChildren = { root: CatalogNode; children: CatalogNode[] };

export function HomeCategorySidebar() {
  const router = useRouter();
  const [groups, setGroups] = useState<RootWithChildren[] | null>(null);

  // Fetch roots AND every root's level-2 children up front, then commit once — so the
  // whole tree paints expanded in a single render. The old code fetched roots first and
  // let each RootGroup fetch its own children on mount (1+N), which made the sub-lists
  // pop in a second or two after the headings on every homepage load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const roots = await catalogService.getChildren(null);
      const childLists = await Promise.all(roots.map((r) => catalogService.getChildren(r.slug)));
      if (cancelled) return;
      setGroups(roots.map((root, i) => ({ root, children: childLists[i] })));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">

      {/* ── Quick links ── */}
      <div className="space-y-0.5">
        <Link
          href="/listings?showcase=urgent_showcase"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center text-sm shrink-0 transition-colors">
            🚨
          </div>
          <span className="text-sm text-gray-700 group-hover:text-orange-600 font-medium transition-colors">
            عاجل عاجل
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-700 leading-relaxed">
            <Link href="/listings?showcase=last_48h" className="text-blue-600 hover:underline">آخر 48 ساعة</Link>
            {' · '}
            <Link href="/listings?showcase=one_week" className="text-blue-600 hover:underline">آخر أسبوع</Link>
            {' · '}
            <Link href="/listings?showcase=one_month" className="text-blue-600 hover:underline">آخر شهر</Link>
          </span>
        </div>
      </div>

      {/* ── All listings ── */}
      <button
        type="button"
        onClick={() => router.push('/listings')}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        كل الإعلانات
      </button>

      {/* ── Category groups (catalog-driven, always expanded) ── */}
      <div className="space-y-1.5">
        {groups === null
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                  <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="border-t border-gray-100 bg-slate-50 py-2 space-y-1.5">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <div key={j} className="h-2.5 w-32 rounded bg-gray-100 animate-pulse mx-4" />
                  ))}
                </div>
              </div>
            ))
          : groups.map(({ root, children }) => (
              <RootGroup key={root.slug} root={root} subs={children} />
            ))}
      </div>

    </div>
  );
}
