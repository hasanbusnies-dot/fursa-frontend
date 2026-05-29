'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { findCategoryNode } from '@/data/sidebar-categories';
import type { SubCategory } from '@/data/sidebar-categories';
import { cn } from '@/lib/utils';

export default function MobileCategoryDrillDown() {
  const params = useParams();
  const router = useRouter();

  const rawSlug = params?.slug;
  const slugParts: string[] =
    Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug as string] : [];

  const result = slugParts.length ? findCategoryNode(slugParts) : null;
  const isLeaf = result !== null && result.children.length === 0;

  // Desktop redirect + leaf redirect + not-found redirect (all on mount)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      router.replace('/');
      return;
    }
    if (!slugParts.length || !result) {
      router.replace('/');
      return;
    }
    if (isLeaf) {
      router.replace(result.categoryPath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Return nothing while redirecting or on desktop
  if (!result || isLeaf) return null;

  const backHref =
    slugParts.length === 1
      ? '/'
      : `/m/categories/${slugParts.slice(0, -1).join('/')}`;

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

        {/* "All listings in this category" — blue highlight row */}
        <Link
          href={result.categoryPath}
          className="flex items-center gap-3 px-4 py-4 bg-blue-50 border-b-2 border-blue-200 hover:bg-blue-100 active:bg-blue-200 transition-colors"
        >
          <span className="flex-1 text-sm font-semibold text-blue-700">
            كل إعلانات {result.title}
          </span>
          <ChevronLeft className="w-4 h-4 text-blue-400 shrink-0" />
        </Link>

        {/* Children list */}
        <div className="bg-white mt-2 rounded-t-2xl overflow-hidden">
          {result.children.map((child: SubCategory, i: number) => {
            const hasChildren = !!child.children?.length;
            const href = hasChildren
              ? `/m/categories/${child.path.replace('/category/', '')}`
              : child.path;

            return (
              <Link
                key={child.path}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors',
                  i < result.children.length - 1 && 'border-b border-gray-100',
                )}
              >
                <span className="flex-1 text-sm text-gray-800">{child.title}</span>
                {hasChildren && (
                  <span className="text-[11px] text-gray-400 shrink-0 me-1">
                    {child.children!.length}
                  </span>
                )}
                <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
