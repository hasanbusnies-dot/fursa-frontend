'use client';

import { useEffect, useState } from 'react';
import { Bell, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  usersService,
  type NotificationPrefKey,
  type NotificationPrefMatrix,
} from '@/services/users.service';
import { cn } from '@/lib/utils';
import { SectionCard } from './shared';

// ── ④ Notification preferences (settings Phase 3) ──────────────────────────────

const PREF_ROWS: { key: NotificationPrefKey; label: string; desc: string }[] = [
  { key: 'NEW_MESSAGE',    label: 'الرسائل الجديدة',   desc: 'عند وصول رسالة جديدة في محادثاتك.' },
  { key: 'PRICE_DROP',     label: 'انخفاض الأسعار',    desc: 'عند انخفاض سعر إعلان في مفضلتك.' },
  { key: 'LISTING_CTA',    label: 'تذكيرات التصفح',    desc: 'تذكير بإعلانات شاهدتها مؤخراً.' },
  { key: 'LISTING_STATUS', label: 'حالة إعلاناتك',     desc: 'نتيجة مراجعة إعلاناتك (نشر أو رفض).' },
];

// Same switch idiom as PushToggle — dir=rtl: the "on" knob sits inline-start (right).
function PrefSwitch({ checked, disabled, label, onFlip }: {
  checked: boolean; disabled: boolean; label: string; onFlip: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onFlip}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        checked ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
          checked ? 'right-0.5' : 'right-[22px]',
        )}
      />
    </button>
  );
}

export function NotificationPrefsSection() {
  const [matrix, setMatrix] = useState<NotificationPrefMatrix | null>(null);
  const [error, setError]   = useState(false);
  const [busy, setBusy]     = useState(false); // single-flight: one PATCH at a time

  useEffect(() => {
    usersService.getNotificationPrefs()
      .then(setMatrix)
      .catch(() => setError(true));
  }, []);

  async function flip(key: NotificationPrefKey, channel: 'inApp' | 'push') {
    if (!matrix || busy) return;
    setBusy(true);
    try {
      // PATCH one toggle; the response is the full normalized matrix (e.g. turning
      // in-app off also collapses push) — always replace local state with it.
      const next = await usersService.patchNotificationPrefs({
        [key]: { [channel]: !matrix[key][channel] },
      });
      setMatrix(next);
    } catch {
      toast.error('تعذّر حفظ الإعداد — حاول مجدداً.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard icon={Bell} title="تفضيلات الإشعارات" subtitle="اختر ما يصلك من إشعارات وأين يصلك.">
      {error ? (
        <p className="text-sm text-gray-400 py-4 text-center">تعذّر تحميل التفضيلات — أعد تحميل الصفحة.</p>
      ) : matrix === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-x-2">
            {/* column headers */}
            <span />
            <span className="text-[11px] font-semibold text-gray-400 text-center pb-2">داخل الموقع</span>
            <span className="text-[11px] font-semibold text-gray-400 text-center pb-2">إشعارات الجهاز</span>

            {PREF_ROWS.map(({ key, label, desc }) => {
              const entry = matrix[key];
              return (
                <div key={key} className="contents">
                  <div className="py-3 border-t border-gray-50 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className="py-3 border-t border-gray-50 flex justify-center">
                    {entry.inAppLocked ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full"
                        title="إشعارات مراجعة إعلاناتك داخل الموقع مفعّلة دائماً."
                      >
                        <Lock className="w-3 h-3" />
                        دائماً
                      </span>
                    ) : (
                      <PrefSwitch
                        checked={entry.inApp}
                        disabled={busy}
                        label={`${label} — داخل الموقع`}
                        onFlip={() => flip(key, 'inApp')}
                      />
                    )}
                  </div>
                  <div className="py-3 border-t border-gray-50 flex justify-center">
                    <PrefSwitch
                      checked={entry.push}
                      // push is a sub-toggle: dead while in-app is off (backend 400s push:true there)
                      disabled={busy || !entry.inApp}
                      label={`${label} — إشعارات الجهاز`}
                      onFlip={() => flip(key, 'push')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400 leading-5">
            «إشعارات الجهاز» تصلك عبر تنبيهات المتصفح حتى والموقع مغلق — فعّلها من صفحة الإشعارات إن لم تكن مفعّلة.
            إيقاف «داخل الموقع» يوقف الإشعار كلياً.
          </p>
        </>
      )}
    </SectionCard>
  );
}
