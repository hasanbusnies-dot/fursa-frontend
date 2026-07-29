import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لا يوجد اتصال بالإنترنت',
  // Nothing here should ever be indexed — it is a fallback document, not content.
  robots: { index: false, follow: false },
};

/**
 * Offline fallback screen — the document public/sw.js precaches and serves for
 * ANY navigation that fails on the network, instead of Chrome's error page
 * (which is what gets a Play Store TWA flagged as broken).
 *
 * Two hard constraints shape how this is built, both because it renders while
 * the network is DOWN:
 *
 * 1. EVERY style is inline. Tailwind ships as a separate hashed stylesheet; if
 *    it is not in the cache yet, class names style nothing and the user gets
 *    unstyled text on a white page. Inline styles need no second request, so
 *    this screen looks identical whether the CSS made it into the cache or not.
 *    (Same reasoning as the vendor-CSS rule in AGENTS.md §11 — inline wins.)
 * 2. It is a fixed, full-viewport overlay at a high z-index. The root layout
 *    always renders the header, footer, bottom nav and splash markup around it,
 *    and without the stylesheet none of those are laid out or hidden — covering
 *    them is what keeps this screen clean in the no-CSS case.
 *
 * No client component and no hooks: the page's JS chunks may not be cached
 * either, so nothing here may depend on hydration. The retry link works as a
 * plain anchor; the inline script below only upgrades it when JS is available.
 */

const RETRY_SCRIPT = `(function(){var b=document.getElementById('offline-retry');
if(b&&location.pathname!=='/offline'){b.addEventListener('click',function(e){e.preventDefault();location.reload();});}})();`;

export default function OfflinePage() {
  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500, // above the splash overlay (400) and all app chrome
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#ffcb00', // fursago gold — same as the splash art
        fontFamily: 'var(--font-body, system-ui), system-ui, "Segoe UI", Tahoma, sans-serif',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#9ca3af',
          }}
        >
          فرصة — fursago
        </p>

        {/* Inline SVG, not an <img>: no second request to fail while offline. */}
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 20px',
            borderRadius: '9999px',
            backgroundColor: '#fff7db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h.01" />
            <path d="M8.5 16.4a5 5 0 0 1 7 0" />
            <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
            <path d="M19 12.9a10 10 0 0 0-3.3-2.2" />
            <path d="M2 8.8a16 16 0 0 1 5.2-3" />
            <path d="M22 8.8a16 16 0 0 0-8.7-3.7" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            fontSize: '21px',
            lineHeight: 1.4,
            fontWeight: 800,
            color: '#111827',
          }}
        >
          لا يوجد اتصال بالإنترنت
        </h1>

        <p
          style={{
            margin: '0 0 26px',
            fontSize: '15px',
            lineHeight: 1.7,
            color: '#6b7280',
          }}
        >
          يرجى التحقق من اتصالك والمحاولة مرة أخرى
        </p>

        <a
          id="offline-retry"
          href="/"
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 20px',
            borderRadius: '14px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          إعادة المحاولة
        </a>
      </div>

      <script dangerouslySetInnerHTML={{ __html: RETRY_SCRIPT }} />
    </div>
  );
}
