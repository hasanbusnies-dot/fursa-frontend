'use client';

import { AlertTriangle } from 'lucide-react';
import type { IgnoredFilter } from '@/services/listings.service';

/**
 * "Some of your filters were not applied."
 *
 * The browse API reports every catalog attribute filter it could not honour
 * (`meta.ignoredFilters`) instead of failing the request — so a filtered link shared
 * months ago still returns listings when the catalog behind it has moved on. That
 * design only pays off if the user is TOLD, otherwise a link that quietly returns the
 * unfiltered set looks like the filter is broken.
 *
 * Deliberately a quiet strip, not a modal or a toast: the results underneath are
 * correct for the filters that DID apply, so this is a footnote, not an error.
 *
 * Keys are shown raw (`rooms`, `buildingAge`) rather than translated. They are catalog
 * identifiers, and the only cases that reach here are ones where the category no longer
 * defines the key — so there is no label to look up: whatever this UI showed when the
 * link was made no longer exists. LTR-isolated so a camelCase key cannot scramble the
 * surrounding Arabic.
 */
export function IgnoredFiltersNotice({ ignored }: { ignored: IgnoredFilter[] }) {
  if (!ignored?.length) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-[13px] leading-relaxed text-amber-800">
        بعض الفلاتر لم تُطبَّق لأنها لم تعد متاحة في هذه الفئة
        <span className="mx-1 text-amber-600" dir="ltr">
          ({ignored.map((i) => i.key).join('، ')})
        </span>
        — النتائج معروضة حسب باقي الفلاتر.
      </p>
    </div>
  );
}
