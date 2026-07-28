'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, SearchX } from 'lucide-react';
import { catalogService, type CatalogNode, type CatalogPathNode } from '@/services/catalog.service';
import { PROMOTED_SLUGS } from '@/data/curated-categories';
import { BrandMark } from '@/components/listings/BrandMark';
import { cn } from '@/lib/utils';

// Mobile category drill-down. Catalog-driven — one level per screen, arbitrary depth,
// driven by each node's `hasChildren`.
//
// URLs carry a SINGLE catalog slug (/m/categories/<slug>), not a nested path. Catalog
// slugs are globally unique, so nesting adds nothing — and the retired hand-file
// encoded a FICTIONAL hierarchy in multi-segment paths whose last segment often wasn't
// a real slug at all (132 of 163 links 404'd; 24 more silently opened the wrong
// category). One segment makes that class of bug unrepresentable.
type Status = 'loading' | 'ready' | 'notfound';

export default function MobileCategoryDrillDown() {
  const params = useParams();
  const router = useRouter();

  const rawSlug = params?.slug;
  // Tolerate legacy multi-segment URLs (old links, bookmarks): the last segment is
  // the only one that ever identified a node.
  const slugParts: string[] =
    Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug as string] : [];
  const slug = slugParts[slugParts.length - 1] ?? '';

  const [status,   setStatus]   = useState<Status>('loading');
  const [path,     setPath]     = useState<CatalogPathNode[]>([]);
  const [children, setChildren] = useState<CatalogNode[]>([]);

  // Desktop never sees this route.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) router.replace('/');
  }, [router]);

  useEffect(() => {
    if (!slug) { router.replace('/'); return; }

    let cancelled = false;
    Promise.all([catalogService.getPath(slug), catalogService.getChildren(slug)])
      .then(([p, kids]) => {
        if (cancelled) return;
        if (!p.length) { setStatus('notfound'); return; }
        // Nodes promoted to curated top-level roots are hidden from their catalog
        // parent's children, so each is reachable in exactly one place (today:
        // car-parts-accessories, which the catalog files under vehicles).
        // Never filter the node being VIEWED — only its children.
        const visible = kids.filter((k) => !PROMOTED_SLUGS.has(k.slug) || k.slug === slug);
        // A leaf has nothing to drill into — go straight to its listings. Checked
        // against the visible set: hiding every child makes this node a leaf too.
        if (!visible.length) { router.replace(`/category/${slug}`); return; }
        setPath(p);
        setChildren(visible);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('notfound'); });

    return () => { cancelled = true; };
  }, [slug, router]);

  const title = path[path.length - 1]?.nameAr ?? '';
  // Back target comes from the breadcrumb, not from slicing the URL.
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const backHref = parent ? `/m/categories/${parent.slug}` : '/';

  return (
    // md:hidden ensures nothing bleeds onto desktop even before the redirect fires
    <div className="md:hidden min-h-screen bg-gray-100 flex flex-col">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-blue-700 text-white shadow-md">
        <div className="flex items-center h-14 px-3 gap-2">
          {/* Back button (RTL: start = right, so this is on the right side visually) */}
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="p-2 rounded-lg hover:bg-blue-600 active:bg-blue-800 transition-colors shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Centered title */}
          <h1 className="flex-1 text-center text-base font-semibold tracking-wide">
            اختر الفئة
          </h1>

          {/* Spacer to balance the back button and keep title truly centered */}
          <div className="w-9 shrink-0" />
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {status === 'loading' && (
          <div className="bg-white mt-2 rounded-t-2xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-4 border-b border-gray-100">
                <div className="h-5 w-44 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Unknown slug — say so instead of bouncing to the homepage. A silent
            redirect is what let 132 broken links hide for so long. */}
        {status === 'notfound' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <SearchX className="w-10 h-10" />
            <p className="text-base font-medium text-gray-600">الفئة غير موجودة</p>
            <code className="text-xs text-gray-300" dir="ltr">{slug}</code>
            <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
              العودة إلى الرئيسية
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* "All listings in this category" — blue highlight row */}
            <Link
              href={`/category/${slug}`}
              className="flex items-center gap-3 px-4 py-4 bg-blue-50 border-b-2 border-blue-200 hover:bg-blue-100 active:bg-blue-200 transition-colors"
            >
              {/* Long titles (up to 40 chars) can never hold one line — wrap gracefully. */}
              <span className="flex-1 text-lg font-semibold leading-snug text-blue-700">
                كل إعلانات {title}
              </span>
            </Link>

            {/* Children list */}
            <div className="bg-white mt-2 rounded-t-2xl overflow-hidden">
              {children.map((child, i) => (
                <Link
                  key={child.slug}
                  href={child.hasChildren ? `/m/categories/${child.slug}` : `/category/${child.slug}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors',
                    i < children.length - 1 && 'border-b border-gray-100',
                  )}
                >
                  {/* BRAND nodes carry a manufacturer mark — the same source the
                      add-listing picker and the browse filter use. CATEGORY nodes
                      ("سيارات للبيع") are not brands and stay text-only. */}
                  {child.type === 'BRAND' && (
                    <BrandMark name={child.name} label={child.nameAr} iconUrl={child.icon} />
                  )}
                  {/* 18px Regular — one deliberate notch under the 20px root list (denser,
                      icon-less surface; 20px would wrap every ≥24-char title). The extreme
                      leaf names wrap either way — leading-snug keeps that tidy. */}
                  <span className="flex-1 text-lg leading-snug text-gray-800">{child.nameAr}</span>
                  {/* Listing count from the catalog. NOTE: the retired hand file showed a
                      CHILD count here; this is the node's denormalized listing count. */}
                  {child.count > 0 && (
                    <span className="text-xs text-gray-400 shrink-0 me-1">
                      {child.count.toLocaleString()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
