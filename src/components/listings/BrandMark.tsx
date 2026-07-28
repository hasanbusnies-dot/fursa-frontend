'use client';

import { useState } from 'react';
import {
  siAcura, siAudi, siBmw, siBentley, siCadillac, siChevrolet, siChrysler, siCitroen,
  siDacia, siFiat, siFord, siHonda, siHyundai, siInfiniti, siJeep, siKia, siLada, siMg,
  siMaserati, siMazda, siMini, siMitsubishi, siNissan, siOpel, siPeugeot, siPorsche,
  siProton, siRenault, siSkoda, siSubaru, siSuzuki, siToyota, siVolkswagen, siVolvo,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';
// car-brand-logos (MIT-packaged set) — full-color marks for brands Simple Icons dropped.
import cblAlfaRomeo from 'car-brand-logos/alfa-romeo-logo.svg';
import cblByd from 'car-brand-logos/byd-logo.svg';
import cblBrilliance from 'car-brand-logos/brilliance-logo.png';
import cblChangan from 'car-brand-logos/changan-logo.png';
import cblChery from 'car-brand-logos/chery-logo.png';
import cblDfsk from 'car-brand-logos/dfsk-logo.svg';
import cblDaewoo from 'car-brand-logos/daewoo-logo.png';
import cblDaihatsu from 'car-brand-logos/daihatsu-logo.svg';
import cblDodge from 'car-brand-logos/dodge-logo.png';
import cblDongfeng from 'car-brand-logos/dongfeng-logo.png';
import cblGmc from 'car-brand-logos/gmc-logo.png';
import cblGeely from 'car-brand-logos/geely-logo.svg';
import cblGenesis from 'car-brand-logos/genesis-logo.svg';
import cblGreatWall from 'car-brand-logos/great-wall-logo.png';
import cblIsuzu from 'car-brand-logos/isuzu-logo.svg';
import cblJac from 'car-brand-logos/jac-logo.png';
import cblJaguar from 'car-brand-logos/jaguar-logo.svg';
import cblJetour from 'car-brand-logos/jetour-logo.svg';
import cblLandRover from 'car-brand-logos/land-rover-logo.svg';
import cblLexus from 'car-brand-logos/lexus-logo.png';
import cblLincoln from 'car-brand-logos/lincoln-logo.svg';
import cblMaybach from 'car-brand-logos/maybach-logo.png';
import cblMercedesBenz from 'car-brand-logos/mercedes-benz-logo.svg';
import cblRover from 'car-brand-logos/rover-logo.png';
import cblSaab from 'car-brand-logos/saab-logo.png';
import cblSsangYong from 'car-brand-logos/ssangyong-logo.png';
import cblZotye from 'car-brand-logos/zotye-logo.png';

// ═══════════════════════════════════════════════════════════════════════════════
// THE vehicle brand mark — shared by the add-listing brand picker (Step0Catalog,
// catalog nodes) and the browse brand filter (FilterSidebar, plain name strings).
//
// Keyed by the brand NAME, never the slug: normBrand() strips accents/punctuation so
// "Citroën", "Citroen" and "citroen" all resolve, which is what lets both surfaces —
// one fed by the catalog API, the other by the static CAR_CATALOG + hardcoded arrays —
// share one lookup with no data migration.
// ═══════════════════════════════════════════════════════════════════════════════

// Normalize a brand name to a logo-map key, accent-insensitive.
//   "Citroën"/"Citroen" → citroen, "Mercedes-Benz" → mercedesbenz, "MG" → mg
export const normBrand = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Brand name (normalized) → Simple Icons mark. ~34 of the 69 vehicle brands are covered;
// the rest (Mercedes-Benz, Land Rover, Jaguar, GMC, BYD, …) fall through to the set below.
const BRAND_LOGOS: Record<string, SimpleIcon> = {
  acura: siAcura, audi: siAudi, bmw: siBmw, bentley: siBentley, cadillac: siCadillac,
  chevrolet: siChevrolet, chrysler: siChrysler, citroen: siCitroen, dacia: siDacia,
  fiat: siFiat, ford: siFord, honda: siHonda, hyundai: siHyundai, infiniti: siInfiniti,
  jeep: siJeep, kia: siKia, lada: siLada, mg: siMg, maserati: siMaserati, mazda: siMazda,
  mini: siMini, mitsubishi: siMitsubishi, nissan: siNissan, opel: siOpel, peugeot: siPeugeot,
  porsche: siPorsche, proton: siProton, renault: siRenault, skoda: siSkoda, subaru: siSubaru,
  suzuki: siSuzuki, toyota: siToyota, volkswagen: siVolkswagen, volvo: siVolvo,
};

// Brand-tinted logo fill: use the logo's own hex, but if it's too light to read on the
// light circle (e.g. Opel's near-yellow, Renault's gold) fall back to gray-700 so no mark
// ever vanishes. Relative luminance via the standard 0.299/0.587/0.114 weights.
function logoFill(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78 ? '#374151' : `#${hex}`;
}

// Image imports resolve to a StaticImageData object ({ src }) for png and `any` (also a
// StaticImageData at runtime) for svg — normalize both to a plain URL string.
type ImgImport = string | { src: string };
const imgSrc = (m: ImgImport): string => (typeof m === 'string' ? m : m.src);

// Brand name (normalized) → car-brand-logos full-color asset. Fills the gaps Simple Icons
// dropped (Mercedes-Benz, Land Rover, Lexus, GMC, …). 7 niche brands remain on the avatar.
const CAR_LOGO_FILES: Record<string, ImgImport> = {
  alfaromeo: cblAlfaRomeo, byd: cblByd, brilliance: cblBrilliance, changan: cblChangan,
  chery: cblChery, dfsk: cblDfsk, daewoo: cblDaewoo, daihatsu: cblDaihatsu, dodge: cblDodge,
  dongfeng: cblDongfeng, gmc: cblGmc, geely: cblGeely, genesis: cblGenesis, greatwall: cblGreatWall,
  isuzu: cblIsuzu, jac: cblJac, jaguar: cblJaguar, jetour: cblJetour, landrover: cblLandRover,
  lexus: cblLexus, lincoln: cblLincoln, maybach: cblMaybach, mercedesbenz: cblMercedesBenz,
  rover: cblRover, saab: cblSaab, ssangyong: cblSsangYong, zotye: cblZotye,
};

/** Size presets — the picker rows use `md`, the denser filter list uses `sm`. */
const SIZES = {
  sm: { box: 'w-5 h-5', img: 'w-3.5 h-3.5', svg: 'w-3 h-3',   text: 'text-[10px]' },
  md: { box: 'w-7 h-7', img: 'w-5 h-5',     svg: 'w-4 h-4',   text: 'text-xs'     },
} as const;

export type BrandMarkSize = keyof typeof SIZES;

// A logo image inside the standard brand-mark circle (used for iconUrl + car-brand-logos).
function CircleImg({ src, size, onError }: { src: string; size: BrandMarkSize; onError: () => void }) {
  const s = SIZES[size];
  return (
    <span className={`${s.box} rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={`${s.img} object-contain`} onError={onError} />
    </span>
  );
}

// Initial-letter avatar — the universal fallback (also used as-is for MODEL nodes).
function LetterAvatar({ label, size }: { label: string; size: BrandMarkSize }) {
  const s = SIZES[size];
  return (
    <span className={`${s.box} ${s.text} rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0`}>
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Render priority:
 *   (a) `iconUrl` — a catalog-supplied Category.icon (future-proof, DB-populated)
 *   (b) Simple Icons mark, brand-tinted (its 34 brands)
 *   (c) car-brand-logos full-color asset (fills the gaps Simple Icons dropped)
 *   (d) initial-letter avatar (the few brands neither set covers)
 *
 * `name` should be the LATIN brand name ("Toyota"), which both the catalog's `node.name`
 * and the filter's static arrays already are. `label` is what the letter avatar falls
 * back to — pass the Arabic display name when it differs.
 */
export function BrandMark({
  name,
  label,
  iconUrl,
  size = 'md',
}: {
  name: string;
  label?: string;
  iconUrl?: string | null;
  size?: BrandMarkSize;
}) {
  const [iconFailed, setIconFailed] = useState(false);
  const [cblFailed, setCblFailed] = useState(false);

  const key = normBrand(name);
  const url = iconUrl && /^https?:\/\//i.test(iconUrl) ? iconUrl : null;

  if (url && !iconFailed) {
    return <CircleImg src={url} size={size} onError={() => setIconFailed(true)} />;
  }

  const si = BRAND_LOGOS[key];
  if (si) {
    const s = SIZES[size];
    return (
      <span className={`${s.box} rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
        <svg role="img" viewBox="0 0 24 24" aria-hidden="true" className={s.svg} fill={logoFill(si.hex)}>
          <path d={si.path} />
        </svg>
      </span>
    );
  }

  const cbl = CAR_LOGO_FILES[key];
  if (cbl && !cblFailed) {
    return <CircleImg src={imgSrc(cbl)} size={size} onError={() => setCblFailed(true)} />;
  }

  return <LetterAvatar label={label || name} size={size} />;
}
