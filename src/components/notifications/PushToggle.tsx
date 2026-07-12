'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { getPushState, subscribeToPush, unsubscribeFromPush, type PushState } from '@/lib/push';
import { cn } from '@/lib/utils';

// «تنبيهات المتصفح» switch — the durable home for push opt-in/out on the
// notifications page (the contextual PushPrompt is the other entry point).
export function PushToggle() {
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const flip = async () => {
    if (busy || state === 'loading') return;
    setBusy(true);
    try {
      if (state === 'subscribed') {
        await unsubscribeFromPush();
        setState('unsubscribed');
        toast.success('تم إيقاف تنبيهات المتصفح.');
      } else {
        await subscribeToPush();
        setState('subscribed');
        toast.success('تم تفعيل تنبيهات المتصفح.');
      }
    } catch {
      setState(await getPushState());
      toast.error('تعذّر تغيير إعداد التنبيهات.');
    } finally {
      setBusy(false);
    }
  };

  const description =
    state === 'denied'         ? 'التنبيهات محظورة من إعدادات المتصفح — فعّلها من إعدادات الموقع في متصفحك ثم أعد المحاولة.'
    : state === 'ios-install-needed' ? 'على آيفون: أضِف فرصة إلى الشاشة الرئيسية (مشاركة ← إضافة إلى الشاشة الرئيسية) لتفعيل التنبيهات.'
    : state === 'unsupported'  ? 'متصفحك لا يدعم تنبيهات الويب.'
    : 'استقبل تنبيهات انخفاض الأسعار والرسائل الجديدة حتى عندما يكون الموقع مغلقاً.';

  const toggleable = state === 'subscribed' || state === 'unsubscribed';

  return (
    <div className="bg-white rounded-card shadow-pebble px-5 py-4 mb-4 flex items-center gap-3.5">
      <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <BellRing className="w-[18px] h-[18px] text-blue-600" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">تنبيهات المتصفح</p>
        <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{description}</p>
      </div>
      {toggleable && (
        <button
          onClick={flip}
          disabled={busy}
          role="switch"
          aria-checked={state === 'subscribed'}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors shrink-0',
            state === 'subscribed' ? 'bg-blue-600' : 'bg-gray-200',
            busy && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
              // dir=rtl: the "on" position is the inline-start (right) side
              state === 'subscribed' ? 'right-0.5' : 'right-[22px]',
            )}
          />
        </button>
      )}
    </div>
  );
}
