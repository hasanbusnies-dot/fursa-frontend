/**
 * Server-side metadata for the listing detail route.
 *
 * Split out of `page.tsx` so the fetch and the tag-building are testable and so
 * the page file stays a thin server shell over the client component.
 */

import type { Metadata } from 'next';
import type { Listing } from '@/types';
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_SIZE,
  SITE_URL,
  isShareable,
  listingUrl,
  shareSubtitle,
} from '@/lib/share';

const SITE_NAME = 'فرصة | fursago';
const GENERIC_TITLE = 'إعلان على فرصة';
const GENERIC_DESCRIPTION =
  'فرصة — سوق الإعلانات المبوبة في سوريا. بيع واشترِ كل شيء بسهولة.';

/**
 * Fetch just enough of the listing to build tags.
 *
 * Uses a plain `fetch` rather than `services/api.ts` on purpose: that wrapper
 * carries realm resolution, token reading and 401-redirect behaviour that mean
 * nothing on a crawler request, and `GET /listings/:id` is public (verified: 200
 * with no auth header). Never throws — a metadata failure must degrade to a
 * generic card, never take the page down with it.
 */
export async function fetchListingForMetadata(id: string): Promise<Listing | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/listings/${encodeURIComponent(id)}`, {
      // Short shared cache: a crawler and a human hitting the same URL within a
      // few seconds shouldn't cost two upstream calls, but a price edit should
      // surface quickly.
      next: { revalidate: 60 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    // REST endpoints return { success, data }; tolerate a bare object too.
    return (body?.data ?? body) as Listing;
  } catch {
    return null;
  }
}

/** Primary photo, else the first, else null. Absolute Supabase URLs already. */
function primaryImageUrl(listing: Listing): string | null {
  const images = listing.images ?? [];
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  const url = primary?.url?.trim();
  // Only absolute https survives: a relative path would resolve against
  // metadataBase and 404 for the crawler.
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Read pixel dimensions out of an image's header bytes.
 *
 * WHY THIS EXISTS: `og:image:width`/`height` materially improve how WhatsApp and
 * other scrapers render a preview — a scraper that has to download and probe the
 * image itself will often skip it and fall back to a text-only card, which is
 * exactly the symptom we saw. The listing image record carries only
 * `{id, url, altText, isPrimary, sortOrder, …}` — no dimensions — so there is
 * nothing to read them from and they have to come off the wire.
 *
 * Bounded on purpose: a RANGE request for the first 64 KB, which is far more
 * than any header needs, so a 5 MB seller photo costs a few KB here. Fails soft
 * — no dimensions is strictly better than no page.
 */
async function probeImageSize(
  url: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { range: 'bytes=0-65535' },
      next: { revalidate: 3600 },
    });
    // 206 = range honoured, 200 = server ignored it and sent the whole file.
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return parseImageSize(buf);
  } catch {
    return null;
  }
}

/** JPEG / PNG / WebP header parsing. Returns null for anything unrecognised. */
function parseImageSize(b: Uint8Array): { width: number; height: number } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];

  // PNG: 8-byte signature, then IHDR with width/height as big-endian uint32.
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }

  // WebP: 'RIFF' .... 'WEBP' then a VP8 / VP8L / VP8X chunk, each with its own
  // dimension encoding.
  if (b.length > 30 && b[0] === 0x52 && b[8] === 0x57 && b[9] === 0x45) {
    const dv = new DataView(b.buffer, b.byteOffset);
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === 'VP8X') {
      return {
        width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      };
    }
    if (fourcc === 'VP8 ') {
      return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    }
    if (fourcc === 'VP8L') {
      const bits = dv.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }

  // JPEG: walk the marker chain to the start-of-frame, which carries the size.
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0-3 / SOF5-7 / SOF9-11 / SOF13-15 all carry height then width at +5.
      // C4 (DHT), C8 (JPG) and CC (DAC) sit in the same range but do NOT.
      if (
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      ) {
        return { height: u16(i + 5), width: u16(i + 7) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break; // end of header section
      const len = u16(i + 2);
      if (len < 2) break; // malformed — bail rather than loop forever
      i += 2 + len;
    }
  }

  return null;
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build the tag set.
 *
 * Two shapes only:
 *  · ACTIVE listing  → full card: title, location+teaser description (NO price),
 *    its own photo with probed dimensions.
 *  · anything else   → generic card, NO listing photo, and `noindex`. Covers a
 *    missing listing, a fetch failure, and — the case that actually matters —
 *    a PENDING_REVIEW/REJECTED listing, which the backend still serves publicly.
 */
export async function buildListingMetadata(
  listing: Listing | null,
  id: string,
): Promise<Metadata> {
  const url = listingUrl(id);

  if (!listing || !isShareable(listing.status)) {
    return {
      title: GENERIC_TITLE,
      description: GENERIC_DESCRIPTION,
      alternates: { canonical: url },
      // Never let an unapproved or missing listing into an index or a rich card.
      robots: { index: false, follow: false },
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: GENERIC_TITLE,
        description: GENERIC_DESCRIPTION,
        url,
        locale: 'ar_AR',
        images: [
          {
            url: DEFAULT_OG_IMAGE,
            // Only when the origin really is https — on a localhost dev origin an
        // `og:image:secure_url` carrying http:// is a contradiction.
        secureUrl: SITE_URL.startsWith('https://')
          ? `${SITE_URL}${DEFAULT_OG_IMAGE}`
          : undefined,
            type: 'image/png',
            ...DEFAULT_OG_IMAGE_SIZE,
            alt: SITE_NAME,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title: GENERIC_TITLE,
        description: GENERIC_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }

  const title = truncate(listing.title, 80);
  // NO PRICE — location plus a teaser from the body. A preview that already says
  // how much gives the recipient no reason to open the listing. See ShareSubject.
  const subtitle = shareSubtitle({ title: listing.title, city: listing.city });
  const body = listing.description ? truncate(listing.description, 140) : '';
  const description = truncate([subtitle, body].filter(Boolean).join(' — '), 200)
    || GENERIC_DESCRIPTION;

  const photo = primaryImageUrl(listing);

  // Dimensions are probed off the wire because the image record does not store
  // them, and scrapers render the card far more reliably when width/height are
  // declared. A failed probe degrades to a URL-only image tag, never an error.
  const size = photo ? await probeImageSize(photo) : null;

  // A listing photo is whatever the seller uploaded — portrait, tiny, anything.
  // Declaring `summary_large_image` for one of those gets it centre-cropped into
  // a banner, so the large card is claimed ONLY for the branded 1200×630 default,
  // whose dimensions actually fit it.
  const image = photo
    ? {
        url: photo,
        // `og:image:secure_url` is the https-explicit twin of og:image. Some
        // scrapers look for it specifically before rendering a preview.
        secureUrl: photo.startsWith('https://') ? photo : undefined,
        ...(size ?? {}),
        alt: title,
      }
    : {
        url: DEFAULT_OG_IMAGE,
        // Only when the origin really is https — on a localhost dev origin an
        // `og:image:secure_url` carrying http:// is a contradiction.
        secureUrl: SITE_URL.startsWith('https://')
          ? `${SITE_URL}${DEFAULT_OG_IMAGE}`
          : undefined,
        type: 'image/png',
        ...DEFAULT_OG_IMAGE_SIZE,
        alt: SITE_NAME,
      };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      // 'website' rather than 'product': the OG product type wants price/currency
      // structured properties, and a half-filled product object previews worse in
      // WhatsApp than a clean website card.
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: 'ar_AR',
      images: [image],
    },
    twitter: {
      card: photo ? 'summary' : 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}
