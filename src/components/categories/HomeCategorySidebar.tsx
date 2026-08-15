'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, LayoutGrid } from 'lucide-react';
import { catalogService, type CatalogNode } from '@/services/catalog.service';
import { CURATED_ROOTS, curatedHref, PROMOTED_SLUGS, type CuratedRoot } from '@/data/curated-categories';
import { categorySymbol } from '@/data/category-root-meta';
import { cn } from '@/lib/utils';

// ── Where each root's sub-list folds ──────────────────────────────────────────
// Keyed by CURATED root id → the catalog slug the visible part ENDS ON (that item
// is shown; everything after it hides behind «عرض المزيد»). The founder picked the
// cut points himself, per root — the four long lists fold, the six short ones stay
// fully open, so the whole nav fits without a long scroll.
//
// This lives here, not in curated-categories.ts, because it is a desktop-sidebar
// presentation detail — the mobile list and the umbrella screens render the same
// roots unfolded. Slugs are catalog contracts: a rename on the backend makes the
// lookup miss, and the list then renders FULLY OPEN (previous behaviour) rather
// than truncating at the wrong place or dropping items.
const COLLAPSE_AFTER: Record<string, string> = {
  // Moved up from 'damaged-vehicles' (founder's call): vehicles gained caravans and
  // marine-vehicles, and cutting after the last one left an 11-row list that folded
  // nothing. Cutting at motorcycles shows the six passenger-car rows plus bikes, and
  // folds the six commercial / electric / damaged / caravan / marine rows behind it.
  vehicles:   'motorcycles',
  industrial: 'industrial-equipment',
  tutors:     'private-lessons-music-instrument',
  jobs:       'job-listings-hospitality-restaurant-customer-relations',
};

// ── SubItem — a level-2 subcategory row. Always a navigation link; clicking
// drills down to the category page (no inline list expansion in the sidebar). ──

function SubItem({ node }: { node: CatalogNode }) {
  return (
    <Link
      href={`/category/${node.slug}`}
      className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-100/50 transition-colors"
    >
      <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
      {node.nameAr}
    </Link>
  );
}

// ── Root group. Heading is the CURATED label; the sub-list is catalog-driven
// (children of the mapped node, or the umbrella's members), passed in already-resolved
// so it paints together with the heading — no second wave, no pop-in.
//
// The list is fully open unless COLLAPSE_AFTER names a cut point for this root, in
// which case it opens up to that item and «عرض المزيد» reveals the rest.
//
// Umbrella roots («سوق المستعمل والجديد») have no catalog node to open, so the heading
// renders as a plain label and the members below carry the navigation. On mobile the
// same root opens /m/g/<id>; desktop needs no extra screen because the members are
// already listed here.

