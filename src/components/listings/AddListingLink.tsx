'use client';

import Link from 'next/link';
import { useStoreGate } from '@/store/store-gate.store';
import { cn } from '@/lib/utils';

/**
 * An "add listing" call-to-action that respects the business-approval gate.
 *
 * There are a dozen ways into /listings/create — the header CTA, the mobile bottom nav,
 * and an empty-state button on nearly every account page. The ROUTE is the real
 * chokepoint (CreateListingForm renders the «قيد المراجعة» card, and the backend 403s
 * regardless), so this component exists to stop a pending business from being invited
 * into a wizard it cannot finish.
 *
 * Locked, it renders the same children as an inert, dimmed span — same layout, no
 * navigation, and a tooltip saying why. Header / BottomNav / the dashboard CTA keep
 * their own bespoke locked treatments because they swap icon and copy, not just opacity.
 */
export function AddListingLink({
  className,
  children,
  prefetch = false,
}: {
  className?: string;
  children: React.ReactNode;
  prefetch?: boolean;
}) {
  const gate = useStoreGate();

  if (gate.locked) {
    return (
      <span
        aria-disabled
        title="قيد المراجعة — يُفتح بعد اعتماد حسابك"
        className={cn(className, 'opacity-50 cursor-not-allowed pointer-events-none')}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href="/listings/create" prefetch={prefetch} className={className}>
      {children}
    </Link>
  );
}
