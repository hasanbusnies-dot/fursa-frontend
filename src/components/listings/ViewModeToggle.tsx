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
import { LayoutGrid, List, Map as MapIcon } from 'lucide-react';
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

const OPTIONS: { value: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'عرض شبكي',  Icon: LayoutGrid },
  { value: 'list', label: 'عرض قائمة', Icon: List },
  { value: 'map',  label: 'عرض خريطة', Icon: MapIcon },
];

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="flex bg-white shadow-pebble rounded-card overflow-hidden">
      {OPTIONS.map(({ value: v, label, Icon }) => (
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
    </div>
  );
}
