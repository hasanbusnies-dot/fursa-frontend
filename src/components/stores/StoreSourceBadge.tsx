import { UserCog, Globe } from 'lucide-react';
import { storeSourceOf, type Store } from '@/services/stores.service';
import { cn } from '@/lib/utils';

/**
 * How a store application arrived — the distinction the admin needs before reviewing.
 *
 * AGENT        : a field agent registered it on paper; a signed contract photo exists
 *                and a registering agent owns the relationship.
 * SELF_SERVICE : the owner applied directly at corporate signup. NO agent and NO
 *                contract document by design — an empty contract slot on these rows is
 *                expected, not a missing document.
 *
 * Renders nothing when the payload carries neither signal, rather than guessing AGENT
 * and mislabelling a self-service application.
 */
export function StoreSourceBadge({ store, className }: { store: Store; className?: string }) {
  const source = storeSourceOf(store);
  if (!source) return null;

  const selfService = source === 'SELF_SERVICE';
  const Icon = selfService ? Globe : UserCog;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
        selfService
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
        className,
      )}
      title={selfService ? 'سجّل المالك نشاطه بنفسه عبر الموقع' : 'سجّل المتجرَ مندوبٌ ميداني'}
    >
      <Icon className="w-3 h-3" />
      {selfService ? 'تسجيل ذاتي' : 'عبر مندوب'}
    </span>
  );
}

/** True when this store came in without an agent — used to soften "no contract" copy. */
export function isSelfService(store: Store): boolean {
  return storeSourceOf(store) === 'SELF_SERVICE';
}
