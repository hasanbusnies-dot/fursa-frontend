'use client';

import { SlidersHorizontal } from 'lucide-react';
import {
  useRequireAuth, SettingsHeader, PageSkeleton,
} from '@/components/account/settings/shared';
import { NotificationPrefsSection } from '@/components/account/settings/NotificationPrefsSection';

export default function NotificationSettingsPage() {
  const ready = useRequireAuth('/account/settings/notifications');

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <SettingsHeader icon={SlidersHorizontal} title="إعدادات التطبيق" />
      <NotificationPrefsSection />
    </div>
  );
}
