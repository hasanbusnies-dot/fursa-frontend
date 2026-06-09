'use client';

import { useEffect, useState } from 'react';
import { FileImage, ImageOff, X, AlertTriangle } from 'lucide-react';

// Compact contract-document trigger + full-screen lightbox, shared by the agent
// (Arabic/RTL) and admin (Turkish/LTR) store screens. Each side passes its own
// labels; the overlay itself is language-agnostic. No external lightbox lib —
// just a state toggle + a fixed overlay.

interface ContractDocProps {
  /** Signed, time-limited contract-photo URL (or null when there's no contract). */
  url: string | null;
  /** Trigger label, e.g. "عرض العقد" / "Sözleşmeyi Görüntüle". */
  label: string;
  /** Empty-state label, e.g. "لا يوجد عقد" / "Sözleşme yok". */
  emptyLabel: string;
  /** Message shown if the (expired) signed URL fails to load. */
  expiredLabel: string;
  /** Alt text for the image. */
  alt?: string;
  dir?: 'rtl' | 'ltr';
}

export function ContractDoc({
  url, label, emptyLabel, expiredLabel, alt = '', dir = 'ltr',
}: ContractDocProps) {
  const [open, setOpen]       = useState(false);
  const [failed, setFailed]   = useState(false);

  // Escape-to-close + lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // No contract → muted, non-interactive state (no broken icon).
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <ImageOff className="w-4 h-4 shrink-0" />
        {emptyLabel}
      </span>
    );
  }

  const openLightbox = () => { setFailed(false); setOpen(true); };

  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
      >
        <FileImage className="w-4 h-4 text-teal-600 shrink-0" />
        {label}
      </button>

      {open && (
        <div
          dir={dir}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {failed ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-2 text-center text-white/90 max-w-xs"
            >
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm font-medium">{expiredLabel}</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              onError={() => setFailed(true)}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      )}
    </>
  );
}
