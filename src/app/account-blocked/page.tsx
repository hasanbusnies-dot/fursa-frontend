'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountBlockedNotice } from '@/components/auth/AccountBlockedNotice';
import { takeAccountBlock, type AccountBlock } from '@/lib/account-block';

/**
 * Where a MID-SESSION freeze lands. api.ts catches the blocked code on a live request,
 * clears the session, stashes the code + reason, and hard-navigates here — so the user
 * gets the explanation instead of a silent bounce to /login with an English toast.
 *
 * Reached only via that redirect: the payload lives in sessionStorage and is consumed on
 * read, so a direct visit (or a refresh after reading) has nothing to show and goes to
 * /login rather than displaying a stale or invented block.
 */
export default function AccountBlockedPage() {
  const router = useRouter();
  const [block, setBlock] = useState<AccountBlock | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const b = takeAccountBlock();
    if (!b) {
      router.replace('/login');
      return;
    }
    setBlock(b);
    setChecked(true);
  }, [router]);

  if (!checked || !block) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <AccountBlockedNotice code={block.code} reason={block.reason} />
      </div>
    </div>
  );
}
