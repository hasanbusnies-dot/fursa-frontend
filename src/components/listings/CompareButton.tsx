'use client';

import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import { useCompareStore } from '@/store/compare.store';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types';

interface CompareButtonProps {
  listing: Listing;
  variant?: 'card' | 'detail';
  className?: string;
}

export function CompareButton({ listing, variant = 'card', className }: CompareButtonProps) {
  const items      = useCompareStore((s) => s.items);
  const addItem    = useCompareStore((s) => s.addItem);
  const removeItem = useCompareStore((s) => s.removeItem);

  const inList = items.some((i) => i.id === listing.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inList) {
      removeItem(listing.id);
      toast.success('تمت إزالته من قائمة المقارنة.');
      return;
    }

    const added = addItem(listing);
    if (!added) {
      toast.error('يمكنك مقارنة 3 إعلانات كحد أقصى.');
      return;
    }
    toast.success('تمت إضافته إلى قائمة المقارنة.');
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm',
          inList
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white/85 text-gray-400 hover:bg-white hover:text-blue-500 backdrop-blur-sm',
          className,
        )}
        title={inList ? 'إزالة من المقارنة' : 'أضف للمقارنة'}
      >
        <Scale className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-xl border transition-all',
        inList
          ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
        className,
      )}
    >
      <Scale className="w-4 h-4" />
      {inList ? 'في المقارنة' : 'أضف للمقارنة'}
    </button>
  );
}
