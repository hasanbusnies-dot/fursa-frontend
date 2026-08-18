'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Search } from 'lucide-react';
import { toast } from 'sonner';
import { recommendationsService } from '@/services/recommendations.service';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { ListingCard } from '@/components/listings/ListingCard';
import type { Listing } from '@/types';

/**
 * «إعلانات مخصصة لك» — the full personalized list behind the homepage section's
 * «عرض الكل», and the destination the header popover's own "view all" now points at.
 *
 * A TOP-LEVEL route, not /account/*: it is a browse surface reached from the public
 * homepage, so it gets the full page width and the browse card treatment (doping
 * badges, compare) rather than the account panel's sidebar chrome. The dead link this
 * replaces (`/account/onerilen`) was never built, so nothing is being moved.
 *
 * 20 is the backend's hard ceiling (`suggestedQuerySchema`, max 20), so this asks for
 * exactly that and renders whatever comes back — the real count is bounded by how many
 * unseen ACTIVE listings exist in the user's top category, and is usually smaller.
 */

const VIEW_ALL_LIMIT = 20;

function SkeletonCard() {
  return (
    <div className="bg-white rounded-card shadow-pebble overflow-hidden animate-pulse">
      <div className="h-36 w-full bg-gray-200" />
      <div className="p-2.5 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  // Recommendations ARE the user's session — there is nothing to show anonymously and
  // the endpoint is behind requireAuth, so a logged-out visitor is sent to /login and
  // returned here afterwards (LoginForm honours ?redirect= for same-origin paths).
  // `ready` stays false while hydration is undecided — see useAuthGate; treating that
  // first false as "logged out" is the bug that hook exists to prevent.
  const ready = useAuthGate('/recommendations');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!ready) return;
    recommendationsService
      .getSuggested(VIEW_ALL_LIMIT)
      .then(setListings)
      .catch(() => toast.error('تعذّر تحميل الاقتراحات.'))
      .finally(() => setLoading(false));
  }, [ready]);

  // Undecided auth counts as loading, not as empty: skeletons here, never the
  // "no suggestions" card, which would flash at a logged-in user on every refresh.
  const showSkeletons = !ready || loading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">إعلانات مخصصة لك</h1>
          <p className="text-sm text-gray-500">
            {showSkeletons ? 'جارٍ التحميل…' : `${listings.length} إعلان مقترح`}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
        <Link href="/" className="hover:text-blue-600 transition-colors">الصفحة الرئيسية</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">إعلانات مخصصة لك</span>
      </nav>

      {/* Content — `layout="stacked"` keeps the card shape at phone width so two fit
          per row, matching the homepage section this page is opened from. */}
      {showSkeletons ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white shadow-pebble rounded-card flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-5">
            <Sparkles className="w-10 h-10 text-purple-200" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">لا توجد اقتراحات بعد</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            نختار لك الإعلانات بناءً على ما تتصفّحه. تصفّح بعض الإعلانات وستظهر هنا اقتراحات تناسبك.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            تصفّح الإعلانات
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} layout="stacked" />
          ))}
        </div>
      )}

    </div>
  );
}
