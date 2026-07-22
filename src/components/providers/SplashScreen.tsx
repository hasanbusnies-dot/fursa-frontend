'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * App-open splash: full-screen brand overlay playing /splash.mp4, then a 400ms
 * fade reveals the app (which boots BEHIND the splash — zero added wait).
 *
 * Show-gating lives in a pre-hydration inline script in the root layout: it
 * checks sessionStorage ('forsa-splash-shown') and sets `data-splash` on <html>
 * BEFORE first paint, and CSS (globals.css) shows this overlay only under that
 * attribute — so the first painted frame is the splash, no white flash, and the
 * server markup stays auth/storage-agnostic (no hydration mismatch). Once per
 * tab-session, full document loads only; SPA navigations never remount the root
 * layout, so they can never replay it.
 *
 * Exits (all converge on the same fade + unmount):
 *  - video ended (natural, expected ~1.5–2.5s)
 *  - no `canplay` within 1.2s — slow network / MISSING FILE / autoplay refused;
 *    the splash must never make the app slower than no splash
 *  - video error, or the play() promise rejecting (WebView battery-saver refusal)
 *  - 4s hard cap from mount, whatever else happens
 *  - tap anywhere (no visible button — the tap just works)
 *  - prefers-reduced-motion: no video at all — static logo ~800ms, then fade
 */
const FADE_MS    = 400;
const CANPLAY_MS = 1200;
const CAP_MS     = 4000;
const REDUCED_MS = 800;

export function SplashScreen() {
  // 'idle' = server/first-client render (markup present, CSS decides visibility);
  // the mount effect then either takes over ('video' | 'still') or unmounts.
  const [phase, setPhase] = useState<'idle' | 'video' | 'still' | 'fading' | 'done'>('idle');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
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
    const arm = (ms: number) => {
      const t = setTimeout(() => startFadeRef.current(), ms);
      timersRef.current.push(t);
      return t;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('still');
      arm(REDUCED_MS);
    } else {
      setPhase('video');
      arm(CAP_MS);
      const canplayTimer = arm(CANPLAY_MS);
      const v = videoRef.current;
      if (v) {
        v.addEventListener('canplay', () => clearTimeout(canplayTimer), { once: true });
        // autoPlay usually suffices; the explicit call surfaces the rejection
        // (some WebViews refuse even muted autoplay under battery saver).
        v.play().catch(() => startFadeRef.current());
      }
    }
    return () => timersRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'done') return null;

  return (
    // No Tailwind `flex` here on purpose: display is governed by the
    // html[data-splash] rules in globals.css (hidden by default pre-hydration).
    <div
      aria-hidden
      onClick={startFade}
      className={`splash-overlay fixed inset-0 z-[400] items-center justify-center bg-blue-600 transition-opacity duration-[400ms] ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {phase === 'still' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/forsa-logo-512.png" alt="" className="w-40 h-40 rounded-3xl" />
      ) : (
        // object-cover fills the screen edge-to-edge (founder's ask — no black
        // letterbox bars). Tradeoff: a 16:9 video in a portrait viewport gets its
        // LEFT/RIGHT edges cropped to fill vertically — the logo must live in the
        // centered safe area. If the full 16:9 width must stay visible, switch to
        // object-contain: brand-blue margins instead of crop (overlay bg shows).
        <video
          ref={videoRef}
          src="/splash.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={startFade}
          onError={startFade}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
