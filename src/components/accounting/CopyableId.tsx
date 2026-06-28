'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Subtle, copyable identifier line — name + phone are the primary human identifiers;
// the 11-digit agent code is kept small/muted here for reference/audit. Click to copy.
// (The agent UUID is never shown to the user — it's routing-only.)
export function CopyableId({ id, label = 'الرمز' }: { id: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`${label}: ${id} — انقر للنسخ`}
      dir="ltr"
      className="inline-flex items-center gap-1 max-w-full text-[10px] font-mono text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
      <span className="truncate">{label}: {id}</span>
    </button>
  );
}
