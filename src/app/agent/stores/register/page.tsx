'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Camera, RotateCcw, Loader2, ChevronDown, Building2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  agentStoresService,
  type CompanyType,
  type RegisterStoreInput,
} from '@/services/stores.service';
import { ApiError } from '@/services/api';

// Company-type options (the dropdown is optional → leading blank choice).
const COMPANY_TYPES: { value: CompanyType | ''; label: string }[] = [
  { value: '',                   label: 'نوع النشاط (اختياري)' },
  { value: 'REAL_ESTATE_AGENCY', label: 'مكتب عقاري' },
  { value: 'CAR_SHOWROOM',       label: 'معرض سيارات' },
  { value: 'STORE',              label: 'متجر' },
  { value: 'SERVICES',           label: 'خدمات' },
  { value: 'OTHER',              label: 'أخرى' },
];

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 ' +
  'text-start focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';

export default function AgentStoreRegisterPage() {
  const router = useRouter();

  // Text fields
  const [name, setName]               = useState('');
  const [ownerName, setOwnerName]     = useState('');
  const [ownerPhone, setOwnerPhone]   = useState('');
  const [address, setAddress]         = useState('');
  const [city, setCity]               = useState('');
  const [governorate, setGovernorate] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType | ''>('');

  // Contract photo (camera capture)
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto]       = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Object-URL preview lifecycle — revoke the previous URL whenever the file changes
  // or the component unmounts so we don't leak blobs.
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) setPhoto(f);
    // Reset the input value so picking the same file again still fires onChange (retake).
    e.target.value = '';
  };

  const retake = () => { setPhoto(null); fileRef.current?.click(); };

  const valid =
    name.trim() !== '' &&
    ownerName.trim() !== '' &&
    ownerPhone.trim() !== '' &&
    photo !== null;

  const submit = async () => {
    if (submitting) return;
    if (!photo) { toast.error('يجب التقاط صورة العقد الموقّع.'); return; }
    if (!valid) { toast.error('يرجى تعبئة اسم المتجر واسم المالك ورقم هاتفه.'); return; }

    setSubmitting(true);
    try {
      const payload: RegisterStoreInput = {
        name: name.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        governorate: governorate.trim() || undefined,
        companyType: companyType || undefined,
        contract: photo,
      };
      await agentStoresService.registerStore(payload);
      toast.success('تم تسجيل المتجر — بانتظار موافقة الإدارة.');
      router.push('/agent/stores');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Backend 400s: missing photo or non-corporate owner phone. Surface the
        // server message when present, otherwise a clear default.
        const m = (err.message || '').toLowerCase();
        if (m.includes('phone') || m.includes('corporate') || m.includes('هاتف')) {
          toast.error('رقم هاتف المالك ليس حساباً تجارياً. يجب أن يكون المالك حساباً تجارياً.');
        } else if (m.includes('photo') || m.includes('contract') || m.includes('file') || m.includes('صورة')) {
          toast.error('صورة العقد مفقودة أو غير صالحة. أعد التقاط الصورة.');
        } else {
          toast.error(err.message || 'تعذّر تسجيل المتجر. تحقّق من البيانات.');
        }
      } else if (err instanceof ApiError && err.status === 403) {
        toast.error('صلاحيات غير كافية لتسجيل متجر.');
      } else {
        toast.error(err instanceof Error ? err.message : 'تعذّر تسجيل المتجر. حاول مرة أخرى.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
          <Store className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">تسجيل متجر جديد</h1>
          <p className="text-xs text-slate-500">سجّل المتجر والتقط صورة العقد الموقّع.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Contract photo (camera-only) ── */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">صورة العقد الموقّع</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            صوّر العقد الورقي الموقّع في الموقع. هذه الصورة إلزامية للتحقق.
          </p>

          {/* Hidden camera input — accept image + capture=environment opens the rear
              camera directly on mobile (no gallery picker where supported). */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickPhoto}
            className="hidden"
          />

          {preview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="معاينة صورة العقد"
                className="w-full rounded-xl border border-slate-200 object-contain max-h-72 bg-slate-50"
              />
              <button
                type="button"
                onClick={retake}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الالتقاط
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm font-semibold">التقاط صورة العقد</span>
            </button>
          )}
        </div>

        {/* ── Store details ── */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">بيانات المتجر</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم المتجر *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المتجر" className={inputCls} />
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">نوع النشاط</label>
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value as CompanyType | '')}
              className={inputCls + ' appearance-none cursor-pointer pe-9'}
            >
              {COMPANY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-3 top-[42px] w-4 h-4 text-slate-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">العنوان (اختياري)</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان التفصيلي" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">المدينة (اختياري)</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">المحافظة (اختياري)</label>
              <input value={governorate} onChange={(e) => setGovernorate(e.target.value)} placeholder="المحافظة" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Owner ── */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">بيانات المالك</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم المالك *</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="الاسم الكامل للمالك" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم هاتف المالك *</label>
            <input
              inputMode="tel"
              dir="ltr"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className={inputCls}
            />
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              يجب أن يكون رقم المالك حساباً تجارياً مسجّلاً.
            </p>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!valid || submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
          {submitting ? 'جارٍ التسجيل…' : 'تسجيل المتجر'}
        </button>
      </div>
    </div>
  );
}
