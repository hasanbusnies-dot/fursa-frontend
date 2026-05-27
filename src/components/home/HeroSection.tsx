'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { advertisementsService } from '@/services/advertisements.service';
import { resolveMediaUrl } from '@/lib/utils';
import type { Advertisement } from '@/types';

export function HeroSection() {
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

  useEffect(() => {
    if (ads.length < 2) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length]);

  function go(dir: 1 | -1) {
    if (timerRef.current) clearInterval(timerRef.current);
    setIndex((i) => (i + dir + ads.length) % ads.length);
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
  }

  function jumpTo(i: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setIndex(i);
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
  }

  const currentAd: Advertisement | null = ads[index] ?? null;
  const isText = !loading && currentAd?.mediaType === 'TEXT';

  // When a TEXT ad is active its backgroundColor becomes the section background.
  // Otherwise the Tailwind blue-gradient classes take over (no inline style).
  const sectionStyle = isText && currentAd?.backgroundColor
    ? { background: currentAd.backgroundColor }
    : {};

  return (
    <section
      className={`text-white ${isText ? '' : 'bg-gradient-to-br from-blue-700 via-blue-700 to-blue-900'}`}
      style={sectionStyle}
    >
      {/* ── Headline ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto text-center pt-6 pb-3 px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-1">
          اكتشف فرصتك التالية
        </h1>
        <p className="text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
          منصة الإعلانات المبوبة الرائدة في سوريا — استخدم شريط البحث أعلاه للعثور على أي إعلان.
        </p>
      </div>

      {/* ── Ad area ──────────────────────────────────────────────────────── */}
      {!loading && currentAd && (
        isText
          /* ── TEXT ad: full-width, no rounded box ───────────────────── */
          ? (
            <div className="relative w-full px-4 pt-2 pb-10">
              {/* مُموَّل badge */}
              <span className="absolute top-0 left-6 bg-black/30 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                مُموَّل
              </span>

              {/* Clickable text */}
              <a
                href={currentAd.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-10 px-6 hover:opacity-90 transition-opacity"
                aria-label={currentAd.companyName}
              >
                <p
                  className="font-extrabold leading-tight drop-shadow-xl"
                  style={{
                    color:    currentAd.textColor ?? '#ffffff',
                    fontSize: currentAd.fontSize  ?? '1.875rem',
                  }}
                >
                  {currentAd.adText}
                </p>
                <p className="mt-3 text-sm font-semibold opacity-70 tracking-wide">
                  {currentAd.companyName}
                </p>
              </a>

              {/* Prev / Next */}
              {ads.length > 1 && (
                <>
                  <button onClick={() => go(-1)} aria-label="السابق" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors z-10">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => go(1)} aria-label="التالي" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors z-10">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="flex justify-center gap-1.5 mt-2">
                    {ads.map((_, i) => (
                      <button key={i} onClick={() => jumpTo(i)} aria-label={`إعلان ${i + 1}`}
                        className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )

          /* ── IMAGE / GIF / VIDEO ad: rounded carousel box ──────────── */
          : (
            <div className="pb-5 px-4">
              <div className="relative w-full max-w-4xl mx-auto h-48 md:h-[280px] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <a
                  href={currentAd.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 block"
                  aria-label={currentAd.companyName}
                >
                  {currentAd.mediaType === 'VIDEO'
                    ? (
                      <video
                        key={currentAd.id}
                        src={resolveMediaUrl(currentAd.mediaUrl ?? '')}
                        autoPlay muted loop playsInline
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.01]"
                      />
                    ) : (
                      <img
                        key={currentAd.id}
                        src={resolveMediaUrl(currentAd.mediaUrl ?? '')}
                        alt={currentAd.companyName}
                        onError={(e) => console.error('IMAGE_FAILED_TO_LOAD_FROM:', e.currentTarget.src)}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.01]"
                      />
                    )
                  }

                  {/* Overlays */}
                  <span className="pointer-events-none absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    مُموَّل
                  </span>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
                    <p className="text-white text-sm font-semibold truncate">{currentAd.companyName}</p>
                  </div>
                </a>

                {/* Prev / Next */}
                {ads.length > 1 && (
                  <>
                    <button onClick={() => go(-1)} aria-label="السابق" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-10">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => go(1)} aria-label="التالي" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-10">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {ads.map((_, i) => (
                        <button key={i} onClick={() => jumpTo(i)} aria-label={`إعلان ${i + 1}`}
                          className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
      )}
    </section>
  );
}
