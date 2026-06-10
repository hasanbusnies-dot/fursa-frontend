'use client';

import { useState } from 'react';
import { Loader2, MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/services/api';
import type { ResendSetupLinkResult } from '@/services/stores.service';
import { cn } from '@/lib/utils';

export interface ResendSetupLinkLabels {
  idle: string;          // button text before sending
  sending: string;       // while in-flight
  sent: string;          // button text after a successful resend
  success: string;       // toast on success
  alreadyActive: string; // 409 — owner already activated (toast + inline note)
  error: string;         // generic failure toast
}

/** Resend-the-owner-setup-link control with self-contained busy/done state.
 *  Shown only while the owner is still pending; on 409 it reveals that the owner has
 *  already activated and hides the action. The caller supplies the resend call (agent
 *  vs admin endpoint) and the localized labels. */
export function ResendSetupLinkButton({
  onResend,
  labels,
  className,
}: {
  onResend: () => Promise<ResendSetupLinkResult>;
  labels: ResendSetupLinkLabels;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'sent' | 'active' | null>(null);

  const click = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      await onResend();
      setDone('sent');
      toast.success(labels.success);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDone('active');
        toast.info(labels.alreadyActive);
      } else {
        toast.error(err instanceof Error ? err.message : labels.error);
      }
    } finally {
      setBusy(false);
    }
  };

  // Owner already activated → no action left; show a quiet confirmation instead.
  if (done === 'active') {
    return (
      <p className={cn('flex items-center gap-1.5 text-[11px] font-medium text-green-600', className)}>
        <MailCheck className="w-3.5 h-3.5 shrink-0" />
        {labels.alreadyActive}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy || done === 'sent'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60',
        className,
      )}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done === 'sent' ? (
        <MailCheck className="w-4 h-4" />
      ) : (
        <Send className="w-4 h-4" />
      )}
      {busy ? labels.sending : done === 'sent' ? labels.sent : labels.idle}
    </button>
  );
}
