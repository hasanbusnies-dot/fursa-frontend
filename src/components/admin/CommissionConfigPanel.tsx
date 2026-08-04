'use client';

import { useEffect, useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCommissionsService,
  type CommissionConfig,
} from '@/services/admin-commissions.service';
import { ApiError } from '@/services/api';
import { UI_AR } from '@/lib/staff-labels';

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

/** Collapsible commission-config editor. Loads the current config on first expand,
 *  PUTs both fields on save, then calls onSaved so the parent refetches the report
 *  (commission is computed on read — the new config must be reflected immediately). */
export function CommissionConfigPanel({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen]       = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [threshold, setThreshold] = useState('');
  const [amount, setAmount]       = useState('');

  // Lazy-load the current config the first time the panel is opened.
  useEffect(() => {
    if (!open || loaded || loading) return;
    setLoading(true);
    adminCommissionsService.getConfig()
      .then((c) => {
        setThreshold(String(c.thresholdPaymentsPerPeriod ?? ''));
        setAmount(c.amountPerPaymentUsd ?? '');
        setLoaded(true);
      })
      .catch(() => toast.error('تعذّر تحميل الإعدادات.'))
      .finally(() => setLoading(false));
  }, [open, loaded, loading]);

  const thresholdValid = /^\d+$/.test(threshold.trim());
  const amountValid    = MONEY_RE.test(amount.trim());
  const valid = thresholdValid && amountValid;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload: CommissionConfig = {
        thresholdPaymentsPerPeriod: parseInt(threshold.trim(), 10),
        amountPerPaymentUsd: amount.trim(),
      };
      const saved = await adminCommissionsService.updateConfig(payload);
      setThreshold(String(saved.thresholdPaymentsPerPeriod ?? payload.thresholdPaymentsPerPeriod));
      setAmount(saved.amountPerPaymentUsd ?? payload.amountPerPaymentUsd);
      toast.success('تم تحديث إعدادات العمولة.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر حفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white shadow-pebble rounded-card mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Settings className="w-4 h-4 text-gray-500" />
          إعدادات العمولة
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    العتبة (دفعات لكل فترة)
                  </label>
                  <input
                    inputMode="numeric"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="مثال: 10"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-start focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                  {threshold !== '' && !thresholdValid && (
                    <p className="text-xs text-red-500 mt-1.5">أدخل عدداً صحيحاً غير سالب.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    المبلغ لكل دفعة (USD)
                  </label>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="مثال: 2.50"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-start focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                  {amount !== '' && !amountValid && (
                    <p className="text-xs text-red-500 mt-1.5">أدخل مبلغاً صحيحاً (خانتان عشريتان كحد أقصى).</p>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                تُحتسب العمولة وقت القراءة وفق الإعدادات الحالية — والحفظ يعيد
                حساب المبالغ في التقرير.
              </p>

              <button
                onClick={save}
                disabled={!valid || saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? UI_AR.saving : UI_AR.save}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
