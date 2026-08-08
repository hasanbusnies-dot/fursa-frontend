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
  const specs   = vehicleSpecs(listing);

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
