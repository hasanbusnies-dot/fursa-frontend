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

interface SpecChip {
  key: string;
  text: string;
  tone: SpecTone;
}

const SPEC_CHIP_BASE =
  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums';

const SPEC_CHIP_TONE: Record<SpecTone, string> = {
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
}

export function ListingCard({
  listing,
  initialFavorited,
  onFavoriteToggle,
  showCompare = true,
  isHomepageView = false,
  showcaseContext,
  buttonsPlacement = 'overlay',
}: ListingCardProps) {
  const primary = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const now     = Date.now();
  // Computed before the homepage branch returns: BOTH layouts render the chips,
  // so a car looks like a car wherever it is shown.
  // Vehicles win the tie — they have bespoke fields (vehicleDetails) rather than
  // catalog attributes — and everything else falls through to the catalog-driven
  // chips, which stay empty for the roots that declare none of those keys.
  const vehicle = vehicleSpecs(listing);
  const specs   = vehicle.length > 0 ? vehicle : realEstateSpecs(listing);

  // ── Homepage view: ONLY homepageShowcaseUntil matters ───────────────────────
  if (isHomepageView) {
    const isHomepageVitrin =
      !!listing.homepageShowcaseUntil &&
      new Date(listing.homepageShowcaseUntil).getTime() > now;

    return (
      <Link
        href={`/listings/${listing.id}`}
        className={cn(
          'group flex flex-row md:block bg-white rounded-card overflow-hidden transition-all',
          isHomepageVitrin
            ? 'ring-2 ring-yellow-400 shadow-pebble hover:ring-yellow-500'
            : 'shadow-pebble hover:shadow-pebble-hover',
        )}
      >
        <div className="relative h-28 w-28 shrink-0 md:h-36 md:w-full bg-gray-100 overflow-hidden">
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
        'group flex flex-row md:block bg-white rounded-card overflow-hidden transition-all',
        highlight
          ? 'ring-2 ring-amber-400 shadow-lg bg-yellow-400/5 hover:ring-yellow-400'
          : showVitrin
            ? 'ring-2 ring-yellow-400 shadow-pebble hover:ring-yellow-500'
            : 'shadow-pebble hover:shadow-pebble-hover',
      )}
    >
      {/* Image */}
      <div className="relative h-28 w-28 shrink-0 md:h-36 md:w-full bg-gray-100 overflow-hidden">
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
