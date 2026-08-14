'use client';

/**
 * The browse view selector — grid / list / map — and the URL state behind it.
 *
 * Shared by `/listings` and `/category/[...slug]`, which had two byte-identical
 * copies of the grid/list segment. Adding a third option to both copies is
 * exactly the kind of edit that lands in one and not the other, so the control
 * moved here first.
 *
 * ── Why only `map` lives in the URL ─────────────────────────────────────────
 * Grid-vs-list is a display preference: it survives a refresh badly at worst,
 * and nobody sends someone a link meaning "look at this as a table". A MAP is a
 * different view of the result set — worth sharing, worth bookmarking, worth
 * surviving a reload — and the filters are already in the URL beside it, so
 * `?view=map` makes the whole thing one link. Grid/list stay local state.
 *
 * ── The `?view=` collision ──────────────────────────────────────────────────
 * `/category` already used `?view=listings` for something else entirely: it
 * forces the LISTINGS view on a branch node that would otherwise render the
 * drill-down box. Both values answer "what should this page show", so they share
 * the param rather than fighting over it — but leaving map view on a branch has
 * to restore `view=listings` instead of dropping the param, or the user lands
 * back in the category drill-down they never asked to leave. That is what
 * `offValue` is for; `/listings` has no such state and passes nothing.
 */

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list' | 'map';

export const VIEW_PARAM = 'view';
export const MAP_VIEW_VALUE = 'map';

/**
 * Reads/writes `?view=map`.
 *
 * `replace`, not `push`, to match every other control on these pages (filters,
 * sort, currency): toggling a view is not a place you navigate to, and pushing
 * would make Back walk backwards through view changes instead of leaving the
 * search.
 *
 * `page` is dropped on every change — a map is not paginated, and a stale
 * `page=4` would otherwise be waiting when the user switches back to the list.
 */
export function useMapViewParam(opts?: { offValue?: string }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const offValue     = opts?.offValue;

  const isMap = searchParams.get(VIEW_PARAM) === MAP_VIEW_VALUE;

  const setMapView = useCallback(
    (on: boolean) => {
      const p = new URLSearchParams(searchParams.toString());
      if (on)             p.set(VIEW_PARAM, MAP_VIEW_VALUE);
      else if (offValue)  p.set(VIEW_PARAM, offValue);
      else                p.delete(VIEW_PARAM);
      p.delete('page');
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, offValue],
  );

  return { isMap, setMapView };
}

/**
 * Grid and list only — the two DISPLAY preferences, and the reason they are
 * quiet: swapping cards for rows is a matter of taste, and nobody needs to be
 * told the option exists. The map is not one of these; see below.
 */
const DISPLAY_OPTIONS: { value: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'عرض شبكي',  Icon: LayoutGrid },
  { value: 'list', label: 'عرض قائمة', Icon: List },
];

/**
 * ── Why the map segment is loud and the other two are not ────────────────────
 *
 * As three identical grey icons, the map was invisible: users browsed past it
 * without learning the view existed (founder's report). It is not a display
 * preference like grid/list — it is a FEATURE, and an undiscovered feature is
 * the same as a missing one. So it gets what the other two deliberately don't:
 *
 *   · a written label «خريطة» — the only text in the control, which is exactly
 *     what makes the eye land on it. Icon-only was the whole problem.
 *   · brand blue rather than grey, so it reads as an offer instead of as a
 *     disabled-looking glyph.
 *   · MapPinned over the plain folded-map glyph — pins on a map say "the ads
 *     are ON here", which is what the view actually shows.
 *
 * Deliberately NOT orange: that is the CTA colour (نشر إعلان, favourites), and
 * spending it on a view switch would flatten the one signal the page reserves
 * for actions. Blue is the app's navigational colour and is already the map's
 * own cluster colour, so the control matches what it opens.
 */
export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  const mapActive = value === 'map';

  return (
    <div className="flex items-stretch bg-white shadow-pebble rounded-card overflow-hidden">
      {DISPLAY_OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'p-2 transition-colors',
            value === v ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600',
          )}
          title={label}
          aria-label={label}
          aria-pressed={value === v}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <button
        onClick={() => onChange('map')}
        className={cn(
          // border-s, not border-l: the divider belongs on the edge facing the
          // list button, which is the RIGHT edge in this RTL layout.
          'flex items-center gap-1.5 px-2.5 text-xs font-bold border-s transition-colors',
          mapActive
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
        )}
        title="عرض خريطة"
        aria-label="عرض خريطة"
        aria-pressed={mapActive}
      >
        <MapPinned className="w-4 h-4 shrink-0" />
        خريطة
      </button>
    </div>
  );
}
