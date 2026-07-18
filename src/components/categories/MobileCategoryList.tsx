import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { SIDEBAR_CATEGORIES } from '@/data/sidebar-categories';

// Mobile homepage category nav (md:hidden). Derived ENTIRELY from SIDEBAR_CATEGORIES —
// the same data the /m/categories drill-down walks — so the homepage can never drift
// from the catalog data (it previously kept its own duplicate title/icon array).
export function MobileCategoryList() {
  return (
    <div className="md:hidden mb-4">
      <div className="bg-white rounded-card shadow-pebble overflow-hidden">

        {/* Quick links row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-none">
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
        {SIDEBAR_CATEGORIES.map(({ slug, title, icon: Icon, iconColor, iconBg, children }, i) => (
          <Link
            key={slug}
            href={`/m/categories/${slug}`}
            className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors${
              i < SIDEBAR_CATEGORIES.length - 1 ? ' border-b border-gray-100' : ''
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-7 h-7 ${iconColor}`} />
            </div>
            {/* min-w-0: without it the flex child refuses to shrink and truncate is a
                silent no-op — the classic flexbox ellipsis failure. */}
            <div className="flex-1 min-w-0">
              {/* text-xl + TRUE Medium 500: Tajawal has no 600, so font-semibold silently
                  renders faux-resolved Bold 700 — whose 20px width breaks the one-line
                  budget (220px vs 224px available). Medium's worst case is 211px. */}
              <p className="text-xl font-medium text-gray-800">{title}</p>
              {/* Direct children as a one-line teaser (sahibinden pattern); dir=rtl puts
                  the ellipsis at the inline-end (visually left). Every root's line
                  overflows — the ellipsis is the normal state, not the edge case. */}
              {children.length > 0 && (
                <p className="text-[13px] text-gray-400 leading-tight truncate mt-0.5">
                  {children.map((c) => c.title).join('، ')}
                </p>
              )}
            </div>
          </Link>
        ))}

      </div>
    </div>
  );
}
