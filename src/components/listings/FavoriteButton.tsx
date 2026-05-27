'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { favoritesService } from '@/services/favorites.service';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  /** Pre-seed the favorited state. */
  initialFavorited?: boolean;
  /** Override the auto-check behaviour explicitly. */
  checkOnMount?: boolean;
  /** 'card' = small icon-only circle; 'detail' = full labelled button */
  variant?: 'card' | 'detail';
  /** Called after every successful toggle with the new favorited value. */
  onToggle?: (favorited: boolean) => void;
  className?: string;
}

export function FavoriteButton({
  listingId,
  initialFavorited,
  checkOnMount: checkOnMountProp,
  variant = 'card',
  onToggle,
  className,
}: FavoriteButtonProps) {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const shouldCheck = checkOnMountProp ?? false;

  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [checking,  setChecking]  = useState(shouldCheck && isAuthenticated);
  const [toggling,  setToggling]  = useState(false);

  // Sync when the parent explicitly provides an updated value (e.g. favorites page).
  // Skipped when initialFavorited is undefined to avoid overwriting a check-loaded value.
  useEffect(() => {
    if (initialFavorited !== undefined) setFavorited(initialFavorited);
  }, [initialFavorited]);

  useEffect(() => {
    if (!shouldCheck || !isAuthenticated) {
      setChecking(false);
      return;
    }
    favoritesService.check(listingId)
      .then(setFavorited)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [listingId, shouldCheck, isAuthenticated]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('يجب تسجيل الدخول لإضافة الإعلان للمفضلة.');
      router.push('/login');
      return;
    }

    if (toggling || checking) return;

    const optimistic = !favorited;
    setFavorited(optimistic);
    setToggling(true);
    try {
      const result = await favoritesService.toggle(listingId);
      setFavorited(result);
      onToggle?.(result);
      toast.success(result ? 'تمت الإضافة إلى المفضلة!' : 'تمت الإزالة من المفضلة.');
    } catch {
      setFavorited(!optimistic);
      toast.error('فشلت العملية. حاول مجدداً.');
    } finally {
      setToggling(false);
    }
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={checking || toggling}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150',
          'bg-white/85 hover:bg-white shadow-sm backdrop-blur-sm',
          favorited
            ? 'text-yellow-500 hover:text-yellow-600'
            : 'text-gray-400 hover:text-yellow-400',
          (checking || toggling) && 'opacity-60 cursor-not-allowed',
          className,
        )}
        title={favorited ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
      >
        <Star className={cn('w-4 h-4 transition-all', favorited && 'fill-current')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checking || toggling}
      className={cn(
        'flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-xl border transition-all',
        favorited
          ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
        (checking || toggling) && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <Star className={cn('w-4 h-4 transition-all', favorited && 'fill-current text-yellow-500')} />
      {checking
        ? 'جارٍ التحميل…'
        : toggling
          ? (favorited ? 'جارٍ الإزالة…' : 'جارٍ الإضافة…')
          : favorited
            ? 'في المفضلة'
            : 'أضف للمفضلة'}
    </button>
  );
}
