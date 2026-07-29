'use client';

import { useState } from 'react';
import { AlertTriangle, Ban, Loader2, ShieldX, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UI_AR } from '@/lib/staff-labels';
import type { ListingAction } from '@/services/reports.service';

// Resolution dialogs for /admin/reports/[listingId]. Same overlay + cancel/confirm pair as
// RejectModal and the user-moderation modals. Both resolve EVERY open report on the
// listing in one call — ten reports is one decision.

function Shell({
  title, subtitle, tone, onClose, children,
}: {
  title: string;
  subtitle: string;
  tone: 'red' | 'gray';
  onClose: () => void;
  children: React.ReactNode;
}) {
  const Icon = tone === 'red' ? ShieldX : Ban;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tone === 'red' ? 'bg-red-50' : 'bg-gray-100')}>
              <Icon className={cn('w-4 h-4', tone === 'red' ? 'text-red-500' : 'text-gray-500')} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 truncate max-w-[240px]">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const noteCls =
  'block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 transition-colors resize-none';

// ── Dismiss ───────────────────────────────────────────────────────────────────────

export function DismissReportsModal({
  listingTitle, openCount, onClose, onConfirm,
}: {
  listingTitle: string;
  openCount: number;
  onClose: () => void;
  onConfirm: (note?: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await onConfirm(note.trim() || undefined); } finally { setSaving(false); }
  };

  return (
    <Shell title="إهمال البلاغات" subtitle={listingTitle} tone="gray" onClose={onClose}>
      <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
        <p className="font-bold text-gray-800">سيتم إغلاق {openCount} بلاغ دون اتخاذ إجراء.</p>
        <p>الإعلان يبقى كما هو، ولن يتم إشعار المُبلِّغين.</p>
      </div>

      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        ملاحظة <span className="font-normal text-gray-400">(اختياري — داخلية)</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="سبب الإهمال…"
        className={`${noteCls} focus:ring-gray-200 focus:border-gray-400`}
      />

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {UI_AR.cancel}
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          إهمال البلاغات
        </button>
      </div>
    </Shell>
  );
}

// ── Action on the listing ─────────────────────────────────────────────────────────

export function ActionListingModal({
  listingTitle, openCount, onClose, onConfirm,
}: {
  listingTitle: string;
  openCount: number;
  onClose: () => void;
  onConfirm: (action: Exclude<ListingAction, 'NONE'>, note?: string) => Promise<void>;
}) {
  const [action, setAction] = useState<Exclude<ListingAction, 'NONE'> | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    // The backend refuses ACTIONED with listingAction NONE — an "action taken" verdict
    // that changed nothing would notify every reporter that something happened.
    if (!action) { toast.error('اختر الإجراء المطلوب على الإعلان.'); return; }
    setSaving(true);
    try { await onConfirm(action, note.trim() || undefined); } finally { setSaving(false); }
  };

  const OPTIONS: { value: Exclude<ListingAction, 'NONE'>; label: string; hint: string; Icon: React.ElementType }[] = [
    { value: 'REJECT', label: 'رفض الإعلان', hint: 'يُخفى من الموقع ويُشعَر البائع بالرفض. قابل للتراجع من إدارة الإعلانات.', Icon: Ban },
    { value: 'DELETE', label: 'حذف الإعلان', hint: 'حذف ناعم — يختفي الإعلان نهائياً من الموقع.', Icon: Trash2 },
  ];

  return (
    <Shell title="اتخاذ إجراء على الإعلان" subtitle={listingTitle} tone="red" onClose={onClose}>
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">سيتم إغلاق {openCount} بلاغ باعتبارها صحيحة.</p>
          <p>سيتم إشعار كل مُبلِّغ بأنه تم اتخاذ إجراء، وإشعار البائع بقرار الإعلان.</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-700 mb-2">الإجراء على الإعلان:</p>
      <div className="space-y-1.5">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors',
              action === o.value ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50',
            )}
          >
            <input
              type="radio"
              name="listing-action"
              checked={action === o.value}
              onChange={() => setAction(o.value)}
              className="w-4 h-4 accent-red-600 shrink-0 mt-0.5"
            />
            <span className="min-w-0">
              <span className={cn('flex items-center gap-1.5 text-sm', action === o.value ? 'font-semibold text-red-800' : 'text-gray-700')}>
                <o.Icon className="w-3.5 h-3.5" />
                {o.label}
              </span>
              <span className="block text-[11px] text-gray-500 mt-0.5">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">
        ملاحظة <span className="font-normal text-gray-400">(اختياري — داخلية)</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="تفاصيل القرار…"
        className={`${noteCls} focus:ring-red-200 focus:border-red-400`}
      />

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {UI_AR.cancel}
        </button>
        <button
          onClick={submit}
          disabled={saving || !action}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          تأكيد الإجراء
        </button>
      </div>
    </Shell>
  );
}
