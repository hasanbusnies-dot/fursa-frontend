import {
  Car, Home, Truck, ShoppingBag, Factory,
  Hammer, GraduationCap, Briefcase, PawPrint, Users,
  Package, Loader2,
} from 'lucide-react';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  'auto-world':               { Icon: Car,           color: 'bg-orange-100  text-orange-600  group-hover:bg-orange-200'  },
  'real-estate':              { Icon: Home,          color: 'bg-blue-100    text-blue-600    group-hover:bg-blue-200'    },
  'vehicles':                 { Icon: Truck,         color: 'bg-zinc-100    text-zinc-600    group-hover:bg-zinc-200'    },
  'shopping':                 { Icon: ShoppingBag,   color: 'bg-rose-100    text-rose-600    group-hover:bg-rose-200'    },
  'heavy-machinery-industry': { Icon: Factory,       color: 'bg-yellow-100  text-yellow-600  group-hover:bg-yellow-200'  },
  'craftsmen-services':       { Icon: Hammer,        color: 'bg-teal-100    text-teal-600    group-hover:bg-teal-200'    },
  'private-tutors':           { Icon: GraduationCap, color: 'bg-violet-100  text-violet-600  group-hover:bg-violet-200'  },
  'job-postings':             { Icon: Briefcase,     color: 'bg-green-100   text-green-600   group-hover:bg-green-200'   },
  'animal-world':             { Icon: PawPrint,      color: 'bg-lime-100    text-lime-600    group-hover:bg-lime-200'    },
  'looking-for-assistants':   { Icon: Users,         color: 'bg-purple-100  text-purple-600  group-hover:bg-purple-200'  },
};
const DEFAULT_ICON = { Icon: Package, color: 'bg-gray-100 text-gray-500 group-hover:bg-gray-200' };

interface CategoryStepProps {
  categories: Category[];
  loading: boolean;
  selectedId: string;
  onSelect: (id: string, slug: string) => void;
  error?: string;
}

export function CategoryStep({ categories, loading, selectedId, onSelect, error }: CategoryStepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">What are you selling?</h2>
      <p className="text-sm text-gray-500 mb-6">Choose the category that best fits your listing.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading categories…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const { Icon, color } = ICON_MAP[cat.slug ?? ''] ?? DEFAULT_ICON;
            const isSelected = selectedId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id, cat.slug ?? '')}
                className={cn(
                  'group flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                )}
              >
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors', color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={cn(
                  'text-sm font-medium text-center',
                  isSelected ? 'text-blue-700' : 'text-gray-700'
                )}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
