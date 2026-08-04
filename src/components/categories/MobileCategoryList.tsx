import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { CURATED_ROOTS, curatedHref } from '@/data/curated-categories';

// Mobile homepage category nav (md:hidden). Renders the founder's CURATED 10 roots —
// his labels, order and grouping — from `curated-categories.ts`.
//
// No fetch: labels and subtitles are curated text and every destination is a real
// catalog slug (or an umbrella id), so this stays a static server component and the
// list paints instantly. The catalog takes over the moment the user taps through —
// the drill-down and every level below it are catalog-driven.
export function MobileCategoryList() {
  return (
    <div className="md:hidden mb-4">
      <div className="bg-white rounded-card shadow-pebble overflow-hidden">

        {/* Quick links row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 overflow-x-auto no-scrollbar">
          <Link
            href="/listings?showcase=urgent_showcase"
            className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
          >
            <span>🚨</span>
            <span>عاجل</span>
          </Link>
          <span className="text-gray-200">|</span>
          <Link href="/listings?showcase=last_48h" className="shrink-0 text-sm text-blue-600 hover:underline whitespace-nowrap">
            آخر 48 ساعة
          </Link>
          <Link href="/listings?showcase=one_week" className="shrink-0 text-sm text-blue-600 hover:underline whitespace-nowrap">
            آخر أسبوع
          </Link>
          <Link href="/listings" className="flex items-center gap-1 shrink-0 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap">
            <LayoutGrid className="w-3.5 h-3.5" />
            كل الإعلانات
          </Link>
        </div>

        {/* Category list — 56px icon box sets the 88px row height; the two-line text
            column (28px label + 18px subtitle) stays shorter, so the subtitle costs
            zero scroll. */}
        {CURATED_ROOTS.map((root, i) => {
          const Icon = root.icon;
          return (
            <Link
              key={root.id}
              href={curatedHref(root, 'mobile')}
              className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors${
                i < CURATED_ROOTS.length - 1 ? ' border-b border-gray-100' : ''
              }`}
            >
              {/* Saturated solid CIRCLE + white glyph (sahibinden reference). Phosphor
                  weight="fill" renders a SOLID pictogram (not an outline) — the whole
                  point of moving off lucide, which is line-only. */}
              <div className={`w-14 h-14 rounded-full ${root.fill} flex items-center justify-center shrink-0`}>
                <Icon weight="fill" className="w-7 h-7 text-white" />
              </div>
              {/* min-w-0: without it the flex child refuses to shrink and truncate is a
                  silent no-op — the classic flexbox ellipsis failure. */}
              <div className="flex-1 min-w-0">
                {/* text-xl + TRUE Medium 500: Tajawal has no 600, so font-semibold silently
                    renders faux-resolved Bold 700 — whose 20px width breaks the one-line
                    budget (220px vs 224px available). Medium's worst case is 211px. */}
                <p className="text-xl font-medium text-gray-800">{root.label}</p>
                {/* Curated teaser (sahibinden pattern); dir=rtl puts the ellipsis at the
                    inline-end (visually left). Every root's line overflows — the ellipsis
                    is the normal state, not the edge case. */}
                <p className="text-[13px] text-gray-400 leading-tight truncate mt-0.5">
                  {root.subtitle}
                </p>
              </div>
            </Link>
          );
        })}

      </div>
    </div>
  );
}
