import type { MetadataRoute } from 'next';

// PWA/TWA manifest (mobile roadmap Phase 1). Android builds its install splash
// from `name` + `background_color` + the 512 icon; `theme_color` colors the
// status bar in the installed app. Icons are the fursago lockup on flat #ffcb00
// (generated from public/fursago.png) so Chrome's splash — which we cannot
// remove, only align — matches our own image splash; maskable variants keep the
// lockup inside the adaptive-icon safe zone. NOTE: Chrome bakes the manifest
// into the installed WebAPK — changes here need an uninstall + re-add (or a
// multi-day auto-update) to show up on an already-installed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'فرصة — fursago',
    short_name: 'فرصة',
    description: 'منصة الإعلانات المبوبة الرائدة في سوريا. بيع، اشترِ، واكتشف الفرص القريبة منك.',
    id: '/',
    start_url: '/',
    // Explicit even though '/' is what Bubblewrap would infer from start_url:
    // the TWA build reads scope to decide which URLs stay INSIDE the app rather
    // than opening a browser tab, so it should not be left to a default.
    scope: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    // Matches the splash image's (fursago.webp) dominant yellow, so Chrome's own
    // browser-generated launch screen (background_color + icon — it cannot be
    // removed for installed PWAs) flows into our image splash as one continuous
    // yellow sequence instead of white-screen-then-image.
    background_color: '#ffcb00',
    theme_color: '#2563eb',
    icons: [
      { src: '/fursago-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/fursago-icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/fursago-icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/fursago-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
