'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, Users, Search, Calendar, UserMinus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { favoriteSellersService } from '@/services/favorite-sellers.service';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function sellerName(user: User | null | undefined): string {
  if (!user) return 'بائع غير معروف';
  const p = user.profile;
  if (p?.firstName || p?.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return user.email?.split('@')[0] || 'مستخدم';
}

function sellerInitial(user: User | null | undefined): string {
  return sellerName(user).charAt(0).toUpperCase();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-9 w-28 bg-gray-200 rounded-xl shrink-0" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FavoriteSellersPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [sellers,   setSellers]   = useState<User[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    favoriteSellersService.getAll()
      .then(setSellers)
      .catch(() => toast.error('تعذّر تحميل البائعين المفضلين.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  const handleUnfollow = async (seller: User) => {
    setRemovingId(seller.id);
    try {
      await favoriteSellersService.toggle(seller.id);
      setSellers((prev) => prev.filter((s) => s.id !== seller.id));
      toast.success(`تمت إزالة "${sellerName(seller)}" من المفضلة.`);
    } catch {
      toast.error('تعذّر إتمام العملية.');
    } finally {
      setRemovingId(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">البائعون المفضلون</h1>
            <p className="text-sm text-gray-500">
              {loading ? 'جارٍ التحميل…' : `${sellers.length} بائع مفضل`}
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
          <Link href="/" className="hover:text-blue-600 transition-colors">الصفحة الرئيسية</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-blue-600 transition-colors">الإعلانات</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">البائعون المفضلون</span>
        </nav>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : sellers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
              <Users className="w-10 h-10 text-green-200" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">لا يوجد لديك بائعون مفضلون بعد</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs">
              يمكنك النقر على زر "إضافة كبائع مفضل" في بطاقة البائع عند زيارة تفاصيل الإعلان.
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
          <div className="space-y-3">
            {sellers.map((seller) => (
              <div
                key={seller.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center hover:shadow-sm transition-shadow"
              >
                {/* Clickable left area → seller's listings */}
                <Link
                  href={`/listings?sellerId=${seller.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-lg">
                    {sellerInitial(seller)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{sellerName(seller)}</p>
                    {seller.email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{seller.email}</p>
                    )}
                    {seller.createdAt && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        عضو منذ {formatDate(seller.createdAt)}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 shrink-0">
                  <Link
                    href={`/messages?to=${seller.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    إرسال رسالة
                  </Link>
                  <button
                    onClick={() => handleUnfollow(seller)}
                    disabled={removingId === seller.id}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    {removingId === seller.id ? 'جارٍ الإزالة…' : 'إلغاء المتابعة'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sellers.length > 0 && (
          <div className="mt-6 text-center">
            <Link href="/listings" className="text-sm text-orange-500 hover:text-orange-700 font-medium">
              العودة إلى الإعلانات →
            </Link>
          </div>
        )}
    </div>
  );
}
