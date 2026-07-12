'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getPushState, subscribeToPush } from '@/lib/push';

// Contextual push-permission card (Phase D): appears ONLY right after the user
// favorites something (the `forsa:favorited` event from FavoriteButton) — the moment
// the pitch is honest ("know when its price drops"). Never an on-load nag; snoozed
// dismissals persist for 14 days; browser-level denial permanently silences it.

export const FAVORITED_EVENT = 'forsa:favorited';
const SNOOZE_KEY = 'forsa-push-prompt-snoozed-until';
const SNOOZE_DAYS = 14;

export function PushPrompt() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onFavorited = async () => {
      const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      if (Date.now() < snoozedUntil) return;
      if ((await getPushState()) !== 'unsubscribed') return; // supported + permission still askable
      setVisible(true);
    };

    window.addEventListener(FAVORITED_EVENT, onFavorited);
    return () => window.removeEventListener(FAVORITED_EVENT, onFavorited);
  }, [isAuthenticated]);

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 3600 * 1000));
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      setVisible(false);
      toast.success('تم تفعيل التنبيهات — سنعلمك فور انخفاض سعر إعلان في مفضلتك.');
    } catch {
      snooze(); // denied or failed — don't nag again soon
      toast.error('لم يتم تفعيل التنبيهات.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div dir="rtl" className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-[70]">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[var(--shadow-pebble-hover)] p-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5 w-[18px] h-[18px] text-blue-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">فعّل التنبيهات</p>
            <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
              لتعرف فوراً عندما ينخفض سعر إعلان في مفضلتك أو تصلك رسالة جديدة — حتى والتطبيق مغلق.
            </p>
          </div>
          <button onClick={snooze} className="p-1 rounded-lg text-gray-300 hover:text-gray-500 transition-colors" aria-label="إغلاق">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={enable}
            disabled={busy}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {busy ? 'جارٍ التفعيل…' : 'تفعيل التنبيهات'}
          </button>
          <button
            onClick={snooze}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
