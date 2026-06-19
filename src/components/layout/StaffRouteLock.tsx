'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

// Staff portals are isolated: a logged-in staff member is locked to their own area and
// cannot browse the consumer site. Each portal's own layout already (a) guards entry and
// (b) hides consumer chrome on its routes — this is the missing half: it bounces a staff
// user who navigates AWAY (e.g. types `/` or clicks a stale consumer link) back to their
// portal. ADMIN is intentionally exempt (admins use admin + accounting + consumer areas).
//
// Mounted globally in the root layout; renders nothing. Client-side because the role
// lives in useAuthStore (localStorage), not in the `forsa-token` cookie, so middleware
// can't see it — consistent with every other guard in this app.
const LOCKS: Record<string, string> = {
  ACCOUNTANT: '/accounting',
  FIELD_AGENT: '/agent',
};

export function StaffRouteLock() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated || !user) return;
    const home = LOCKS[user.userType];
    // Lock only staff roles, and only when they've strayed outside their own portal.
    if (home && pathname !== home && !pathname.startsWith(home + '/')) {
      router.replace(home);
    }
  }, [mounted, isAuthenticated, user, pathname, router]);

  return null;
}
