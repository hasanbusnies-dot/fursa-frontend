'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
// Real flag artwork, self-hosted (flag-icons, MIT). NOT emoji: Windows ships no flag
// glyphs in Segoe UI Emoji, so 🇸🇾 renders as the bare letters "SY" (or a blank box) on
// every Windows browser — which is why the old picker looked flagless on desktop while
// working fine on phones. SVGs render identically everywhere.
import flagSY from 'flag-icons/flags/4x3/sy.svg';
import flagTR from 'flag-icons/flags/4x3/tr.svg';
import flagLB from 'flag-icons/flags/4x3/lb.svg';
import flagJO from 'flag-icons/flags/4x3/jo.svg';
import flagIQ from 'flag-icons/flags/4x3/iq.svg';
import flagEG from 'flag-icons/flags/4x3/eg.svg';
import flagSA from 'flag-icons/flags/4x3/sa.svg';
import flagAE from 'flag-icons/flags/4x3/ae.svg';
import flagKW from 'flag-icons/flags/4x3/kw.svg';
import flagQA from 'flag-icons/flags/4x3/qa.svg';
import flagBH from 'flag-icons/flags/4x3/bh.svg';
import flagOM from 'flag-icons/flags/4x3/om.svg';
import flagYE from 'flag-icons/flags/4x3/ye.svg';
import flagPS from 'flag-icons/flags/4x3/ps.svg';
import flagLY from 'flag-icons/flags/4x3/ly.svg';
import flagSD from 'flag-icons/flags/4x3/sd.svg';
import flagDZ from 'flag-icons/flags/4x3/dz.svg';
import flagMA from 'flag-icons/flags/4x3/ma.svg';
import flagTN from 'flag-icons/flags/4x3/tn.svg';
import flagDE from 'flag-icons/flags/4x3/de.svg';
import flagSE from 'flag-icons/flags/4x3/se.svg';
import flagNL from 'flag-icons/flags/4x3/nl.svg';
import flagFR from 'flag-icons/flags/4x3/fr.svg';
import flagGB from 'flag-icons/flags/4x3/gb.svg';
import flagUS from 'flag-icons/flags/4x3/us.svg';
import flagDK from 'flag-icons/flags/4x3/dk.svg';
import flagAT from 'flag-icons/flags/4x3/at.svg';
import flagCA from 'flag-icons/flags/4x3/ca.svg';

type ImgImport = string | { src: string };
const imgSrc = (m: ImgImport): string => (typeof m === 'string' ? m : m.src);

export interface CountryDial {
  /** ISO 3166-1 alpha-2, lowercase — also the flag-icons key. */
  iso: string;
  code: string;
  country: string;
  flag: ImgImport;
}

/**
 * Dial codes offered by the phone picker. Syria first (the home market), then the
 * neighbours and the Gulf, then North Africa, then the diaspora countries Syrians
 * most commonly hold numbers in.
 *
 * NOTE the composed «code + local digits» string must stay within the API's 8–16
 * characters (auth.schemas.ts internationalPhone) — every code here is 2–4 chars, so
 * a local number may run 4–14 digits. PhoneField enforces nothing itself; the caller's
 * schema does, against the COMPOSED value.
 */
