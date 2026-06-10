'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';

// Camera-only photo capture card, extracted from the store-registration contract
// flow so the cash-collection receipt capture (/agent/collect + the membership CASH
// modal) reuses the exact same pattern: a hidden <input accept="image/*"
// capture="environment"> opened by a button, an object-URL preview, and retake.
// Controlled: the parent holds the File (for validation/submit); this component owns
// the input ref + preview blob lifecycle.

interface CameraCaptureProps {
  /** The captured file (parent-owned). null ⇒ nothing captured yet. */
  file: File | null;
  /** Fires with the picked File, or null when cleared for a retake. */
  onPick: (file: File | null) => void;
  /** Card heading, e.g. "صورة إيصال الاستلام". */
  title: string;
  /** Sub-text under the heading. */
  hint?: string;
  /** Dashed-button label when no photo yet, e.g. "صوّر إيصال الاستلام". */
  captureLabel: string;
  /** Retake button label. */
  retakeLabel?: string;
  /** Alt text for the preview image. */
  previewAlt?: string;
}

export function CameraCapture({
  file,
  onPick,
  title,
  hint,
  captureLabel,
  retakeLabel = 'إعادة الالتقاط',
  previewAlt = '',
}: CameraCaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object-URL preview lifecycle — revoke the previous URL whenever the file
  // changes or the component unmounts so we don't leak blobs.
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) onPick(f);
    // Reset the value so re-picking the same file still fires onChange (retake).
    e.target.value = '';
  };

  const retake = () => { onPick(null); fileRef.current?.click(); };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-4 h-4 text-teal-600" />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {hint && <p className="text-xs text-slate-500 mb-3">{hint}</p>}

      {/* Hidden camera input — accept image + capture=environment opens the rear
          camera directly on mobile (no gallery picker where supported). */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />

      {preview ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={previewAlt}
            className="w-full rounded-xl border border-slate-200 object-contain max-h-72 bg-slate-50"
          />
          <button
            type="button"
            onClick={retake}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {retakeLabel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
        >
          <Camera className="w-8 h-8" />
          <span className="text-sm font-semibold">{captureLabel}</span>
        </button>
      )}
    </div>
  );
}
