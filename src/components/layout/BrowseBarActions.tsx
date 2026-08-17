'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { ComparePopover } from './ComparePopover';

/**
 * «قارن» + «المفضلة» as white line-art icons for the blue mobile top bar — the
 * browse pages' two "things I've set aside" controls, moved out of the white
 * quick-links strip so the phone's top chrome carries them instead.
 *
 * DOM order is favorites-then-compare ON PURPOSE. The bar is RTL, so the first
 * child renders at the physical RIGHT: this order puts قارن in the extreme
 * physical top-left corner with المفضلة to its right — the same left-to-right
 * pairing the desktop strip has always had, and the placement the founder asked
 * for (2026-08-17).
 *
 * Renders ON BLUE. Everything here must be white or white-ringed; a grey hover
 * or a dark glyph is invisible against the bar.
 */
export function BrowseBarActions() {
  return (
    <>
      <Link
        href="/account/favorites"
        aria-label="إعلاناتي المفضلة"
        title="إعلاناتي المفضلة"
        className="shrink-0 flex items-center p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors"
      >
        <Star className="w-5 h-5" />
      </Link>
      <ComparePopover variant="bar" />
    </>
  );
}
