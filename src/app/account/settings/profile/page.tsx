'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { usersService, type MeUser } from '@/services/users.service';
import {
  useRequireAuth, SettingsHeader, PageSkeleton, LoadError,
} from '@/components/account/settings/shared';
import {
  PhotoSection, LoginInfoSection, IndividualSection, CorporateSection,
} from '@/components/account/settings/ProfileSections';
import { DeleteAccountSection } from '@/components/account/settings/DeleteAccountSection';

export default function ProfileSettingsPage() {
  const ready = useRequireAuth('/account/settings/profile');

  const [me, setMe]       = useState<MeUser | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    usersService.getMe()
      .then(setMe)
      .catch(() => setError(true));
  }, [ready]);

  if (!ready) return <PageSkeleton />;
  if (error)  return <LoadError />;
  if (!me)    return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <SettingsHeader icon={User} title="معلوماتي" />

      {(me.userType === 'INDIVIDUAL' || me.userType === 'CORPORATE') && <PhotoSection me={me} />}

      <LoginInfoSection me={me} />

      {me.userType === 'INDIVIDUAL' && <IndividualSection me={me} />}
      {me.userType === 'CORPORATE'  && <CorporateSection me={me} />}

      {/* Last on the page, after everything a user might actually have come here to
          change. Staff accounts don't get the control at all: the backend answers
          them with 403, and offering a button that cannot work is worse than not
          offering it. */}
      {(me.userType === 'INDIVIDUAL' || me.userType === 'CORPORATE') && <DeleteAccountSection />}
    </div>
  );
}
