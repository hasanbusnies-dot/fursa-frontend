'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Receipt, Plus, Loader2, AlertTriangle, Inbox, Pencil, Trash2, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PeriodPicker } from '@/components/accounting/PeriodPicker';
import { CategoryManager } from '@/components/accounting/CategoryManager';
import {
  accountingService,
  type Expense,
  type ExpenseCategory,
  type AccountingQuery,
} from '@/services/accounting.service';
import type { PageMeta } from '@/services/stores.service';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { UI_AR, expenseCategoryLabel } from '@/lib/staff-labels';

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const CURRENCIES = ['SYP', 'USD', 'EUR'] as const;

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Add / edit form ─────────────────────────────────────────────────────────────

function ExpenseForm({
  categories, editing, onClose, onSaved,
}: {
  categories: ExpenseCategory[];
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeCats = categories.filter((c) => c.isActive || c.id === editing?.categoryId);

  const [amount, setAmount]         = useState(editing?.amount ?? '');
  const [currency, setCurrency]     = useState(editing?.currency ?? 'SYP');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? (activeCats[0]?.id ?? ''));
  const [incurredAt, setIncurredAt] = useState(editing ? editing.incurredAt.slice(0, 10) : todayISO());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [saving, setSaving] = useState(false);

  const amountValid = MONEY_RE.test(amount.trim()) && Number(amount) > 0;
  const valid = amountValid && categoryId !== '' && incurredAt !== '';

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        amount: amount.trim(),
        currency,
        categoryId,
        description: description.trim() || undefined,
        incurredAt,
      };
      if (editing) await accountingService.updateExpense(editing.id, payload);
      else await accountingService.createExpense(payload);
      toast.success(editing ? 'تم تحديث المصروف.' : 'تمت إضافة المصروف.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر حفظ المصروف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{editing ? 'تعديل المصروف' : 'إضافة مصروف'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">المبلغ</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-start focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {amount !== '' && !amountValid && (
            <p className="text-xs text-red-500 -mt-2">أدخل مبلغاً صحيحاً (خانتان عشريتان كحد أقصى).</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">الفئة</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
            >
              <option value="" disabled>اختر الفئة</option>
              {activeCats.map((c) => <option key={c.id} value={c.id}>{expenseCategoryLabel(c.key, c.label)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">التاريخ</label>
            <input
              type="date"
              value={incurredAt}
              onChange={(e) => setIncurredAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">الوصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none transition-colors"
            />
          </div>

          <button
            onClick={save}
            disabled={!valid || saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? UI_AR.saving : editing ? UI_AR.update : 'إضافة'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingExpensesPage() {
  const [period, setPeriod]   = useState<AccountingQuery | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [page, setPage]       = useState(1);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [rows, setRows]       = useState<Expense[]>([]);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(() => {
    accountingService.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const load = useCallback(() => {
    if (!period) return;
    setLoading(true); setError(false);
    accountingService.listExpenses({
      ...period,
      categoryId: categoryFilter || undefined,
      currency: currencyFilter || undefined,
      page,
      limit: 20,
    })
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period, categoryFilter, currencyFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change.
  const onCategory = (v: string) => { setCategoryFilter(v); setPage(1); };
  const onCurrency = (v: string) => { setCurrencyFilter(v); setPage(1); };

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setFormOpen(true); };

  const remove = async (e: Expense) => {
    if (!confirm('حذف هذا المصروف؟')) return;
    setDeletingId(e.id);
    try {
      await accountingService.deleteExpense(e.id);
      toast.success('تم حذف المصروف.');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر الحذف.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
            <p className="text-sm text-gray-500">سجلات المصروفات والفئات.</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          إضافة مصروف
        </button>
      </div>

      <PeriodPicker onChange={setPeriod} />

      <CategoryManager categories={categories} onChanged={() => { loadCategories(); load(); }} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => onCategory(e.target.value)}
          className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
        >
          <option value="">كل الفئات</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{expenseCategoryLabel(c.key, c.label)}</option>)}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => onCurrency(e.target.value)}
          className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
        >
          <option value="">كل العملات</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 animate-pulse h-64" />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">تعذّر تحميل المصروفات.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">{UI_AR.retry}</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">لا مصروفات ضمن هذه الفلاتر.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {e.categoryLabel}
                    {e.description ? <span className="text-gray-400 font-normal"> · {e.description}</span> : null}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(e.incurredAt)}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0" dir="ltr">
                  {formatMoney(e.amount, e.currency)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(e)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label={UI_AR.edit}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(e)} disabled={deletingId === e.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50" aria-label={UI_AR.delete}>
                    {deletingId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {meta && (meta.hasPrevPage || meta.hasNextPage) && (
            <div className="flex items-center justify-between p-3 border-t border-gray-100">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrevPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" /> {UI_AR.prev}
              </button>
              <span className="text-xs text-gray-400">{UI_AR.page} {meta.page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNextPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                {UI_AR.next} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <ExpenseForm
          categories={categories}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}
    </div>
  );
}
