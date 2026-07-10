'use client';

import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Loader2, Plus, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  accountingService,
  type ExpenseCategory,
} from '@/services/accounting.service';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

/** Expense-category manager: list, add custom, retire (isActive), delete (with the
 *  409 guard for system/in-use categories). Calls onChanged so the parent reloads. */
export function CategoryManager({
  categories, onChanged,
}: {
  categories: ExpenseCategory[];
  onChanged: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [key, setKey]     = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const keyValid = /^[a-z][a-z0-9_]*$/i.test(key.trim());
  const canAdd = keyValid && label.trim().length > 0 && !adding;

  const add = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      await accountingService.createCategory({ key: key.trim(), label: label.trim() });
      toast.success('تمت إضافة الفئة.');
      setKey(''); setLabel('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّرت إضافة الفئة.');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (c: ExpenseCategory) => {
    setBusyId(c.id);
    try {
      await accountingService.updateCategory(c.id, { isActive: !c.isActive });
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر التحديث.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: ExpenseCategory) => {
    if (!confirm(`حذف الفئة "${c.label}"؟`)) return;
    setBusyId(c.id);
    try {
      await accountingService.deleteCategory(c.id);
      toast.success('تم حذف الفئة.');
      onChanged();
    } catch (err) {
      // 409 → system category or still in use by expenses.
      if (err instanceof ApiError && err.status === 409) {
        toast.error('لا يمكن حذف هذه الفئة (فئة نظام أو قيد الاستخدام). قم بتعطيلها بدلاً من ذلك.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'تعذّر الحذف.');
      }
    } finally {
      setBusyId(null);
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
          فئات المصروفات
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Existing categories */}
          <div className="divide-y divide-gray-50">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    {c.label}
                    {c.isSystem && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        <Lock className="w-2.5 h-2.5" /> نظام
                      </span>
                    )}
                    {!c.isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">مُعطَّل</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400" dir="ltr">{c.key}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={busyId === c.id}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {c.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  {!c.isSystem && (
                    <button
                      onClick={() => remove(c)}
                      disabled={busyId === c.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label="حذف"
                    >
                      {busyId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">إضافة فئة مخصصة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="المفتاح (مثال: ofis_kira)"
                dir="ltr"
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="التسمية (مثال: إيجار المكتب)"
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              />
            </div>
            {key !== '' && !keyValid && (
              <p className="text-xs text-red-500 mt-1.5">يجب أن يبدأ المفتاح بحرف، ويمكن أن يحتوي على أحرف وأرقام وشرطة سفلية.</p>
            )}
            <button
              onClick={add}
              disabled={!canAdd}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