export const COUNTRY_DIALS: CountryDial[] = [
  { iso: 'sy', code: '+963', country: 'سوريا',            flag: flagSY },
  { iso: 'tr', code: '+90',  country: 'تركيا',            flag: flagTR },
  { iso: 'lb', code: '+961', country: 'لبنان',            flag: flagLB },
  { iso: 'jo', code: '+962', country: 'الأردن',           flag: flagJO },
  { iso: 'iq', code: '+964', country: 'العراق',           flag: flagIQ },
  { iso: 'ps', code: '+970', country: 'فلسطين',           flag: flagPS },
  { iso: 'eg', code: '+20',  country: 'مصر',              flag: flagEG },
  { iso: 'sa', code: '+966', country: 'السعودية',         flag: flagSA },
  { iso: 'ae', code: '+971', country: 'الإمارات',        flag: flagAE },
  { iso: 'kw', code: '+965', country: 'الكويت',           flag: flagKW },
  { iso: 'qa', code: '+974', country: 'قطر',              flag: flagQA },
  { iso: 'bh', code: '+973', country: 'البحرين',          flag: flagBH },
  { iso: 'om', code: '+968', country: 'عُمان',            flag: flagOM },
  { iso: 'ye', code: '+967', country: 'اليمن',            flag: flagYE },
  { iso: 'ly', code: '+218', country: 'ليبيا',            flag: flagLY },
  { iso: 'sd', code: '+249', country: 'السودان',          flag: flagSD },
  { iso: 'dz', code: '+213', country: 'الجزائر',          flag: flagDZ },
  { iso: 'ma', code: '+212', country: 'المغرب',           flag: flagMA },
  { iso: 'tn', code: '+216', country: 'تونس',             flag: flagTN },
  { iso: 'de', code: '+49',  country: 'ألمانيا',          flag: flagDE },
  { iso: 'se', code: '+46',  country: 'السويد',           flag: flagSE },
  { iso: 'nl', code: '+31',  country: 'هولندا',           flag: flagNL },
  { iso: 'dk', code: '+45',  country: 'الدنمارك',         flag: flagDK },
  { iso: 'at', code: '+43',  country: 'النمسا',           flag: flagAT },
  { iso: 'fr', code: '+33',  country: 'فرنسا',            flag: flagFR },
  { iso: 'gb', code: '+44',  country: 'بريطانيا',         flag: flagGB },
  { iso: 'us', code: '+1',   country: 'الولايات المتحدة', flag: flagUS },
  { iso: 'ca', code: '+1',   country: 'كندا',             flag: flagCA },
];

export const DEFAULT_DIAL_CODE = '+963';

/** First entry matching a dial code (+1 resolves to the US, which is the intent). */
function dialFor(code: string): CountryDial {
  return COUNTRY_DIALS.find((c) => c.code === code) ?? COUNTRY_DIALS[0];
}

function Flag({ dial, className }: { dial: CountryDial; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc(dial.flag)}
      alt=""
      aria-hidden
      className={cn('w-5 h-[15px] rounded-[2px] object-cover shrink-0 ring-1 ring-black/10', className)}
    />
  );
}

interface Props {
  /** Dial code, e.g. '+963'. */
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  /** Local digits only — no dial code, no separators. */
  value: string;
  onValueChange: (digits: string) => void;
  id?: string;
  error?: boolean;
  placeholder?: string;
  autoComplete?: string;
}

/**
 * Phone input = country picker + local number, in one bordered control.
 *
 * The picker is a custom listbox rather than a native <select> because no browser
 * renders images inside <option> — a native select can only ever show text, which is
 * how we ended up with unrenderable emoji flags in the first place.
 */
export function PhoneField({
  countryCode,
  onCountryCodeChange,
  value,
  onValueChange,
  id = 'phone',
  error,
  placeholder = '9XX XXX XXXX',
  autoComplete = 'tel-national',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = dialFor(countryCode);

  // Close on outside click / Escape — a dropdown that traps the page is worse than none.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const q = query.trim().toLowerCase();
  const shown = q
    ? COUNTRY_DIALS.filter(
        (c) => c.country.includes(query.trim()) || c.code.includes(q) || c.iso.includes(q),
      )
    : COUNTRY_DIALS;

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={cn(
          'flex items-center rounded-lg border bg-white transition-colors',
          'focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500',
          error ? 'border-red-400' : 'border-gray-300',
        )}
        dir="ltr"
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="رمز الدولة"
          className="shrink-0 flex items-center gap-1.5 bg-gray-50 py-2.5 ps-2.5 pe-2 text-sm text-gray-700 cursor-pointer rounded-s-lg hover:bg-gray-100 transition-colors"
        >
          <Flag dial={selected} />
          <span className="font-medium">{selected.code}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        <div className="w-px self-stretch bg-gray-200" />

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          autoComplete={autoComplete}
          dir="ltr"
          value={value}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ''))}
          className="w-full border-none outline-none py-2.5 px-3 text-[16px] bg-transparent text-gray-900 placeholder-gray-400"
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          dir="rtl"
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن دولة أو رمز…"
                className="w-full ps-8 pe-3 py-2 text-[16px] rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-gray-400">لا توجد نتائج</p>
          ) : (
            shown.map((c) => {
              const isSel = c.iso === selected.iso;
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => { onCountryCodeChange(c.code); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-start transition-colors',
                    isSel ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <Flag dial={c} />
                  <span className="flex-1 truncate">{c.country}</span>
                  <span dir="ltr" className="text-xs text-gray-400 shrink-0">{c.code}</span>
                  {isSel && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
