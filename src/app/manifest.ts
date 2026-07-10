import type { MetadataRoute } from 'next';

// PWA/TWA manifest (mobile roadmap Phase 1). Android builds its install splash
// from `name` + `background_color` + the 512 icon; `theme_color` colors the
// status bar in the installed app. Icons are `purpose: any` only — a maskable
// variant needs a dedicated padded asset (see FOLLOWUPS.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'فرصة — Forsa',
    short_name: 'فرصة',
    description: 'منصة الإعلانات المبوبة الرائدة في سوريا. بيع، اشترِ، واكتشف الفرص القريبة منك.',
    id: '/',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/forsa-logo-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/forsa-logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
