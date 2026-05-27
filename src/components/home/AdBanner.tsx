'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { advertisementsService } from '@/services/advertisements.service';
import { resolveMediaUrl } from '@/lib/utils';
import type { Advertisement } from '@/types';

export function AdBanner() {
  const [ads,     setAds]     = useState<Advertisement[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    advertisementsService
      .getActive()
      .then(setAds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance every 5 s
  useEffect(() => {
    if (ads.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length]);

  function go(dir: 1 | -1) {
    if (timerRef.current) clearInterval(timerRef.current);
    setIndex((i) => (i + dir + ads.length) % ads.length);
    // Restart timer after manual nav
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, 5000);
  }

  if (loading || ads.length === 0) return null;

  const ad = ads[index];

  return (
    <div className="relative w-full max-w-4xl mx-auto h-48 md:h-[280px] rounded-2xl overflow-hidden shadow-2xl border border-white/10">

      <a
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 block"
        aria-label={ad.companyName}
      >
        {ad.mediaType === 'TEXT' ? (
          <div
            key={ad.id}
            className="w-full h-full flex items-center justify-center p-8 transition-transform duration-300 hover:scale-[1.01]"
            style={{ background: ad.backgroundColor ?? '#1e3a8a' }}
          >
            <p
              className="font-extrabold text-center leading-tight drop-shadow-lg"
              style={{ color: ad.textColor ?? '#ffffff', fontSize: ad.fontSize ?? '1.875rem' }}
            >
              {ad.adText}
            </p>
          </div>
        ) : ad.mediaType === 'VIDEO' ? (
          <video
            key={ad.id}
            src={resolveMediaUrl(ad.mediaUrl)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.01]"
          />
        ) : (
          <img
            key={ad.id}
            src={resolveMediaUrl(ad.mediaUrl)}
            alt={ad.companyName}
            onError={(e) => console.error('IMAGE_FAILED_TO_LOAD_FROM:', e.currentTarget.src)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.01]"
          />
        )}

        {/* Overlays — anchored to the <a>, pointer-events-none so clicks reach the link */}
        <span className="pointer-events-none absolute top-3 left-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          Sponsorlu
        </span>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
          <p className="text-white text-sm font-semibold truncate">{ad.companyName}</p>
        </div>
      </a>

      {/* Prev / Next — anchored to the outer div, intercept before link */}
      {ads.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Önceki"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Sonraki"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setIndex(i); }}
                aria-label={`Reklam ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === index ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
