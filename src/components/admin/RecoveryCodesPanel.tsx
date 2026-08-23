'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, Check, Copy, Download, KeyRound, Loader2, ShieldCheck,
} from 'lucide-react';

/**
 * The one-time recovery-code hand-off.
 *
 * These ten codes are bcrypt-hashed the moment they are issued: the server CANNOT show
 * them again, and neither can a support request or a database query. This panel is the
 * only moment they will ever exist in readable form, which is why leaving it is gated on
 * an explicit acknowledgement rather than a link the admin can click past.
 *
 * Four guards, because the cost of losing these is an account recoverable only by SQL
 * surgery:
 *   1. The continue button is disabled until the checkbox is ticked — no accidental
 *      "next, next, next" past the codes.
 *   2. `beforeunload` catches the browser-level exits — closing the tab, reloading, back.
 *   3. A capture-phase click guard catches in-app link navigation, which beforeunload
 *      cannot see at all.
 *   4. Copy and download are offered before the gate, so acknowledging is a statement
 *      about something the admin has actually done.
 */
export function RecoveryCodesPanel({
  codes,
  onAcknowledge,
  continuing = false,
}: {
  codes: string[];
  onAcknowledge: () => void;
  continuing?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  /** Set once the admin has confirmed a deliberate exit, so the two guards below don't
   *  both prompt for the same departure. */
  const leaving = useRef(false);

  // Guard the browser-level exits — closing the tab, reloading, the back button.
  // Registered only while the codes are unacknowledged; once the admin confirms they have
  // them, leaving is expected and a spurious "are you sure" just trains them to dismiss it.
  useEffect(() => {
    if (saved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      // Modern browsers show their own generic wording; returnValue is the legacy hook.
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saved]);

  // Guard the IN-APP exits, which beforeunload cannot see: client-side navigation never
  // unloads the document. This matters specifically here because the consumer Header is
  // NOT hidden on /admin the way it is on /agent and /accounting — so a stray click on
  // «الرئيسية» would silently destroy the only copy of these codes.
  //
  // Capture phase, so it runs before Next's own Link handler.
  useEffect(() => {
    if (saved) return;
    const onClickCapture = (e: MouseEvent) => {
      if (leaving.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

      const href = anchor.getAttribute('href') ?? '';
      if (!href || href.startsWith('#')) return;

      e.preventDefault();
      e.stopPropagation();
      const go = window.confirm(
        'لم تؤكّد حفظ رموز الاسترداد.\n\nإذا غادرت الآن فلن تتمكن من استعادتها أبداً. هل تريد المغادرة؟',
      );
      if (go) {
        leaving.current = true;
        window.location.href = anchor.href;
      }
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [saved]);

  const asText = [
    'رموز استرداد حساب الإدارة — فرصة',
    `صدرت بتاريخ: ${new Date().toLocaleString('ar-SY')}`,
    '',
    'كل رمز يُستخدم مرة واحدة فقط. احتفظ بهذا الملف في مكان آمن.',
    'لن يتم عرض هذه الرموز مرة أخرى.',
    '',
    ...codes.map((c, i) => `${String(i + 1).padStart(2, '0')}.  ${c}`),
    '',
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      toast.success('تم نسخ الرموز العشرة.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذّر النسخ — حدّد الرموز وانسخها يدوياً، أو نزّل الملف.');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([`﻿${asText}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'forsa-admin-recovery-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      toast.success('تم تنزيل ملف الرموز.');
    } catch {
      toast.error('تعذّر التنزيل — انسخ الرموز بدلاً من ذلك.');
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
      {/* Header strip — amber, not the usual blue: this is a "stop and act" screen. */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-6 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-white tracking-tight">رموز الاسترداد</h1>
          <p className="text-amber-100 text-xs mt-0.5">احفظها الآن — لن تظهر مرة أخرى</p>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* What these are and why this screen is different */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm text-amber-200 leading-relaxed">
              هذه الرموز هي الطريقة الوحيدة لاستعادة حساب الإدارة إذا نسيت كلمة المرور.
            </p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              كل رمز يُستخدم مرة واحدة فقط. الرموز مُشفّرة في قاعدة البيانات، لذلك
              <strong className="font-semibold"> لا يمكن عرضها مرة أخرى </strong>
              ولا استخراجها لاحقاً — لا عبر الدعم ولا عبر قاعدة البيانات.
            </p>
          </div>
        </div>

        {/* The codes. dir=ltr: the codes are Latin/numeric, and an RTL container would
            reorder the dash-separated groups on screen. */}
        <div
          dir="ltr"
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-900/70 border border-slate-700 p-4"
        >
          {codes.map((code, i) => (
            <div key={code} className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-slate-600 w-5 shrink-0 text-right tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <code className="font-mono text-sm text-slate-100 tracking-[0.12em] select-all">
                {code}
              </code>
            </div>
          ))}
        </div>

        {/* Save actions — offered BEFORE the gate, so ticking it means something */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'تم النسخ' : 'نسخ الرموز'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition-colors"
          >
            {downloaded ? <Check className="w-4 h-4 text-green-400" /> : <Download className="w-4 h-4" />}
            {downloaded ? 'تم التنزيل' : 'تنزيل كملف نصي'}
          </button>
        </div>

        {/* The gate */}
        <label className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-900/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          />
          <span className="text-sm text-slate-200 font-medium leading-relaxed select-none">
            لقد حفظت رموز الاسترداد في مكان آمن
          </span>
        </label>

        <button
          type="button"
          onClick={onAcknowledge}
          disabled={!saved || continuing}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {continuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {continuing ? 'جارٍ الدخول…' : 'المتابعة إلى لوحة الإدارة'}
        </button>

        {!saved && (
          <p className="text-center text-xs text-slate-500 leading-relaxed">
            أكّد حفظ الرموز أولاً. إذا غادرت هذه الصفحة بدونها فلن تتمكن من استعادتها.
          </p>
        )}
      </div>
    </div>
  );
}
