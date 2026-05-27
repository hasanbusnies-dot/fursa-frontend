'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Search } from 'lucide-react';
import { toast } from 'sonner';
import { favoritesService } from '@/services/favorites.service';
import { useAuthStore } from '@/store/auth.store';
import { ListingCard } from '@/components/listings/ListingCard';
import type { Listing } from '@/types';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 w-full bg-gray-200" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    favoritesService.getAll()
      .then(setFavorites)
      .catch(() => toast.error('تعذّر تحميل المفضلة.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  // Remove listing from local list when user un-favorites it via the heart on the card
  const handleFavoriteToggle = (listingId: string, favorited: boolean) => {
    if (!favorited) {
      setFavorites((prev) => prev.filter((l) => l.id !== listingId));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">إعلاناتي المفضلة</h1>
            <p className="text-sm text-gray-500">
              {loading
                ? 'جارٍ التحميل…'
                : `${favorites.length} إعلان مفضل`}
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
          <Link href="/" className="hover:text-blue-600 transition-colors">الصفحة الرئيسية</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-blue-600 transition-colors">الإعلانات</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">إعلاناتي المفضلة</span>
        </nav>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center mb-5">
              <Star className="w-10 h-10 text-yellow-200" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">لا توجد إعلانات مفضلة بعد</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs">
              يمكنك إضافة الإعلانات إلى قائمتك المفضلة بالنقر على أيقونة ★ أثناء تصفحها.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Search className="w-4 h-4" />
              اكتشف الإعلانات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favorites.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                initialFavorited={true}
                onFavoriteToggle={handleFavoriteToggle}
                showCompare={false}
              />
            ))}
          </div>
        )}

        {/* Back link */}
        {!loading && favorites.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/listings" className="text-sm text-orange-500 hover:text-orange-700 font-medium">
              ← العودة إلى الإعلانات
            </Link>
          </div>
        )}
    </div>
  );
}
