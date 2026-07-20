'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, LayoutGrid } from 'lucide-react';
import { catalogService, type CatalogNode } from '@/services/catalog.service';
import { CURATED_ROOTS, curatedHref, PROMOTED_SLUGS, type CuratedRoot } from '@/data/curated-categories';

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

// ── Root group — ALWAYS expanded. Heading is the CURATED label; the sub-list is
// catalog-driven (children of the mapped node, or the umbrella's members), passed in
// already-resolved so it paints together with the heading — no second wave, no pop-in.
//
// Umbrella roots («سوق المستعمل والجديد») have no catalog node to open, so the heading
// renders as a plain label and the members below carry the navigation. On mobile the
// same root opens /m/g/<id>; desktop needs no extra screen because the members are
// already listed here.

function RootGroup({ root, subs }: { root: CuratedRoot; subs: CatalogNode[] }) {
  const Icon = root.icon;

  const header = (
    <>
      <div className={`w-7 h-7 rounded-lg ${root.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${root.color}`} />
      </div>
      <span className="flex-1 text-sm font-semibold text-gray-800 text-start">
        {root.label}
      </span>
    </>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {root.group ? (
        <div className="w-full flex items-center gap-2.5 px-3 py-2.5">{header}</div>
      ) : (
        <Link
          href={curatedHref(root, 'desktop')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
        >
          {header}
        </Link>
      )}

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
    <div className="bg-white rounded-card shadow-pebble p-4 space-y-3">

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

      {/* ── Category groups (curated headings, catalog sub-lists, always expanded) ── */}
      <div className="space-y-1.5">
        {groups === null
          ? Array.from({ length: CURATED_ROOTS.length }).map((_, i) => (
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
              <RootGroup key={root.id} root={root} subs={children} />
            ))}
      </div>

    </div>
  );
}
