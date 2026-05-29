'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, MessageSquare, PlusCircle, Star, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { listingsService } from '@/services/listings.service';
import { favoritesService } from '@/services/favorites.service';
import { ListingCard } from '@/components/listings/ListingCard';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import type { Listing } from '@/types';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div>
      <div className="h-7 w-44 bg-gray-200 rounded animate-pulse mb-1.5" />
      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 h-32 animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 h-52 animate-pulse" />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  href, icon, iconBg, value, label, loading,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  value: number | null;
  label: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-orange-200 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mb-0.5 leading-none">
        {loading
          ? <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />
          : (value ?? 0)}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountDashboardPage() {
  const router          = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted,      setMounted]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [activeCount,  setActiveCount]  = useState<number | null>(null);
  const [favorites,    setFavorites]    = useState<Listing[]>([]);

  // Messaging is not yet implemented — hardcoded until the endpoint is stable.
  const unreadRooms = 0;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }

    Promise.allSettled([
      listingsService.getMyListings()
        .then((listings) => setActiveCount(listings.filter((l) => l.status === 'ACTIVE').length))
        .catch(() => setActiveCount(0)),

      favoritesService.getAll()
        .then((list) => setFavorites(list.slice(0, 4)))
        .catch(() => setFavorites([])),
    ]).finally(() => setLoading(false));
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return <DashboardSkeleton />;

  const firstName = user?.profile?.firstName ?? user?.email?.split('@')[0] ?? '';

  return (
    <>
      {/* ── Mobile: full account menu list (reuses the desktop sidebar) ──── */}
      <div className="lg:hidden">
        <AccountSidebar />
      </div>

      {/* ── Desktop: dashboard overview (unchanged) ──────────────────────── */}
      <div className="hidden lg:block">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">
          مرحباً، {firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">نظرة عامة على حسابك</p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

        <StatCard
          href="/account/listings"
          iconBg="bg-blue-50"
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          value={activeCount}
          label="عدد الإعلانات النشطة"
          loading={loading}
        />

        <StatCard
          href="/account/messages"
          iconBg="bg-green-50"
          icon={<MessageSquare className="w-5 h-5 text-green-500" />}
          value={unreadRooms}
          label="الرسائل غير المقروءة"
          loading={loading}
        />

        {/* CTA card */}
        <Link
          href="/listings/create"
          prefetch={false}
          className="group bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-5 hover:shadow-md hover:from-orange-600 hover:to-pink-600 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </div>
          <p className="text-2xl font-extrabold text-white mb-0.5 leading-none">أضف إعلان</p>
          <p className="text-sm text-white/80">أنشئ إعلاناً جديداً الآن</p>
        </Link>

      </div>

      {/* ── Recent favorites ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <h2 className="text-sm font-bold text-gray-800">أحدث إعلاناتي المفضلة</h2>
          </div>
          <Link
            href="/account/favorites"
            className="text-xs font-semibold text-orange-500 hover:text-orange-700 transition-colors"
          >
            عرض الكل ←
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-100 h-36 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <Star className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">لا توجد إعلانات مفضلة بعد</p>
            <Link
              href="/listings"
              className="text-xs font-semibold text-orange-500 hover:underline"
            >
              تصفح الإعلانات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {favorites.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                initialFavorited={true}
                showCompare={false}
              />
            ))}
          </div>
        )}
      </div>

      </div>
    </>
  );
}
