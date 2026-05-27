'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { favoriteSellersService } from '@/services/favorite-sellers.service';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface FavoriteSellerButtonProps {
  sellerId: string;
  variant?: 'full' | 'icon';
  className?: string;
}

export function FavoriteSellerButton({ sellerId, variant = 'full', className }: FavoriteSellerButtonProps) {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [favorited, setFavorited] = useState(false);
  const [checking,  setChecking]  = useState(isAuthenticated);
  const [toggling,  setToggling]  = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setChecking(false); return; }
    favoriteSellersService.check(sellerId)
      .then(setFavorited)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [sellerId, isAuthenticated]);

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.error('يجب تسجيل الدخول لإضافة البائع للمفضلة.');
      router.push('/login');
      return;
    }
    const next = !favorited;
    setFavorited(next);
    setToggling(true);
    try {
      const result = await favoriteSellersService.toggle(sellerId);
      setFavorited(result);
      toast.success(result ? 'تمت إضافة البائع إلى المفضلة!' : 'تمت إزالة البائع من المفضلة.');
    } catch {
      setFavorited(!next);
      toast.error('فشلت العملية.');
    } finally {
      setToggling(false);
    }
  };

  const busy = checking || toggling;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={favorited ? 'بائع مفضّل' : 'إضافة كبائع مفضل'}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center border transition-all shrink-0',
          favorited
            ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600',
          busy && 'opacity-60 cursor-not-allowed',
          className,
        )}
      >
        {checking
          ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          : favorited
            ? <UserCheck className="w-4 h-4" />
            : <UserPlus  className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        'w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl border transition-all',
        favorited
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
        busy && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      {favorited
        ? <UserCheck className="w-4 h-4" />
        : <UserPlus  className="w-4 h-4" />}
      {checking
        ? 'جارٍ التحميل…'
        : toggling
          ? '…'
          : favorited
            ? 'بائع مفضّل'
            : 'إضافة كبائع مفضل'}
    </button>
  );
}
