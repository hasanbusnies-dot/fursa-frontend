'use client';

import { useRef, useState } from 'react';
import {
  Phone, Mail, BadgeCheck, CalendarDays, User, Building2,
  KeyRound, Loader2, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import {
  usersService,
  type MeUser,
  type UpdateIndividualPayload,
  type UpdateCorporatePayload,
} from '@/services/users.service';
import { SYRIAN_GOVERNORATES } from '@/components/listings/wizard/schema';
import { cn } from '@/lib/utils';
import {
  inputCls, Field, SectionCard, SaveButton,
  arabicApiMessage, USER_TYPE_LABEL, formatDateAr,
} from './shared';

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

export function PhotoSection({ me }: { me: MeUser }) {
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

export function LoginInfoSection({ me }: { me: MeUser }) {
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

export function IndividualSection({ me }: { me: MeUser }) {
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

export function CorporateSection({ me }: { me: MeUser }) {
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
