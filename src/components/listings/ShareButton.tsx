'use client';

/**
 * Share a listing — OS share sheet where the platform offers one, an explicit
 * menu everywhere else.
 *
 * Only ever rendered for ACTIVE listings (see `isShareable`): the backend serves
 * every status except DELETED, so a pending or rejected ad is publicly fetchable
 * and must not be handed a share affordance.
 *
 * SECURE CONTEXT: both `navigator.share` and `navigator.clipboard` require https
 * or localhost. Over a LAN IP — which is how a phone reaches the dev server —
 * they are simply absent. The button still renders and still offers WhatsApp and
 * Telegram (plain links, no API needed); only native share and copy degrade, and
 * copy says so rather than failing silently.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  canNativeShare,
  copyToClipboard,
  listingUrl,
  shareText,
  telegramShareUrl,
  whatsAppShareUrl,
  type ShareSubject,
} from '@/lib/share';

/** WhatsApp glyph — lucide has no brand icons, and this is the primary channel
 *  for the Syrian market, so it earns a real mark rather than a generic one. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.884-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function ShareButton({
  listingId,
  subject,
  className,
}: {
  listingId: string;
  subject: ShareSubject;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Native availability is probed after mount, never during render: the server
   * has no `navigator`, so branching on it while rendering makes the first
   * client paint disagree with the server HTML and React throws a hydration
   * mismatch. `false` until mounted means both passes render the menu button.
   */
  const [native, setNative] = useState(false);
  useEffect(() => setNative(canNativeShare()), []);

  // Prefer the address the user is actually on (correct on any deploy, preview
  // or localhost); fall back to the canonical origin during SSR.
  const url =
    typeof window !== 'undefined' ? window.location.href : listingUrl(listingId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleClick() {
    if (native) {
      try {
        // `text` deliberately excludes the URL — several Android targets append
        // `url` to `text`, which would send the link twice.
        await navigator.share({ title: subject.title, text: shareText(subject), url });
        return;
      } catch (err) {
        // AbortError = the user dismissed the sheet. That is a normal outcome,
        // not a failure, and must not fall through to opening our menu.
        if (err instanceof Error && err.name === 'AbortError') return;
        // Anything else (share unsupported for this payload, permission policy)
        // → fall back to the menu rather than dead-ending.
      }
    }
    setOpen((o) => !o);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('تم نسخ الرابط');
      setOpen(false);
    } else {
      // Almost always an insecure origin (LAN IP) rather than a real fault.
      toast.error('تعذّر نسخ الرابط — يتطلب اتصالاً آمناً (HTTPS).');
    }
  }

  const itemCls =
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup={native ? undefined : 'menu'}
        aria-expanded={native ? undefined : open}
        aria-label="مشاركة الإعلان"
        className={cn(
          // Soft/muted green — a positive action that still sits quietly beside the
          // red report button.
          'flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5',
          'text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300',
          className,
        )}
      >
        <Share2 className="h-4 w-4" />
        مشاركة
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-40 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg end-0"
        >
          <button type="button" role="menuitem" onClick={handleCopy} className={itemCls}>
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            نسخ الرابط
          </button>

          <a
            role="menuitem"
            href={whatsAppShareUrl(subject, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
            واتساب
          </a>

          <a
            role="menuitem"
            href={telegramShareUrl(subject, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            <Send className="h-4 w-4 shrink-0 text-[#229ED9]" />
            تيليغرام
          </a>
        </div>
      )}
    </div>
  );
}
