'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound, Eye, EyeOff, Check, X, Loader2,
  Smartphone, Monitor, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { usersService, type UserSession } from '@/services/users.service';
import { timeAgoAr } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { inputCls, Field, SectionCard, SaveButton, arabicApiMessage } from './shared';

// ── ③ Password change ──────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, error, autoComplete }: {
  value: string; onChange: (v: string) => void; error?: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls(error)} pe-10`}
        dir="ltr"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  const checks = [
    { label: '8 أحرف على الأقل',        ok: next.length >= 8 },
    { label: 'حرف كبير واحد على الأقل (A–Z)', ok: /[A-Z]/.test(next) },
    { label: 'رقم واحد على الأقل (0–9)',       ok: /[0-9]/.test(next) },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = 'أدخل كلمة المرور الحالية.';
    if (checks.some((c) => !c.ok)) errs.next = 'كلمة المرور الجديدة لا تحقق الشروط أدناه.';
    if (confirm !== next) errs.confirm = 'كلمتا المرور غير متطابقتين.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await usersService.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      toast.success('تم تغيير كلمة المرور بنجاح.');
    } catch (err) {
      const msg = arabicApiMessage(err, 'تعذّر تغيير كلمة المرور — حاول مجدداً.');
      if (msg.includes('الحالية')) setErrors({ current: msg });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard icon={KeyRound} title="تغيير كلمة المرور" subtitle="اختر كلمة مرور قوية لا تستخدمها في مكان آخر.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <Field label="كلمة المرور الحالية" required error={errors.current}>
              <PasswordInput value={current} onChange={setCurrent} error={errors.current} autoComplete="current-password" />
            </Field>
          </div>
          <Field label="كلمة المرور الجديدة" required error={errors.next}>
            <PasswordInput value={next} onChange={setNext} error={errors.next} autoComplete="new-password" />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة" required error={errors.confirm}>
            <PasswordInput value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
          </Field>
        </div>

        {/* Live policy checklist */}
        <ul className="space-y-1">
          {checks.map((c) => (
            <li key={c.label} className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-green-600' : 'text-gray-400')}>
              {c.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              {c.label}
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <SaveButton saving={saving} label="تغيير كلمة المرور" />
        </div>
      </form>
    </SectionCard>
  );
}

// ── ⑤ Logged-in devices (active refresh-token sessions) ────────────────────────

function parseUserAgent(ua?: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: 'جهاز غير معروف', mobile: false };
  const browser =
    /edg\//i.test(ua)    ? 'Edge'    :
    /opr\//i.test(ua)    ? 'Opera'   :
    /firefox/i.test(ua)  ? 'Firefox' :
    /chrome/i.test(ua)   ? 'Chrome'  :
    /safari/i.test(ua)   ? 'Safari'  : 'متصفح';
  const os =
    /windows/i.test(ua)      ? 'Windows' :
    /android/i.test(ua)      ? 'Android' :
    /iphone|ipad/i.test(ua)  ? 'iOS'     :
    /mac os/i.test(ua)       ? 'macOS'   :
    /linux/i.test(ua)        ? 'Linux'   : '';
  return {
    label: os ? `${browser} على ${os}` : browser,
    mobile: /android|iphone|ipad|mobile/i.test(ua),
  };
}

export function SessionsSection() {
  const router = useRouter();
  const [sessions, setSessions]   = useState<UserSession[] | null>(null);
  const [error, setError]         = useState(false);
  const [busyId, setBusyId]       = useState<string | null>(null); // session being revoked ('ALL' for logout-all)
  const [confirmId, setConfirmId] = useState<string | null>(null); // two-click confirm ('ALL' or current session id)

  useEffect(() => {
    usersService.getSessions(useAuthStore.getState().refreshToken)
      .then(setSessions)
      .catch(() => setError(true));
  }, []);

  function localLogout() {
    useAuthStore.getState().logout();
    router.replace('/login');
  }

  async function revoke(s: UserSession) {
    // Revoking THIS device logs you out — ask for a second click first.
    if (s.current && confirmId !== s.id) { setConfirmId(s.id); return; }
    setBusyId(s.id);
    try {
      await usersService.revokeSession(s.id);
      if (s.current) { localLogout(); return; }
      setSessions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
      toast.success('تم تسجيل الخروج من الجهاز.');
    } catch {
      toast.error('تعذّر تسجيل الخروج من الجهاز — حاول مجدداً.');
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function logoutAll() {
    if (confirmId !== 'ALL') { setConfirmId('ALL'); return; }
    setBusyId('ALL');
    try {
      await usersService.logoutAllDevices();
      localLogout();
    } catch {
      toast.error('تعذّر تسجيل الخروج من جميع الأجهزة — حاول مجدداً.');
      setBusyId(null);
      setConfirmId(null);
    }
  }

  return (
    <SectionCard
      icon={Monitor}
      title="الأجهزة المسجّل دخولها"
      subtitle="كل جلسة نشطة على حسابك — سجّل الخروج من أي جهاز لا تعرفه."
    >
      {error ? (
        <p className="text-sm text-gray-400 py-4 text-center">تعذّر تحميل الجلسات — أعد تحميل الصفحة.</p>
      ) : sessions === null ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">لا توجد جلسات نشطة.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {sessions.map((s) => {
              const { label, mobile } = parseUserAgent(s.userAgent);
              const DeviceIcon = mobile ? Smartphone : Monitor;
              const confirming = confirmId === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <DeviceIcon className="w-4.5 h-4.5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span className="truncate">{label}</span>
                      {s.current && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                          هذا الجهاز
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {s.ipAddress && <span dir="ltr">{s.ipAddress}</span>}
                      {s.ipAddress && ' · '}
                      آخر نشاط {timeAgoAr(s.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(s)}
                    disabled={busyId !== null}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0',
                      confirming
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-red-500 hover:bg-red-50',
                      busyId !== null && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {busyId === s.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <LogOut className="w-3.5 h-3.5" />}
                    {confirming ? 'تأكيد — سيتم إخراجك' : 'تسجيل الخروج'}
                  </button>
                </div>
              );
            })}
          </div>

          {sessions.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={logoutAll}
                disabled={busyId !== null}
                className={cn(
                  'inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border transition-colors',
                  confirmId === 'ALL'
                    ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                    : 'border-red-200 text-red-500 hover:bg-red-50',
                  busyId !== null && 'opacity-50 cursor-not-allowed',
                )}
              >
                {busyId === 'ALL'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <LogOut className="w-3.5 h-3.5" />}
                {confirmId === 'ALL'
                  ? 'تأكيد — سيتم إخراجك من هذا الجهاز أيضاً'
                  : 'تسجيل الخروج من جميع الأجهزة'}
              </button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
