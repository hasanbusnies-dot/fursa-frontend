import Link from 'next/link';
import { MapPin, Clock, ImageOff } from 'lucide-react';
import type { Listing } from '@/types';
import { FavoriteButton } from './FavoriteButton';
import { CompareButton } from './CompareButton';
import { cn } from '@/lib/utils';

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US').format(price);
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

/**
 * ── Vehicle spec chips ────────────────────────────────────────────────────────
 * «2018» «85,000 كم» «أوتوماتيك» as three small chips under the title.
 *
 * PALETTE — two tones, not three. The card already spends its colour budget on
 * the gold ★واجهة badge, the orange عاجل badge and the blue price, and these
 * chips repeat across a whole grid, so three competing hues would read as noise
 * rather than as data. Instead the brand gold marks ONE chip and a cool neutral
 * carries the rest:
 *
 *   gold  #FFF6D1 bg / #6B5200 text  — both derived from the brand gold #ffcb00
 *                                      (18% and 42% respectively), so the accent
 *                                      is the logo colour, not a yellow-ish guess
 *   slate #F1F5F9 bg / #334155 text  — a cool counterweight that stays out of the
 *                                      way of the blue price
 *
 * Gold lands on the YEAR deliberately: in a used-vehicle market that is the spec
 * buyers scan first, so the colour encodes hierarchy instead of decorating. Both
 * pairs clear WCAG AAA at this size (≈6.8:1 and ≈9.4:1), which is what makes the
 * tints safe at 11px — a saturated #ffcb00 fill would not have been.
 *
 * The chips use a 6px radius while the promo badges above use rounded-full: same
 * card, different KIND of information, so the shape says "data" not "promotion".
 *
 * DATA: `vehicleDetails` rides on the LIST payload already (null for
 * non-vehicles) so none of this needs a backend change. The top-level
 * `year`/`mileage` fields are a WRITE-side shape — CreateListingPayload sends
 * them flat and the backend files them under vehicleDetails, so reads come back
 * null at the top level. Both are checked anyway, matching ComparePopover's
 * idiom, so the card keeps working if a payload ever carries the flat form.
 *
 * Returns [] when there is nothing worth showing, so non-vehicle cards render
 * exactly as before rather than gaining an empty row.
 */
type SpecTone = 'gold' | 'slate';

export interface SpecChip {
  key: string;
  text: string;
  tone: SpecTone;
}

export const SPEC_CHIP_BASE =
  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums';

