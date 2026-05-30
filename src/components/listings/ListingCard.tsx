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

  // ── Homepage view: ONLY homepageShowcaseUntil matters ───────────────────────
  if (isHomepageView) {
    const isHomepageVitrin =
      !!listing.homepageShowcaseUntil &&
      new Date(listing.homepageShowcaseUntil).getTime() > now;

    return (
      <Link
        href={`/listings/${listing.id}`}
        className={cn(
          'group flex flex-row md:block bg-white rounded-xl overflow-hidden transition-all hover:shadow-md',
          isHomepageVitrin
            ? 'ring-2 ring-yellow-400 shadow-sm hover:ring-yellow-500'
            : 'border border-gray-200 hover:border-gray-300',
        )}
      >
        <div className="relative h-28 w-28 shrink-0 md:h-44 md:w-full bg-gray-100 overflow-hidden">
          {primary?.url ? (
            <img src={primary.url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-gray-300" />
            </div>
          )}
          {isHomepageVitrin && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-yellow-400 text-yellow-900 text-[11px] font-extrabold px-2 py-0.5 rounded shadow-md flex items-center gap-1 tracking-wide">
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
        <div className="flex-1 min-w-0 p-3 md:p-4 space-y-1.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{listing.title}</p>
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
        'group flex flex-row md:block bg-white rounded-xl overflow-hidden transition-all hover:shadow-md',
        highlight
          ? 'ring-2 ring-orange-400 shadow-lg bg-orange-50/10 hover:ring-orange-500'
          : showVitrin
            ? 'ring-2 ring-yellow-400 shadow-sm hover:ring-yellow-500'
            : 'border border-gray-200 hover:border-gray-300',
      )}
    >
      {/* Image */}
      <div className="relative h-28 w-28 shrink-0 md:h-44 md:w-full bg-gray-100 overflow-hidden">
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
            <div className="bg-yellow-400 text-yellow-900 text-[11px] font-extrabold px-2 py-0.5 rounded shadow-md flex items-center gap-1 tracking-wide">
              ★ VİTRİN
            </div>
          )}
          {urgent && (
            <div className="animate-pulse bg-red-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded shadow-md flex items-center gap-1 tracking-wide">
              🚨 عاجل
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
        <div className="flex-1 min-w-0 p-3 md:p-4 flex items-start gap-2">
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
        <div className="flex-1 min-w-0 p-3 md:p-4 space-y-1.5">
          {infoContent}
        </div>
      )}
    </Link>
  );
}
