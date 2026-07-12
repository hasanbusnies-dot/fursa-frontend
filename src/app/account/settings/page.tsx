'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Phone, Mail, BadgeCheck, CalendarDays, User, Building2,
  KeyRound, Eye, EyeOff, Check, X, Loader2, AlertCircle,
  Camera, Smartphone, Monitor, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import {
  usersService,
  type MeUser,
  type UpdateIndividualPayload,
  type UpdateCorporatePayload,
  type UserSession,
} from '@/services/users.service';
import { timeAgoAr } from '@/lib/notifications';
import { ApiError } from '@/services/api';
import { SYRIAN_GOVERNORATES } from '@/components/listings/wizard/schema';
import { cn } from '@/lib/utils';

// ── Shared form primitives (wizard Field style) ────────────────────────────────

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
    err
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
  }`;

function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-card shadow-pebble p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={cn(
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
        saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
      )}
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}

// Maps known backend (English) messages to Arabic before showing them.
function arabicApiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const m = err.message.toLowerCase();
    if (m.includes('current password is incorrect')) return 'كلمة المرور الحالية غير صحيحة.';
    if (m.includes('validation failed')) return 'بعض الحقول غير صالحة — تحقق من المدخلات.';
  }
  return fallback;
}

const USER_TYPE_LABEL: Record<MeUser['userType'], string> = {
  INDIVIDUAL: 'حساب فردي',
  CORPORATE: 'حساب متجر',
  ADMIN: 'إدارة',
  FIELD_AGENT: 'وكيل ميداني',
  ACCOUNTANT: 'محاسب',
};

function formatDateAr(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar-SY', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── ⓪ Profile photo (avatar / store logo) ──────────────────────────────────────

const PHOTO_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches the backend upload limit
const PHOTO_MIN_EDGE = 480;

function readImageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('unreadable image')); };
    img.src = objectUrl;
  });
}

function PhotoSection({ me }: { me: MeUser }) {
  const isCorporate = me.userType === 'CORPORATE';
  const [url, setUrl] = useState(
    (isCorporate ? me.corporateProfile?.logoUrl : me.individualProfile?.avatarUrl) ?? '',
  );
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = isCorporate ? 'شعار المتجر' : 'الصورة الشخصية';
  const initial = (isCorporate
    ? me.corporateProfile?.companyName
    : me.individualProfile?.firstName)?.charAt(0).toUpperCase() ?? '؟';

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    if (!PHOTO_ALLOWED_TYPES.has(file.type)) {
      toast.error('الصيغ المسموحة: JPEG أو PNG أو WebP.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error('حجم الصورة يتجاوز 5 ميغابايت.');
      return;
    }
    try {
      const { w, h } = await readImageDims(file);
      if (w < PHOTO_MIN_EDGE || h < PHOTO_MIN_EDGE) {
        toast.error(`أبعاد الصورة صغيرة (${w}×${h}) — الحد الأدنى 480×480 بكسل.`);
        return;
      }
    } catch {
      toast.error('تعذّرت قراءة الصورة — جرّب ملفاً آخر.');
      return;
    }

    setUploading(true);
    try {
      const uploadedUrl = await usersService.uploadProfileImage(file);
      if (isCorporate) await usersService.updateCorporate({ logoUrl: uploadedUrl });
      else             await usersService.updateIndividual({ avatarUrl: uploadedUrl });
      setUrl(uploadedUrl);
      toast.success(isCorporate ? 'تم تحديث شعار المتجر.' : 'تم تحديث صورتك الشخصية.');
    } catch (err) {
      toast.error(arabicApiMessage(err, 'تعذّر رفع الصورة — حاول مجدداً.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <SectionCard icon={Camera} title={title} subtitle={isCorporate ? 'يظهر الشعار في صفحة متجرك وإعلاناتك.' : 'تظهر صورتك بجانب اسمك في الموقع.'}>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title} className="w-24 h-24 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {initial}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors',
              uploading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
            )}
          >
            <Camera className="w-4 h-4" />
            {url ? 'تغيير الصورة' : 'اختيار صورة'}
          </button>
          <p className="mt-2 text-[11px] text-gray-400 leading-5">
            JPEG أو PNG أو WebP · ‏480×480 بكسل كحد أدنى · ‏5 ميغابايت كحد أقصى
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </SectionCard>
  );
}

// ── ① Login identity (read-only) ───────────────────────────────────────────────

function LoginInfoSection({ me }: { me: MeUser }) {
  const rows: { icon: React.ElementType; label: string; value: React.ReactNode }[] = [
    {
      icon: Phone,
      label: 'رقم الهاتف',
      value: (
        <span className="inline-flex items-center gap-2">
          <span dir="ltr" className="font-semibold text-gray-900">{me.phone}</span>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">
            هوية الدخول
          </span>
        </span>
      ),
    },
    {
      icon: Mail,
      label: 'البريد الإلكتروني',
      value: me.email
        ? <span dir="ltr" className="font-semibold text-gray-900">{me.email}</span>
        : <span className="text-gray-400">غير مُضاف</span>,
    },
    {
      icon: BadgeCheck,
      label: 'نوع الحساب',
      value: <span className="font-semibold text-gray-900">{USER_TYPE_LABEL[me.userType]}</span>,
    },
    {
      icon: CalendarDays,
      label: 'عضو منذ',
      value: <span className="font-semibold text-gray-900">{formatDateAr(me.createdAt)}</span>,
    },
  ];

  return (
    <SectionCard icon={KeyRound} title="بيانات تسجيل الدخول" subtitle="هذه البيانات تُستخدم للدخول إلى حسابك.">
      <div className="divide-y divide-gray-50">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5">
            <r.icon className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 w-32 shrink-0">{r.label}</span>
            <span className="text-sm min-w-0 truncate">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        تغيير رقم الهاتف أو البريد الإلكتروني سيتوفر قريباً.
      </p>
    </SectionCard>
  );
}

// ── ② Personal info (INDIVIDUAL) ───────────────────────────────────────────────

function IndividualSection({ me }: { me: MeUser }) {
  const p = me.individualProfile;

  const [firstName, setFirstName]     = useState(p?.firstName ?? '');
  const [lastName, setLastName]       = useState(p?.lastName ?? '');
  const [gender, setGender]           = useState<string>(p?.gender ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(p?.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '');
  const [bio, setBio]                 = useState(p?.bio ?? '');
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (firstName.trim().length < 2) errs.firstName = 'الاسم الأول مطلوب (حرفان على الأقل).';
    if (lastName.trim().length < 2)  errs.lastName  = 'الكنية مطلوبة (حرفان على الأقل).';
    if (bio.trim().length > 500)     errs.bio       = 'النبذة تتجاوز 500 حرف.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload: UpdateIndividualPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio: bio.trim(),
    };
    if (gender) payload.gender = gender as 'MALE' | 'FEMALE';
    // Backend expects a full ISO 8601 datetime, the date input yields YYYY-MM-DD.
    if (dateOfBirth) payload.dateOfBirth = `${dateOfBirth}T00:00:00.000Z`;

    setSaving(true);
    try {
      const updated = await usersService.updateIndividual(payload);
      // Refresh the persisted auth user so the sidebar/header name updates instantly.
      const { user, token, refreshToken, setAuth } = useAuthStore.getState();
      if (user && token && refreshToken) {
        setAuth(
          { ...user, profile: { ...user.profile, firstName: updated.firstName, lastName: updated.lastName } },
          token,
          refreshToken,
        );
      }
      toast.success('تم حفظ المعلومات الشخصية.');
    } catch (err) {
      toast.error(arabicApiMessage(err, 'تعذّر حفظ التغييرات — حاول مجدداً.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard icon={User} title="المعلومات الشخصية" subtitle="اسمك ونبذة عنك كما تظهر للآخرين.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الاسم الأول" required error={errors.firstName}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls(errors.firstName)}
              maxLength={50}
              autoComplete="given-name"
            />
          </Field>
          <Field label="الكنية" required error={errors.lastName}>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls(errors.lastName)}
              maxLength={50}
              autoComplete="family-name"
            />
          </Field>
          <Field label="الجنس">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls()}>
              <option value="">غير محدد</option>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </select>
          </Field>
          <Field label="تاريخ الميلاد">
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputCls()}
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>
        </div>

        <Field label="نبذة عني" error={errors.bio}>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="اكتب نبذة قصيرة عنك (اختياري)…"
              className={`${inputCls(errors.bio)} resize-none`}
            />
            <span className={`absolute bottom-2 end-3 text-[10px] ${bio.length > 470 ? 'text-red-400' : 'text-gray-300'}`}>
              {bio.length}/500
            </span>
          </div>
        </Field>

        <div className="flex justify-end">
          <SaveButton saving={saving} label="حفظ التغييرات" />
        </div>
      </form>
    </SectionCard>
  );
}

// ── ② Company info (CORPORATE) ─────────────────────────────────────────────────

function CorporateSection({ me }: { me: MeUser }) {
  const p = me.corporateProfile;

  const [companyName, setCompanyName] = useState(p?.companyName ?? '');
  const [website, setWebsite]         = useState(p?.website ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [governorate, setGovernorate] = useState(p?.governorate ?? '');
  const [city, setCity]               = useState(p?.city ?? '');
  const [address, setAddress]         = useState(p?.address ?? '');
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (companyName.trim().length < 2) errs.companyName = 'اسم الشركة مطلوب (حرفان على الأقل).';
    if (description.trim().length > 1000) errs.description = 'الوصف يتجاوز 1000 حرف.';

    // Backend requires a full URL — auto-prefix https:// then validate.
    let normalizedWebsite = website.trim();
    if (normalizedWebsite && !/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }
    if (normalizedWebsite) {
      try { new URL(normalizedWebsite); }
      catch { errs.website = 'رابط الموقع غير صالح.'; }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload: UpdateCorporatePayload = {
      companyName: companyName.trim(),
      description: description.trim(),
      address: address.trim(),
      city: city.trim(),
      governorate: governorate.trim(),
    };
    // website: '' fails the backend URL check — omit when empty (clearing unsupported).
    if (normalizedWebsite) payload.website = normalizedWebsite;

    setSaving(true);
    try {
      const updated = await usersService.updateCorporate(payload);
      setWebsite(updated.website ?? normalizedWebsite);
      // Refresh the persisted auth user so header/sidebar company naming stays in sync.
      const { user, token, refreshToken, setAuth } = useAuthStore.getState();
      if (user && token && refreshToken) {
        setAuth(
          {
            ...user,
            corporateProfile: { ...user.corporateProfile, companyName: updated.companyName },
          },
          token,
          refreshToken,
        );
      }
      toast.success('تم حفظ بيانات المتجر.');
    } catch (err) {
      toast.error(arabicApiMessage(err, 'تعذّر حفظ التغييرات — حاول مجدداً.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard icon={Building2} title="بيانات المتجر" subtitle="معلومات شركتك كما تظهر في صفحة متجرك.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الشركة" required error={errors.companyName}>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls(errors.companyName)}
              maxLength={100}
              autoComplete="organization"
            />
          </Field>
          <Field label="الموقع الإلكتروني" error={errors.website} hint="اختياري — مثال: www.example.com">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputCls(errors.website)}
              dir="ltr"
              placeholder="https://…"
              autoComplete="url"
            />
          </Field>
        </div>

        <Field label="وصف الشركة" error={errors.description}>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="عرّف الزبائن بنشاطك التجاري (اختياري)…"
              className={`${inputCls(errors.description)} resize-none`}
            />
            <span className={`absolute bottom-2 end-3 text-[10px] ${description.length > 950 ? 'text-red-400' : 'text-gray-300'}`}>
              {description.length}/1000
            </span>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="المحافظة">
            <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={inputCls()}>
              <option value="">اختر المحافظة</option>
              {SYRIAN_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="المدينة">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls()} />
          </Field>
          <Field label="العنوان">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls()} />
          </Field>
        </div>

        <div className="flex justify-end">
          <SaveButton saving={saving} label="حفظ التغييرات" />
        </div>
      </form>
    </SectionCard>
  );
}

// ── ③ Password change ──────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, error, autoComplete }: {
  value: string; onChange: (v: string) => void; error?: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls(error)} pe-10`}
        dir="ltr"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  const checks = [
    { label: '8 أحرف على الأقل',        ok: next.length >= 8 },
    { label: 'حرف كبير واحد على الأقل (A–Z)', ok: /[A-Z]/.test(next) },
    { label: 'رقم واحد على الأقل (0–9)',       ok: /[0-9]/.test(next) },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = 'أدخل كلمة المرور الحالية.';
    if (checks.some((c) => !c.ok)) errs.next = 'كلمة المرور الجديدة لا تحقق الشروط أدناه.';
    if (confirm !== next) errs.confirm = 'كلمتا المرور غير متطابقتين.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await usersService.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      toast.success('تم تغيير كلمة المرور بنجاح.');
    } catch (err) {
      const msg = arabicApiMessage(err, 'تعذّر تغيير كلمة المرور — حاول مجدداً.');
      if (msg.includes('الحالية')) setErrors({ current: msg });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard icon={KeyRound} title="تغيير كلمة المرور" subtitle="اختر كلمة مرور قوية لا تستخدمها في مكان آخر.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <Field label="كلمة المرور الحالية" required error={errors.current}>
              <PasswordInput value={current} onChange={setCurrent} error={errors.current} autoComplete="current-password" />
            </Field>
          </div>
          <Field label="كلمة المرور الجديدة" required error={errors.next}>
            <PasswordInput value={next} onChange={setNext} error={errors.next} autoComplete="new-password" />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة" required error={errors.confirm}>
            <PasswordInput value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
          </Field>
        </div>

        {/* Live policy checklist */}
        <ul className="space-y-1">
          {checks.map((c) => (
            <li key={c.label} className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-green-600' : 'text-gray-400')}>
              {c.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              {c.label}
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <SaveButton saving={saving} label="تغيير كلمة المرور" />
        </div>
      </form>
    </SectionCard>
  );
}

// ── ④ Logged-in devices (active refresh-token sessions) ────────────────────────

function parseUserAgent(ua?: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: 'جهاز غير معروف', mobile: false };
  const browser =
    /edg\//i.test(ua)    ? 'Edge'    :
    /opr\//i.test(ua)    ? 'Opera'   :
    /firefox/i.test(ua)  ? 'Firefox' :
    /chrome/i.test(ua)   ? 'Chrome'  :
    /safari/i.test(ua)   ? 'Safari'  : 'متصفح';
  const os =
    /windows/i.test(ua)      ? 'Windows' :
    /android/i.test(ua)      ? 'Android' :
    /iphone|ipad/i.test(ua)  ? 'iOS'     :
    /mac os/i.test(ua)       ? 'macOS'   :
    /linux/i.test(ua)        ? 'Linux'   : '';
  return {
    label: os ? `${browser} على ${os}` : browser,
    mobile: /android|iphone|ipad|mobile/i.test(ua),
  };
}

function SessionsSection() {
  const router = useRouter();
  const [sessions, setSessions]   = useState<UserSession[] | null>(null);
  const [error, setError]         = useState(false);
  const [busyId, setBusyId]       = useState<string | null>(null); // session being revoked ('ALL' for logout-all)
  const [confirmId, setConfirmId] = useState<string | null>(null); // two-click confirm ('ALL' or current session id)

  useEffect(() => {
    usersService.getSessions(useAuthStore.getState().refreshToken)
      .then(setSessions)
      .catch(() => setError(true));
  }, []);

  function localLogout() {
    useAuthStore.getState().logout();
    router.replace('/login');
  }

  async function revoke(s: UserSession) {
    // Revoking THIS device logs you out — ask for a second click first.
    if (s.current && confirmId !== s.id) { setConfirmId(s.id); return; }
    setBusyId(s.id);
    try {
      await usersService.revokeSession(s.id);
      if (s.current) { localLogout(); return; }
      setSessions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
      toast.success('تم تسجيل الخروج من الجهاز.');
    } catch {
      toast.error('تعذّر تسجيل الخروج من الجهاز — حاول مجدداً.');
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function logoutAll() {
    if (confirmId !== 'ALL') { setConfirmId('ALL'); return; }
    setBusyId('ALL');
    try {
      await usersService.logoutAllDevices();
      localLogout();
    } catch {
      toast.error('تعذّر تسجيل الخروج من جميع الأجهزة — حاول مجدداً.');
      setBusyId(null);
      setConfirmId(null);
    }
  }

  return (
    <SectionCard
      icon={Monitor}
      title="الأجهزة المسجّل دخولها"
      subtitle="كل جلسة نشطة على حسابك — سجّل الخروج من أي جهاز لا تعرفه."
    >
      {error ? (
        <p className="text-sm text-gray-400 py-4 text-center">تعذّر تحميل الجلسات — أعد تحميل الصفحة.</p>
      ) : sessions === null ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">لا توجد جلسات نشطة.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {sessions.map((s) => {
              const { label, mobile } = parseUserAgent(s.userAgent);
              const DeviceIcon = mobile ? Smartphone : Monitor;
              const confirming = confirmId === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <DeviceIcon className="w-4.5 h-4.5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span className="truncate">{label}</span>
                      {s.current && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                          هذا الجهاز
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {s.ipAddress && <span dir="ltr">{s.ipAddress}</span>}
                      {s.ipAddress && ' · '}
                      آخر نشاط {timeAgoAr(s.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(s)}
                    disabled={busyId !== null}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0',
                      confirming
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-red-500 hover:bg-red-50',
                      busyId !== null && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {busyId === s.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <LogOut className="w-3.5 h-3.5" />}
                    {confirming ? 'تأكيد — سيتم إخراجك' : 'تسجيل الخروج'}
                  </button>
                </div>
              );
            })}
          </div>

          {sessions.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={logoutAll}
                disabled={busyId !== null}
                className={cn(
                  'inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border transition-colors',
                  confirmId === 'ALL'
                    ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                    : 'border-red-200 text-red-500 hover:bg-red-50',
                  busyId !== null && 'opacity-50 cursor-not-allowed',
                )}
              >
                {busyId === 'ALL'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <LogOut className="w-3.5 h-3.5" />}
                {confirmId === 'ALL'
                  ? 'تأكيد — سيتم إخراجك من هذا الجهاز أيضاً'
                  : 'تسجيل الخروج من جميع الأجهزة'}
              </button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-52 animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-72 animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-60 animate-pulse" />
    </div>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [mounted, setMounted] = useState(false);
  const [me, setMe]           = useState<MeUser | null>(null);
  const [error, setError]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login?redirect=/account/settings'); return; }
    usersService.getMe()
      .then(setMe)
      .catch(() => setError(true));
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return <PageSkeleton />;

  if (error) {
    return (
      <div className="bg-white rounded-card shadow-pebble p-10 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
        تعذّر تحميل بيانات الحساب — أعد تحميل الصفحة.
      </div>
    );
  }

  if (!me) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Settings className="w-5 h-5 text-blue-600" />
        حسابي والإعدادات
      </h1>

      {(me.userType === 'INDIVIDUAL' || me.userType === 'CORPORATE') && <PhotoSection me={me} />}

      <LoginInfoSection me={me} />

      {me.userType === 'INDIVIDUAL' && <IndividualSection me={me} />}
      {me.userType === 'CORPORATE'  && <CorporateSection me={me} />}

      <PasswordSection />

      <SessionsSection />
    </div>
  );
}
