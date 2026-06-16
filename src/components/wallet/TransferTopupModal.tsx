'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Loader2, Copy, Check, ChevronLeft, Clock, ImagePlus, AlertTriangle, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  walletTransfersService,
  type TransferMethodOption,
  type TransferInitiated,
  type TransferMethod,
} from '@/services/wallet-transfers.service';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

type WalletCurrency = 'SYP' | 'USD';
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

type Step = 'method' | 'instructions' | 'claim' | 'done';

// ── Copy-to-clipboard pill ──────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => toast.error('تعذّر النسخ.'));
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn('shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600', className)}
      aria-label="نسخ"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────────

export function TransferTopupModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('method');

  // Methods
  const [methods, setMethods]       = useState<TransferMethodOption[]>([]);
  const [loadingMethods, setLM]     = useState(true);
  const [methodsError, setME]       = useState(false);
  const [selected, setSelected]     = useState<TransferMethod | null>(null);

  // Amount
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState<WalletCurrency>('SYP');

  // Initiate result
  const [initiating, setInitiating] = useState(false);
  const [transfer, setTransfer]     = useState<TransferInitiated | null>(null);

  // Claim
  const fileRef = useRef<HTMLInputElement>(null);
  const [proof, setProof]     = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote]       = useState('');
  const [claiming, setClaiming] = useState(false);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Load methods on open.
  useEffect(() => {
    setLM(true); setME(false);
    walletTransfersService.getMethods()
      .then(setMethods)
      .catch(() => setME(true))
      .finally(() => setLM(false));
  }, []);

  // Proof preview lifecycle.
  useEffect(() => {
    if (!proof) { setPreview(null); return; }
    const url = URL.createObjectURL(proof);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  const amountValid = AMOUNT_RE.test(amount) && Number(amount) > 0;
  const canInitiate = selected !== null && amountValid && !initiating;

  const initiate = async () => {
    if (!canInitiate || !selected) return;
    setInitiating(true);
    try {
      const res = await walletTransfersService.initiate({ method: selected, amount, currency });
      setTransfer(res);
      setStep('instructions');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        toast.error('طريقة الشحن غير متاحة حالياً.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'تعذّر بدء عملية الشحن.');
      }
    } finally {
      setInitiating(false);
    }
  };

  const submitClaim = async () => {
    if (!transfer || claiming) return;
    setClaiming(true);
    try {
      await walletTransfersService.claim(transfer.transferId, {
        receipt: proof ?? undefined,
        userReference: note.trim() || undefined,
      });
      setStep('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already claimed (e.g. double-submit / stale) → treat as done.
        toast.info('تم استلام طلبك مسبقاً، بانتظار التأكيد.');
        setStep('done');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'تعذّر إرسال الطلب. حاول مرة أخرى.');
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {step === 'instructions' ? 'تفاصيل التحويل'
              : step === 'claim' ? 'تأكيد التحويل'
              : step === 'done' ? 'تم استلام طلبك'
              : 'شحن المحفظة'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {/* ── Step: method + amount ── */}
          {step === 'method' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">اختر طريقة الشحن</label>
                {loadingMethods ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : methodsError ? (
                  <p className="text-sm text-red-500 py-4 text-center">تعذّر تحميل طرق الشحن.</p>
                ) : (
                  <div className="space-y-2">
                    {methods.map((m) => {
                      const disabled = !m.isActive || m.comingSoon;
                      const active = selected === m.method;
                      return (
                        <button
                          key={m.method}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelected(m.method)}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-start transition-colors',
                            active ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300',
                            disabled && 'opacity-50 cursor-not-allowed hover:border-gray-200',
                          )}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Wallet className="w-4 h-4 text-gray-500" />
                            </span>
                            <span className="text-sm font-bold text-gray-800 truncate">{m.label}</span>
                          </span>
                          {disabled && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                              قريباً
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Amount — shown once an active method is chosen */}
              {selected && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">العملة</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['SYP', 'USD'] as WalletCurrency[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setCurrency(c)}
                          className={cn(
                            'py-2.5 rounded-xl text-sm font-bold border transition-colors',
                            currency === c ? 'bg-orange-50 border-orange-300 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
                          )}
                        >
                          {c === 'SYP' ? 'ليرة سورية' : 'دولار'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">المبلغ</label>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="0.00"
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold text-gray-900 text-start focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    {amount !== '' && !amountValid && (
                      <p className="text-xs text-red-500 mt-1.5">أدخل مبلغاً صحيحاً (حتى منزلتين عشريتين).</p>
                    )}
                  </div>
                  <button
                    onClick={initiate}
                    disabled={!canInitiate}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-orange-500 to-pink-500 text-white text-sm font-bold hover:opacity-95 transition-opacity disabled:opacity-50"
                  >
                    {initiating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {initiating ? 'جارٍ المتابعة…' : 'متابعة'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step: instructions ── */}
          {step === 'instructions' && transfer && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{transfer.instructions}</p>

              {/* Amount */}
              <div className="flex items-center justify-between rounded-xl bg-gray-900 text-white px-4 py-3">
                <span className="text-xs text-gray-300">المبلغ المطلوب تحويله</span>
                <span className="text-lg font-extrabold" dir="ltr">{formatMoney(transfer.amount, transfer.currency)}</span>
              </div>

              {/* Receiving account */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">حوّل إلى هذا الحساب</label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="flex-1 text-sm font-bold text-gray-800 truncate" dir="ltr">{transfer.receivingAccount}</span>
                  <CopyButton value={transfer.receivingAccount} />
                </div>
              </div>

              {/* QR */}
              {transfer.qrUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={transfer.qrUrl}
                    alt="رمز QR للتحويل"
                    className="w-40 h-40 rounded-2xl border border-gray-200 object-contain bg-white"
                  />
                </div>
              )}

              {/* Reference code — the key step */}
              <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  ضع هذا الرمز في ملاحظة التحويل
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-white border border-orange-200 px-4 py-3">
                  <span className="flex-1 text-xl font-extrabold tracking-widest text-gray-900 text-center" dir="ltr">
                    {transfer.referenceCode}
                  </span>
                  <CopyButton value={transfer.referenceCode} />
                </div>
                <p className="text-[11px] text-orange-600 mt-2 leading-relaxed">
                  بدون هذا الرمز لن نتمكن من مطابقة تحويلك وإضافته إلى محفظتك.
                </p>
              </div>

              <button
                onClick={() => setStep('claim')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                لقد قمت بالتحويل
              </button>
            </div>
          )}

          {/* ── Step: claim ── */}
          {step === 'claim' && transfer && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                أرفق صورة إيصال التحويل (اختياري) لتسريع التأكيد، ثم أرسل طلبك.
              </p>

              {/* Proof screenshot — gallery (a screenshot), not the camera */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setProof(f); e.target.value = ''; }}
                className="hidden"
              />
              {preview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="معاينة الإيصال" className="w-full rounded-xl border border-gray-200 object-contain max-h-60 bg-gray-50" />
                  <button
                    type="button"
                    onClick={() => setProof(null)}
                    className="w-full py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    إزالة الصورة
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                >
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-sm font-semibold">إرفاق صورة الإيصال (اختياري)</span>
                </button>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">ملاحظة (اختياري)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="أي تفاصيل تساعدنا في مطابقة تحويلك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('instructions')}
                  disabled={claiming}
                  className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  رجوع
                </button>
                <button
                  onClick={submitClaim}
                  disabled={claiming}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {claiming ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-gray-800">بانتظار التأكيد</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                سنراجع تحويلك ونضيف المبلغ إلى محفظتك بعد التأكد منه. يمكنك متابعة الحالة في سجل طلبات الشحن.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                حسناً
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
