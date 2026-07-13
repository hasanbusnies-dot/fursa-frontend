'use client';

import { ShieldCheck } from 'lucide-react';
import {
  useRequireAuth, SettingsHeader, PageSkeleton,
} from '@/components/account/settings/shared';
import { PasswordSection, SessionsSection } from '@/components/account/settings/SecuritySections';

export default function SecuritySettingsPage() {
  const ready = useRequireAuth('/account/settings/security');

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <SettingsHeader icon={ShieldCheck} title="أمان الحساب" />
      <PasswordSection />
      <SessionsSection />
    </div>
  );
}
