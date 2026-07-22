'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * App-open splash: full-screen brand image (/fursago.webp — the founder's
 * fursago.png compressed 2.2MB → 27KB, same art), held briefly, then a 400ms
 * fade reveals the app (which boots BEHIND the splash — zero added wait).
 * The video variant was deferred 2026-07-22; its asset (/splash.mp4) stays in
 * the repo for when it returns.
 *
 * Show-gating lives in a pre-hydration inline script in the root layout: it
 * checks sessionStorage ('forsa-splash-shown') and sets `data-splash` on <html>
 * BEFORE first paint, and CSS (globals.css) shows this overlay only under that
 * attribute — so the first painted frame is the splash, no white flash, and the
 * server markup stays storage-agnostic (no hydration mismatch; <html> carries
 * suppressHydrationWarning for the intentional attribute). Once per
 * tab-session, full document loads only; SPA navigations never remount the
 * root layout, so they can never replay it.
 *
 * Exits (all converge on the same fade + unmount): the hold elapsing, image
 * error (missing file must never trap the user), tap anywhere. The overlay bg
 * is the image's own yellow, so even a slow/failed image shows brand color,
 * never white/black. prefers-reduced-motion: the image is already static —
 * only the fade is disabled (motion-reduce), the splash itself stays.
 */
const HOLD_MS = 2800; // founder: 1.5s flashed by — hold long enough to actually see it
const FADE_MS = 400;

export function SplashScreen() {
  // 'idle' = server/first-client render (markup present, CSS decides visibility).
  const [phase, setPhase] = useState<'idle' | 'fading' | 'done'>('idle');
  const fadingRef = useRef(false);

  const startFade = () => {
    if (fadingRef.current) return;
    fadingRef.current = true;
    setPhase('fading');
    setTimeout(() => {
      document.documentElement.removeAttribute('data-splash');
      setPhase('done');
    }, FADE_MS);
  };
  const startFadeRef = useRef(startFade);
  startFadeRef.current = startFade;

  useEffect(() => {
    // The inline script only sets the attribute on a to-be-shown open; without
    // it this open already showed the splash (or storage is unavailable) — leave.
    if (!document.documentElement.hasAttribute('data-splash')) {
      setPhase('done');
      return;
    }
    const t = setTimeout(() => startFadeRef.current(), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  if (phase === 'done') return null;

  return (
    // No Tailwind `flex` here on purpose: display is governed by the
    // html[data-splash] rules in globals.css (hidden by default pre-hydration).
    <div
      aria-hidden
      onClick={startFade}
      className={`splash-overlay fixed inset-0 z-[400] bg-[#ffcb00] transition-opacity duration-[400ms] motion-reduce:transition-none ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fursago.webp"
        alt=""
        onError={startFade}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
