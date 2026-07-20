'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, SearchX } from 'lucide-react';
import { catalogService, type CatalogNode } from '@/services/catalog.service';
import { CURATED_ROOTS } from '@/data/curated-categories';
import { categoryRootMeta } from '@/data/category-root-meta';
import { cn } from '@/lib/utils';

// Curated umbrella landing (/m/g/<id>) — the screen behind a curated root that
// groups several catalog roots with no catalog parent above them.
//
// «سوق المستعمل والجديد» is the case this exists for: its 11 members are all catalog
// ROOTS (parent=null), so there is no node to navigate to. Rather than invent one in
// the catalog to serve a nav decision, the grouping stays a frontend concern and this
// screen lists the members — each of which enters the normal catalog drill-down.
//
// The /m/g/ prefix keeps curated ids in their own URL namespace: a curated id can
// never be mistaken for a catalog slug, so a typo 404s loudly here instead of quietly
// resolving to an unrelated category (how `vehicles/commercial` landed in real estate).
export default function CuratedUmbrellaPage() {
  const params = useParams();
  const router = useRouter();

  const id = (Array.isArray(params?.id) ? params.id[0] : params?.id) ?? '';
  const root = CURATED_ROOTS.find((r) => r.id === id && r.group);

  const [members, setMembers] = useState<CatalogNode[] | null>(null);

  // Desktop never sees this route.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) router.replace('/');
  }, [router]);

  useEffect(() => {
    if (!root?.group) return;
    let cancelled = false;
    // One request: the catalog roots, narrowed to this umbrella's members and
    // re-ordered to the curated order (the API returns catalog sort order).
    catalogService.getChildren(null)
      .then((roots) => {
        if (cancelled) return;
        const bySlug = new Map(roots.map((n) => [n.slug, n]));
        setMembers(root.group!.map((s) => bySlug.get(s)).filter((n): n is CatalogNode => !!n));
      })
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [root]);

  return (
    <div className="md:hidden min-h-screen bg-gray-100 flex flex-col">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-blue-700 text-white shadow-md">
        <div className="flex items-center h-14 px-3 gap-2">
          {/* Back button (RTL: start = right, so this is on the right side visually) */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-blue-600 active:bg-blue-800 transition-colors shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold tracking-wide">
            {root?.label ?? 'اختر الفئة'}
          </h1>
          <div className="w-9 shrink-0" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* Unknown curated id — loud, not a silent bounce home. */}
        {!root && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <SearchX className="w-10 h-10" />
            <p className="text-base font-medium text-gray-600">الفئة غير موجودة</p>
            <code className="text-xs text-gray-300" dir="ltr">{id}</code>
            <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
              العودة إلى الرئيسية
            </Link>
          </div>
        )}

        {root && members === null && (
          <div className="bg-white mt-2 rounded-t-2xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-4 border-b border-gray-100">
                <div className="h-5 w-44 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {root && members !== null && (
          <div className="bg-white mt-2 rounded-t-2xl overflow-hidden">
            {members.map((node, i) => {
              const { icon: Icon, color, bg } = categoryRootMeta(node.slug);
              return (
                <Link
                  key={node.slug}
                  href={node.hasChildren ? `/m/categories/${node.slug}` : `/category/${node.slug}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors',
                    i < members.length - 1 && 'border-b border-gray-100',
                  )}
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="flex-1 text-lg leading-snug text-gray-800">{node.nameAr}</span>
                  {node.count > 0 && (
                    <span className="text-xs text-gray-400 shrink-0 me-1">
                      {node.count.toLocaleString()}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