export const SPEC_CHIP_TONE: Record<SpecTone, string> = {
  gold:  'bg-[#FFF6D1] text-[#6B5200] border-[#FFEDA6]',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function vehicleSpecs(listing: Listing): SpecChip[] {
  const vd = listing.vehicleDetails;
  const year = vd?.year ?? listing.year;
  const km = vd?.mileage ?? listing.mileage;
  const gearbox = vd?.transmission;

  const chips: SpecChip[] = [];
  if (year) chips.push({ key: 'year', text: String(year), tone: 'gold' });
  // Thousands separators make six-digit odometers readable at a glance.
  if (typeof km === 'number') {
    chips.push({ key: 'km', text: `${new Intl.NumberFormat('en-US').format(km)} كم`, tone: 'slate' });
  }
  if (gearbox) {
    chips.push({ key: 'gear', text: TRANSMISSION_AR[gearbox] ?? gearbox, tone: 'slate' });
  }
  return chips;
}

/** Gearbox enum → Arabic. Unknown values fall through to the raw string rather
 *  than being dropped, so a new backend enum degrades to English, not silence. */
const TRANSMISSION_AR: Record<string, string> = {
  MANUAL: 'يدوي',
  AUTOMATIC: 'أوتوماتيك',
  SEMI_AUTOMATIC: 'نصف أوتوماتيك',
  CVT: 'CVT',
};

/**
 * ── Real-estate spec chips ────────────────────────────────────────────────────
 * «140 م²» «3+1» «الطابق 2» — the property mirror of the vehicle chips above,
 * sharing their tokens and their two-tone palette. Gold lands on AREA for the
 * same reason it lands on year for cars: it is the spec buyers scan first, so
 * the accent encodes hierarchy rather than decorating a second thing.
 *
 * DETECTION — by attribute key, not by category. The LIST payload carries only
 * the LEAF category (`{ slug: 'apartment-for-sale' }`), never its root, so the
 * card cannot ask "is this real-estate?" the way a page can via `getPath`. It
 * doesn't need to: `area` / `rooms` / `floor` are declared ONLY under the
 * real-estate tree — verified against the live catalog across all 19 roots — so
 * their presence IS the category signal. That also keeps §4.1 intact: no
 * hardcoded per-category branch, just the catalog's own keys rendered as they
 * come. Vehicles are checked first and keep their own chips regardless.
 *
 * OPAQUE VALUES — `rooms` and `floor` are SELECT values, so they are printed
 * VERBATIM and never parsed or coerced. The live option sets are exactly why:
 *   rooms → 'استوديو (1+0)', '3.5+1', 'أكثر من 10'
 *   floor → 'قبو', 'طابق أرضي', '11-15', '30+'
 * Any attempt to read a number out of those loses or mangles most of the range.
 *
 * The «الطابق» prefix is therefore CONDITIONAL: it reads correctly only in front
 * of a number («الطابق 5»), while the two textual options would produce broken
 * Arabic («الطابق طابق أرضي»). Digit-leading values take the prefix — which also
 * covers the banded options, «الطابق 11-15» being perfectly idiomatic — and
 * anything else renders bare, as its own complete label.
 *
 * `area` is the one genuine number (RANGE widget, single-valued on the write
 * side: 140, not 100–150) and gets the m² unit plus thousands separators, which
 * land plots need far more than apartments do.
 *
 * Missing keys are simply skipped, exactly like the vehicle chips: land carries
 * area alone, commercial area + floor, a farmhouse may have no floor at all.
 */
function realEstateSpecs(listing: Listing): SpecChip[] {
  // `attributes` is typed Record<string, string>, but the JSONB genuinely holds
  // mixed scalars (area is a number, balcony a boolean). Same local widening
  // ListingDetailClient uses rather than loosening the shared type.
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;

  const chips: SpecChip[] = [];

  const area = attrs.area;
  const areaNum = typeof area === 'number' ? area : typeof area === 'string' ? Number(area) : NaN;
  if (Number.isFinite(areaNum) && areaNum > 0) {
    chips.push({
      key: 'area',
      text: `${new Intl.NumberFormat('en-US').format(areaNum)} م²`,
      tone: 'gold',
    });
  }

  const rooms = attrText(attrs.rooms);
  if (rooms) chips.push({ key: 'rooms', text: rooms, tone: 'slate' });

  const floor = attrText(attrs.floor);
  if (floor) {
    chips.push({
      key: 'floor',
      text: /^\d/.test(floor) ? `الطابق ${floor}` : floor,
      tone: 'slate',
    });
  }

  return chips;
}

/** An attribute rendered as text: strings pass through untouched (they are
 *  opaque catalog values), finite numbers stringify, everything else is absent.
 *  Never interprets the value — see the note above. */
function attrText(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * ── Catalog-attribute spec chips (every other root) ───────────────────────────
 * The same idea as the real-estate chips above, generalised: a small declarative
 * table of the 2–3 keys a buyer scans first per family of categories.
 *
 * DETECTION — by attribute key, exactly as realEstateSpecs does it and for the
 * same reason (the list payload carries only the LEAF category, never its root).
 * Every group's `match` keys were verified against the live catalog across all
 * 19 roots to be declared under ONE root only, so their presence IS the category
 * signal. The `match` sets are mutually disjoint, so the array order below is
 * documentation, not precedence — no group can shadow another.
 *
 * Keys that are merely RENDERED may repeat across groups (`experience` belongs to
 * both jobs and helpers, `color` to both fashion and electronics); only the match
 * keys must be exclusive, which is why the two lists are separate.
 *
 * OPAQUE VALUES — SELECT values print VERBATIM, never parsed or coerced, same
 * rule as rooms/floor. `screenSize` is why the rule matters here: its live
 * options are '32', '40-43' and '75+', so a unit is APPENDED to the string
 * ('40-43 بوصة') rather than a number being read out of it. Only genuine RANGE
 * widgets (`year`, `workingHours`, `power`) go through numeric formatting.
 *
 * DELIBERATELY ABSENT — `condition`. It is the most widely declared key in the
 * catalog (11 of 18 roots) and looks like the obvious badge, but it DUPLICATES
 * the top-level `listing.condition` column: the wizard writes the catalog filter
 * into `attributes` and posts the column separately, so the two can disagree —
 * and on live data they already do (listing 100000041 is column USED, attribute
 * 'جديد'). Badging the attribute would surface the wrong one. `warranty` is out
 * for a different reason: its options are 'نعم' / 'لا', so a faithful chip reads
 * «نعم», and making it read «كفالة» would mean interpreting an opaque value.
 */
type SpecFormat =
  | { kind: 'text' }                      // opaque SELECT → verbatim
  | { kind: 'suffix'; unit: string }       // opaque SELECT → verbatim + unit
  | { kind: 'prefix'; label: string }      // opaque SELECT → label + verbatim
  // Genuine RANGE → digits. `group: false` for counters that are not quantities:
  // a year is 2019, never 2,019 — the same bare rendering the vehicle chips use.
  | { kind: 'number'; unit?: string; group?: boolean }
  | { kind: 'flag'; label: string };       // BOOLEAN → the label, when true

interface AttributeSpecGroup {
  id: string;
  /** Keys declared under this root ALONE — their presence identifies the group. */
  match: string[];
  /** Keys to render, in scan order. The first one present takes the gold accent. */
  keys: { key: string; format: SpecFormat }[];
}

const ATTRIBUTE_SPEC_GROUPS: AttributeSpecGroup[] = [
  { id: 'professional-equipment',
    match: ['workingHours', 'power', 'generatorFuel', 'year'],
    keys: [
      { key: 'year',          format: { kind: 'number', group: false } },
      { key: 'workingHours',  format: { kind: 'number', unit: 'ساعة' } },
      { key: 'power',         format: { kind: 'number', unit: 'kVA' } },
      { key: 'generatorFuel', format: { kind: 'text' } },
    ] },
  { id: 'electronic-devices',
    match: ['storage', 'ram', 'processor', 'screenSize', 'smartTv'],
    keys: [
      { key: 'storage',    format: { kind: 'text' } },
      { key: 'ram',        format: { kind: 'text' } },
      { key: 'screenSize', format: { kind: 'suffix', unit: 'بوصة' } },
      { key: 'processor',  format: { kind: 'text' } },
      { key: 'smartTv',    format: { kind: 'flag', label: 'شاشة ذكية' } },
    ] },
  { id: 'fashion',
    match: ['size', 'shoeSize'],
    keys: [
      { key: 'size',     format: { kind: 'prefix', label: 'مقاس' } },
      { key: 'shoeSize', format: { kind: 'prefix', label: 'مقاس' } },
      { key: 'color',    format: { kind: 'text' } },
    ] },
  { id: 'job-listings',
    match: ['workType', 'postType', 'education'],
    keys: [
      { key: 'workType',   format: { kind: 'text' } },
      { key: 'experience', format: { kind: 'text' } },
      { key: 'education',  format: { kind: 'text' } },
    ] },
  { id: 'helpers',
    match: ['workTime'],
    keys: [
      { key: 'workTime',   format: { kind: 'text' } },
      { key: 'experience', format: { kind: 'text' } },
    ] },
  { id: 'private-lessons',
    match: ['mode', 'groupType', 'tutorGender', 'subject', 'level', 'instrument'],
    keys: [
      { key: 'subject',     format: { kind: 'text' } },
      { key: 'mode',        format: { kind: 'text' } },
      { key: 'groupType',   format: { kind: 'text' } },
      { key: 'tutorGender', format: { kind: 'text' } },
    ] },
  { id: 'pets-and-plants',
    match: ['age', 'gender', 'vaccinated'],
    keys: [
      { key: 'age',        format: { kind: 'text' } },
      { key: 'gender',     format: { kind: 'text' } },
      { key: 'vaccinated', format: { kind: 'flag', label: 'ملقّح' } },
    ] },
  { id: 'services',
    match: ['providerType', 'priceType'],
    keys: [
      { key: 'providerType', format: { kind: 'text' } },
      { key: 'priceType',    format: { kind: 'text' } },
    ] },
];

/** At most three chips, the same ceiling the vehicle and real-estate rows use. */
const MAX_ATTRIBUTE_CHIPS = 3;

/** A value that would render as a chip. `false` is absence, not a value — a
 *  cleared BOOLEAN must not identify a group or occupy a slot. */
function hasRenderableValue(v: unknown): boolean {
  return v === true || attrText(v) !== null;
}

function formatSpec(v: unknown, format: SpecFormat): string | null {
  if (format.kind === 'flag') return v === true ? format.label : null;

  if (format.kind === 'number') {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (!Number.isFinite(n) || n <= 0) return null;
    const text = format.group === false
      ? String(n)
      : new Intl.NumberFormat('en-US').format(n);
    return format.unit ? `${text} ${format.unit}` : text;
  }

  const text = attrText(v);
  if (!text) return null;
  if (format.kind === 'suffix') return `${text} ${format.unit}`;
  if (format.kind === 'prefix') return `${format.label} ${text}`;
  return text;
}

function attributeSpecs(listing: Listing): SpecChip[] {
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;

  const group = ATTRIBUTE_SPEC_GROUPS.find((g) =>
    g.match.some((k) => hasRenderableValue(attrs[k])),
  );
  if (!group) return [];

  const chips: SpecChip[] = [];
  for (const { key, format } of group.keys) {
    if (chips.length >= MAX_ATTRIBUTE_CHIPS) break;
    const text = formatSpec(attrs[key], format);
    // Gold marks the most-scanned spec PRESENT, so a TV with no storage still
    // gets an accent on its screen size. (Real-estate pins gold to `area`
    // specifically and is left exactly as it was.)
    if (text) chips.push({ key, text, tone: chips.length === 0 ? 'gold' : 'slate' });
  }
  return chips;
}

/**
 * The chips for a listing, whatever kind it is: vehicles first, then real-estate,
 * then the catalog-attribute groups above.
 *
 * Exported because the browse map's cluster sheet lists the same listings in a
 * compact row and must show the SAME specs — extracted as one function rather
 * than copied so the two surfaces cannot drift. The precedence (a vehicle keeps
 * its own chips regardless) is the rule the card has always applied; this is
 * where it now lives.
 */
export function listingSpecChips(listing: Listing): SpecChip[] {
  const vehicle = vehicleSpecs(listing);
  if (vehicle.length > 0) return vehicle;

  const realEstate = realEstateSpecs(listing);
  if (realEstate.length > 0) return realEstate;

  return attributeSpecs(listing);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ListingCardProps {
  listing: Listing;
  /** Pre-seed the favorite star state without a check API call */
  initialFavorited?: boolean;
  /** Called after a successful toggle with the new favorited value */
  onFavoriteToggle?: (listingId: string, favorited: boolean) => void;
  /** Show the Compare button. Default true; pass false on the homepage. */
  showCompare?: boolean;
  /**
   * When true the card is rendered inside the Homepage Showcase grid.
   * Only listings with an active homepageShowcaseUntil get special styling;
   * all other doping flags (hasHighlightFrame, isUrgent, categoryShowcaseUntil)
   * are fully suppressed so non-showcase backfill cards look completely plain.
   *
   * When false/undefined (search/filter pages) all flags render normally.
   */
  isHomepageView?: boolean;
  /**
   * On the /listings page, pass 'category' when a categoryId is active so the
   * Kategori Vitrini badge shows for categoryShowcaseUntil listings.
   */
  showcaseContext?: 'category';
  /**
   * 'overlay' (default) = favorite/compare buttons absolutely positioned over
   * the image. 'side' = buttons rendered in the info area, opposite the image
   * (used by the category-page mobile list view so the image stays clean).
   */
  buttonsPlacement?: 'overlay' | 'side';
  /**
   * How the card stacks BELOW md. From md up both values render identically —
   * image on top, text under it — so this never affects desktop.
   *
   * 'auto' (default): a horizontal row on a phone (112px thumbnail beside the
   *   text), becoming the stacked card from md up. This is the shape the list
   *   view wants — one full-width listing per row.
   * 'stacked': the card shape at EVERY width. Two of these fit side by side on a
   *   phone; two row cards do not (a 112px thumbnail in a ~160px column leaves
   *   nothing for the text). The grid view passes this.
   */
  layout?: 'auto' | 'stacked';
}

export function ListingCard({
  listing,
  initialFavorited,
  onFavoriteToggle,
  showCompare = true,
  isHomepageView = false,
  showcaseContext,
  buttonsPlacement = 'overlay',
  layout = 'auto',
}: ListingCardProps) {
  const primary = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const now     = Date.now();

  // The only difference between the two layouts, and only below md — from that
  // breakpoint up both resolve to the same stacked card, so desktop is untouched.
  const shellLayout = layout === 'stacked' ? 'block' : 'flex flex-row md:block';
  const imageLayout = layout === 'stacked'
    ? 'h-36 w-full'
    : 'h-28 w-28 shrink-0 md:h-36 md:w-full';
  // Computed before the homepage branch returns: BOTH layouts render the chips,
  // so a car looks like a car wherever it is shown.
  // Vehicles win the tie — they have bespoke fields (vehicleDetails) rather than
  // catalog attributes — and everything else falls through to the catalog-driven
  // chips, which stay empty for the roots that declare none of those keys.
  const specs = listingSpecChips(listing);

  // ── Homepage view: ONLY homepageShowcaseUntil matters ───────────────────────
  if (isHomepageView) {
    const isHomepageVitrin =
      !!listing.homepageShowcaseUntil &&
      new Date(listing.homepageShowcaseUntil).getTime() > now;

    return (
      <Link
        href={`/listings/${listing.id}`}
        className={cn(
          'group bg-white rounded-card overflow-hidden transition-all',
        shellLayout,
          isHomepageVitrin
            ? 'ring-2 ring-yellow-400 shadow-pebble hover:ring-yellow-500'
            : 'shadow-pebble hover:shadow-pebble-hover',
        )}
      >
        <div className={cn('relative bg-gray-100 overflow-hidden', imageLayout)}>
          {primary?.url ? (
            <img src={primary.url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-gray-300" />
            </div>
          )}
          {isHomepageVitrin && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-yellow-400 text-yellow-900 text-[11px] font-extrabold font-heading px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 tracking-wide">
                ★ VİTRİN
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={initialFavorited}
              variant="card"
              onToggle={(fav) => onFavoriteToggle?.(listing.id, fav)}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 p-2.5 space-y-1.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{listing.title}</p>
          {specs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {specs.map((chip) => (
                <span key={chip.key} className={cn(SPEC_CHIP_BASE, SPEC_CHIP_TONE[chip.tone])}>
                  {chip.text}
                </span>
              ))}
            </div>
          )}
          <p className="text-base font-bold text-blue-600">{formatPrice(listing.price, listing.currency)}</p>
          <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.city}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(listing.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  // ── Default view: all doping flags apply (search / filter pages) ─────────────
  const urgent    = !!listing.urgentUntil   && new Date(listing.urgentUntil).getTime()   > now;
  const highlight = !!listing.highlightUntil && new Date(listing.highlightUntil).getTime() > now;
  const showVitrin =
    showcaseContext === 'category' &&
    !!listing.categoryShowcaseUntil &&
    new Date(listing.categoryShowcaseUntil).getTime() > now;

  // Shared title/price/meta markup — reused by both the overlay and side layouts
  // so the overlay (default) DOM stays byte-identical.
  const infoContent = (
    <>
      <p className={cn(
        'text-sm leading-snug line-clamp-2',
        highlight ? 'font-extrabold text-black' : 'font-semibold text-gray-900',
      )}>
        {listing.title}
      </p>
      {specs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {specs.map((chip) => (
            <span key={chip.key} className={cn(SPEC_CHIP_BASE, SPEC_CHIP_TONE[chip.tone])}>
              {chip.text}
            </span>
          ))}
        </div>
      )}
      <p className="text-base font-bold text-blue-600">
        {formatPrice(listing.price, listing.currency)}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {listing.city}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(listing.createdAt)}
        </span>
      </div>
    </>
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        'group bg-white rounded-card overflow-hidden transition-all',
        shellLayout,
        highlight
          ? 'ring-2 ring-amber-400 shadow-lg bg-yellow-400/5 hover:ring-yellow-400'
          : showVitrin
            ? 'ring-2 ring-yellow-400 shadow-pebble hover:ring-yellow-500'
            : 'shadow-pebble hover:shadow-pebble-hover',
      )}
    >
      {/* Image */}
      <div className={cn('relative bg-gray-100 overflow-hidden', imageLayout)}>
        {primary?.url ? (
          <img
            src={primary.url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Top-left badge stack */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {showVitrin && (
            <div className="bg-yellow-400 text-yellow-900 text-[11px] font-extrabold font-heading px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 tracking-wide">
              ★ VİTRİN
            </div>
          )}
          {urgent && (
            <div className="animate-pulse bg-yellow-400 text-yellow-900 text-[11px] font-extrabold font-heading px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 tracking-wide">
              ⚡ عاجل
            </div>
          )}
        </div>

        {/* Action buttons (overlay placement) */}
        {buttonsPlacement === 'overlay' && (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={initialFavorited}
              variant="card"
              onToggle={(fav) => onFavoriteToggle?.(listing.id, fav)}
            />
            {showCompare && <CompareButton listing={listing} variant="card" />}
          </div>
        )}
      </div>

      {/* Info */}
      {buttonsPlacement === 'side' ? (
        <div className="flex-1 min-w-0 p-2.5 flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            {infoContent}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={initialFavorited}
              variant="card"
              onToggle={(fav) => onFavoriteToggle?.(listing.id, fav)}
              className="border border-gray-200"
            />
            {showCompare && <CompareButton listing={listing} variant="card" className="border border-gray-200" />}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 p-2.5 space-y-1.5">
          {infoContent}
        </div>
      )}
    </Link>
  );
}
