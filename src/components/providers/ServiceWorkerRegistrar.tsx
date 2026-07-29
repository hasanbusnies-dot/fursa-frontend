'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw';

/**
 * Registers the service worker for EVERY visitor (see lib/sw.ts for why this is
 * not gated on auth or push support). Mounted once in the root layout.
 *
 * Deferred to the `load` event: registration kicks off a fresh network fetch of
 * /sw.js plus the install-time precache, and neither should compete with the
 * first paint. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (document.readyState === 'complete') {
      void registerServiceWorker();
      return;
    }
    const onLoad = () => void registerServiceWorker();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