function RootGroup({ root, subs }: { root: CuratedRoot; subs: CatalogNode[] }) {
  const Icon = root.icon;
  const [expanded, setExpanded] = useState(false);

  // The cut point is found BY SLUG, never by index — the catalog decides the order,
  // and a reseed that reorders the list must not move the fold to a random row.
  const cutAfter = COLLAPSE_AFTER[root.id];
  const cutIndex = cutAfter ? subs.findIndex((s) => s.slug === cutAfter) : -1;
  // Nothing to hide (cut point missing, or it IS the last row) ⇒ no toggle at all.
  const foldable = cutIndex >= 0 && cutIndex < subs.length - 1;
  const visible = foldable && !expanded ? subs.slice(0, cutIndex + 1) : subs;
  const hiddenCount = subs.length - (cutIndex + 1);

  const header = (
    <>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: root.palette.fill }}
      >
        {/* Saturated tile + its symbol, same as the mobile list — one category
            icon treatment everywhere. weight="fill" (solid pictogram) rather than
            the old line style, because a hairline outline on a saturated 14px tile
            all but disappears. Colour via categorySymbol: white on every hue that
            can carry it, dark on the one that can't. */}
        <Icon weight="fill" className="w-3.5 h-3.5" style={{ color: categorySymbol(root.palette) }} />
      </div>
      <span className="flex-1 text-sm font-semibold text-gray-800 text-start">
        {root.label}
      </span>
    </>
  );

  return (
    <div className="rounded-xl border border-white/70 ring-1 ring-slate-900/[0.05] bg-white/45 overflow-hidden">
      {root.group ? (
        <div className="w-full flex items-center gap-2.5 px-3 py-2.5">{header}</div>
      ) : (
        <Link
          href={curatedHref(root, 'desktop')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/70 transition-colors"
        >
          {header}
        </Link>
      )}

      {/* Subcategory list — folded at the root's cut point when it has one */}
      {subs.length > 0 && (
        <div className="border-t border-white/70 bg-slate-500/[0.06] py-2">
          <div id={`subs-${root.id}`}>
            {visible.map((sub) => (
              <SubItem key={sub.slug} node={sub} />
            ))}
          </div>

          {foldable && (
            <button
              type="button"
              onClick={() => setExpanded((o) => !o)}
              aria-expanded={expanded}
              aria-controls={`subs-${root.id}`}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100/50 transition-colors text-start"
            >
              <ChevronDown
                className={cn('w-3.5 h-3.5 shrink-0 transition-transform', expanded && 'rotate-180')}
              />
              {expanded ? 'عرض أقل' : `عرض المزيد (${hiddenCount})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

type RootWithChildren = { root: CuratedRoot; children: CatalogNode[] };

// Matches Tailwind's `lg` — the breakpoint at which app/page.tsx reveals this aside.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function HomeCategorySidebar() {
  const router = useRouter();
  const [groups, setGroups] = useState<RootWithChildren[] | null>(null);

  // The homepage hides this aside with `hidden lg:block` — which is CSS ONLY, so on a
  // phone React still mounted it and ran the fetch wave below: ~10 catalog requests
  // per load for a sidebar nobody can see, against a shared 300-req/15-min bucket.
  // Gate on the actual viewport so mobile spends zero. Listening (not just reading
  // once) keeps a resize-to-desktop correct without a reload.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Headings come from the curated config (no fetch); only the sub-lists are catalog
  // data. Fetch them all up front and commit once — so the whole tree paints expanded
  // in a single render. The old code let each RootGroup fetch its own children on
  // mount (1+N), which made the sub-lists pop in a second or two after the headings.
  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    (async () => {
      const catalogRoots = await catalogService.getChildren(null);
      const bySlug = new Map(catalogRoots.map((n) => [n.slug, n]));

      const childLists = await Promise.all(
        CURATED_ROOTS.map((r) =>
          // Umbrella: its "children" are the grouped catalog roots themselves.
          r.group
            ? Promise.resolve(r.group.map((s) => bySlug.get(s)).filter((n): n is CatalogNode => !!n))
            : catalogService.getChildren(r.slug!),
        ),
      );
      if (cancelled) return;

      setGroups(
        CURATED_ROOTS.map((root, i) => ({
          root,
          // Same one-place rule as the mobile drill-down: a node promoted to a
          // curated root doesn't also appear under its catalog parent.
          children: childLists[i].filter((c) => !PROMOTED_SLUGS.has(c.slug)),
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [isDesktop]);

  return (
    // ── Frosted-glass card ──
    // The page behind this aside is a flat #F7F9FB, so a blur alone would be
    // invisible: the glass has to read through LAYERING and a defined edge, not
    // through blurred scenery. Three strata, each a step darker than the one above
    // it — card (white/60) → root box (white/45) → sub-list (cool slate wash) — and
    // the edge is a double hairline: an inner white/70 border for the lit rim plus
    // a slate ring just outside it, so the box keeps a visible outline («kenar»)
    // against the pale background instead of dissolving into it.
    // Text stays at gray-800/700 (not the lighter greys) so nothing washes out.
    <div
      className="rounded-card p-4 space-y-3 bg-white/60 backdrop-blur-xl backdrop-saturate-150
                 border border-white/70 ring-1 ring-slate-900/[0.06]
                 shadow-[0_10px_30px_-12px_rgb(25_28_30/0.18)]"
    >

      {/* ── Quick links ── */}
      <div className="space-y-0.5">
        <Link
          href="/listings?showcase=urgent_showcase"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white/70 ring-1 ring-slate-900/[0.04] group-hover:bg-orange-100 flex items-center justify-center text-sm shrink-0 transition-colors">
            🚨
          </div>
          <span className="text-sm text-gray-700 group-hover:text-orange-600 font-medium transition-colors">
            عاجل عاجل
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-white/70 ring-1 ring-slate-900/[0.04] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-gray-500" />
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
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-xl border border-white/70 ring-1 ring-slate-900/[0.05] bg-white/45 hover:bg-white/80 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-gray-500" />
        كل الإعلانات
      </button>

      {/* ── Category groups (curated headings, catalog sub-lists, always expanded) ── */}
      <div className="space-y-1.5">
        {groups === null
          ? Array.from({ length: CURATED_ROOTS.length }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/70 ring-1 ring-slate-900/[0.05] bg-white/45 overflow-hidden">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900/[0.06] animate-pulse shrink-0" />
                  <div className="h-3.5 w-24 rounded bg-slate-900/[0.06] animate-pulse" />
                </div>
                <div className="border-t border-white/70 bg-slate-500/[0.06] py-2 space-y-1.5">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <div key={j} className="h-2.5 w-32 rounded bg-slate-900/[0.06] animate-pulse mx-4" />
                  ))}
                </div>
              </div>
            ))
          : groups.map(({ root, children }) => (
              <RootGroup key={root.id} root={root} subs={children} />
            ))}
      </div>

    </div>
  );
}
