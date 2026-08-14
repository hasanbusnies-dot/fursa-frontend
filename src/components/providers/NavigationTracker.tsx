'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { recordNavigation } from '@/lib/navigation';

/**
 * Counts in-app navigations for this tab so back buttons can tell "the user
 * walked here" from "the user landed here from a shared link" — see
 * lib/navigation.ts for why the browser can't answer that itself.
 *
 * Renders nothing and mounts once, in the root layout, next to the other
 * headless providers.
 *
 * The FIRST pathname is seeded, never recorded: it is the entry point of the
 * session, not a navigation, and counting it would tell a deep-linked visitor
 * they have somewhere to go back to. A reload of a deep page re-mounts this and
 * re-seeds the same way, while the stored depth carries over untouched —
 * correctly, since reloading destroys no history entries.
 *
 * Search params are deliberately not watched. Browse syncs its filters into the
 * URL with `router.replace` (listings/page.tsx), which changes the query without
 * adding a history entry — treating those as navigations would inflate the depth
 * on every filter tap.
 */
export function NavigationTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === null) { last.current = pathname; return; } // entry point
    if (last.current === pathname) return;
    recordNavigation(last.current);
    last.current = pathname;
  }, [pathname]);

  return null;
}
