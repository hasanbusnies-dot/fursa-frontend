'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus, Loader2, Eye, EyeOff, Calculator, MapPin, CheckCircle2,
  Copy, Check, AlertTriangle, ArrowRight, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  staffService,
  type CreateAccountantResult,
  type CreateAgentResult,
} from '@/services/staff.service';

type Role = 'ACCOUNTANT' | 'FIELD_AGENT';

// ── Validation (mirrors the backend rules) ──────────────────────────────────────────
const PHONE_RE = /^\+?[0-9]+$/;

function validateName(v: string): string | null {
  const t = v.trim();
  if (t.length < 2 || t.length > 50) return 'Ad/soyad 2–50 karakter olmalı.';
  return null;
}
function validatePhone(v: string): string | null {
  const t = v.trim();
  if (!PHONE_RE.test(t)) return 'Telefon yalnızca rakam (başında + olabilir) içerebilir.';
  if (t.length < 8 || t.length > 16) return 'Telefon 8–16 karakter olmalı.';
  return null;
}
function validateRegion(v: string): string | null {
  const t = v.trim();
  if (t && t.length > 100) return 'Bölge en fazla 100 karakter olabilir.';
  return null;
}
function validatePassword(v: string): string | null {
  if (v.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (!/[A-Z]/.test(v)) return 'Şifre en az 1 büyük harf içermeli.';
  if (!/[0-9]/.test(v)) return 'Şifre en az 1 rakam içermeli.';
  return null;
}

// ── Prominent copyable field (agent code / one-time password) ────────────────────────
function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xl font-extrabold text-gray-900 break-all ${mono ? 'font-mono tracking-wide' : ''}`} dir="ltr">
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          title="Kopyala"
          className="shrink-0 w-9 h-9 rounded-lg bg-white border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-600" />}
        </button>
      </div>
    </div>
  );
}

// ── Plain text row (accountant credentials) ─────────────────────────────────────────
function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 break-all" dir="ltr">{value}</span>
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, error, type = 'text', autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [role, setRole] = useState<Role>('ACCOUNTANT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [region, setRegion]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [touched, setTouched]           = useState(false);

  // Role-specific success payloads
  const [accountantDone, setAccountantDone] = useState<{ phone: string; password: string; name: string } | null>(null);
  const [agentDone, setAgentDone]           = useState<CreateAgentResult | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  // Errors only surface after a submit attempt (touched), keeping the form quiet initially.
  const nameErr  = touched ? validateName(firstName) : null;
  const lastErr  = touched ? validateName(lastName)  : null;
  const phoneErr = touched ? validatePhone(phone)    : null;
  const passErr  = touched && role === 'ACCOUNTANT' ? validatePassword(password) : null;
  const regErr   = touched && role === 'FIELD_AGENT' ? validateRegion(region)    : null;

  const resetForm = () => {
    setFirstName(''); setLastName(''); setPhone(''); setPassword(''); setRegion('');
    setTouched(false); setShowPassword(false);
  };

  const switchRole = (r: Role) => {
    setRole(r);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    const errs = [
      validateName(firstName), validateName(lastName), validatePhone(phone),
      role === 'ACCOUNTANT' ? validatePassword(password) : null,
      role === 'FIELD_AGENT' ? validateRegion(region) : null,
    ].filter(Boolean);
    if (errs.length) { toast.error('Lütfen formdaki hataları düzeltin.'); return; }

    setSubmitting(true);
    try {
      if (role === 'ACCOUNTANT') {
        const res: CreateAccountantResult = await staffService.createAccountant({
          firstName: firstName.trim(), lastName: lastName.trim(),
          phone: phone.trim(), password,
        });
        // The server doesn't echo the password — re-show the typed value for first login.
        setAccountantDone({
          phone: res.phone ?? phone.trim(),
          password,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        });
      } else {
        const res = await staffService.createAgent({
          firstName: firstName.trim(), lastName: lastName.trim(),
          phone: phone.trim(),
          region: region.trim() || undefined,
        });
        setAgentDone(res);
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Oluşturma başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const createAnother = () => {
    setAccountantDone(null);
    setAgentDone(null);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personel Oluştur</h1>
            <p className="text-sm text-gray-500">Yeni muhasebeci veya saha temsilcisi ekleyin.</p>
          </div>
        </div>

        <AdminNav />

        {/* ── ACCOUNTANT success ── */}
        {accountantDone ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Muhasebeci oluşturuldu.</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">{accountantDone.name} için giriş bilgileri:</p>
            <div className="space-y-2.5">
              <CredRow label="Telefon" value={accountantDone.phone} />
              <CredRow label="Şifre" value={accountantDone.password} />
            </div>
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-800 leading-relaxed">
                Bu bilgilerle <span className="font-semibold">/accounting/login</span> adresinden giriş yapabilir.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/accounting/login"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Muhasebe girişine git <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={createAnother}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Yeni personel oluştur
              </button>
            </div>
          </div>
        ) : agentDone ? (
          /* ── FIELD_AGENT success ── */
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Saha temsilcisi oluşturuldu.</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {agentDone.user.firstName} {agentDone.user.lastName} ({agentDone.user.phone})
            </p>

            {/* Once-only warning — the oneTimePassword exists only in this response */}
            <div className="mb-4 rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                Bu şifre yalnızca bir kez gösterilir — kaydedin. Temsilci{' '}
                <span className="font-semibold">/agent/login</span> adresinden bu kod ve şifreyle giriş yapıp
                şifresini değiştirecek.
              </p>
            </div>

            <div className="space-y-2.5">
              <CopyField label="Temsilci Kodu (11 hane)" value={agentDone.agentCode} />
              <CopyField label="Tek Kullanımlık Şifre" value={agentDone.oneTimePassword} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/agent/login"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                Temsilci girişine git <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={createAnother}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Yeni personel oluştur
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            {/* Role selector */}
            <label className="block text-xs font-semibold text-gray-700 mb-2">Personel Türü</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => switchRole('ACCOUNTANT')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  role === 'ACCOUNTANT'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Calculator className="w-4 h-4" /> Muhasebeci
              </button>
              <button
                type="button"
                onClick={() => switchRole('FIELD_AGENT')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  role === 'FIELD_AGENT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4" /> Saha Temsilcisi
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ad" value={firstName} onChange={setFirstName} placeholder="Ad" error={nameErr} autoComplete="off" />
              <Field label="Soyad" value={lastName} onChange={setLastName} placeholder="Soyad" error={lastErr} autoComplete="off" />
            </div>

            <div className="mt-4">
              <Field label="Telefon" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" error={phoneErr} type="tel" autoComplete="off" />
            </div>

            {role === 'ACCOUNTANT' ? (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Şifre</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="block w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">En az 8 karakter, 1 büyük harf ve 1 rakam içermeli.</p>
                {passErr && <p className="text-red-500 text-xs mt-1">{passErr}</p>}
              </div>
            ) : (
              <div className="mt-4">
                <Field label="Bölge (opsiyonel)" value={region} onChange={setRegion} placeholder="Örn. Şam" error={regErr} autoComplete="off" />
                <p className="text-[11px] text-gray-500 mt-1">
                  Şifre sunucu tarafından oluşturulur ve oluşturma sonrası bir kez gösterilir.
                </p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {role === 'ACCOUNTANT' ? 'Muhasebeci Oluştur' : 'Saha Temsilcisi Oluştur'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
