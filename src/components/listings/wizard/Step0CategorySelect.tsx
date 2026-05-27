'use client';

import { useState, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  Search, ChevronLeft, Check, AlertCircle,
  Building2, Car, Wrench, ShoppingBag, Factory,
  Hammer, GraduationCap, Briefcase, PawPrint, UserPlus, Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { categoriesService } from '@/services/categories.service';
import { CategorySelector } from '@/components/categories/CategorySelector';
import type { Category } from '@/types';
import type { WizardFormData } from './schema';

interface Props {
  form: UseFormReturn<WizardFormData, any, WizardFormData>;
  onCategorySelected: () => void;
}

const CARD_SCHEMES = [
  { border: 'border-t-red-500',     icon: 'text-red-600',     bg: 'bg-red-50'     },
  { border: 'border-t-blue-500',    icon: 'text-blue-600',    bg: 'bg-blue-50'    },
  { border: 'border-t-emerald-500', icon: 'text-emerald-600', bg: 'bg-emerald-50' },
  { border: 'border-t-orange-500',  icon: 'text-orange-600',  bg: 'bg-orange-50'  },
  { border: 'border-t-purple-500',  icon: 'text-purple-600',  bg: 'bg-purple-50'  },
  { border: 'border-t-cyan-500',    icon: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  { border: 'border-t-yellow-500',  icon: 'text-yellow-600',  bg: 'bg-yellow-50'  },
  { border: 'border-t-pink-500',    icon: 'text-pink-600',    bg: 'bg-pink-50'    },
  { border: 'border-t-teal-500',    icon: 'text-teal-600',    bg: 'bg-teal-50'    },
  { border: 'border-t-indigo-500',  icon: 'text-indigo-600',  bg: 'bg-indigo-50'  },
] as const;

const CATEGORY_ICON: Record<string, LucideIcon> = {
  'عقارات':                    Building2,
  'مركبات':                    Car,
  'قطع غيار وإكسسوارات':       Wrench,
  'سوق المستعمل والجديد':      ShoppingBag,
  'آلات صناعية ومعدات':        Factory,
  'حرفيون وخدمات':             Hammer,
  'مدرسون خصوصيون':            GraduationCap,
  'وظائف':                     Briefcase,
  'عالم الحيوان':               PawPrint,
  'باحثون عن مساعدين':         UserPlus,
};

function getCardIcon(name: string): LucideIcon {
  return CATEGORY_ICON[name.trim()] ?? Tag;
}

function flattenCats(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...flattenCats(c.children ?? [])]);
}

function findAncestorRoot(roots: Category[], targetId: string): Category | null {
  for (const root of roots) {
    if (root.id === targetId) return root;
    if (root.children?.length && flattenCats(root.children).some((c) => c.id === targetId)) {
      return root;
    }
  }
  return null;
}

function RootCard({
  cat, idx, onClick,
}: { cat: Category; idx: number; onClick: () => void }) {
  const scheme = CARD_SCHEMES[idx % CARD_SCHEMES.length];
  const Icon = getCardIcon(cat.name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl bg-white text-center
        border border-gray-200 border-t-4 ${scheme.border}
        hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-150 w-full`}
    >
      <div className={`w-11 h-11 rounded-xl ${scheme.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${scheme.icon}`} />
      </div>
      <span className="text-xs sm:text-sm font-bold text-gray-800 leading-snug line-clamp-2">
        {cat.name}
      </span>
    </button>
  );
}

export function Step0CategorySelect({ form, onCategorySelected }: Props) {
  const { setValue, watch, formState: { errors } } = form;
  const categoryId = watch('categoryId');

  const [categories,   setCategories]   = useState<Category[]>([]);
  const [catLoading,   setCatLoading]   = useState(true);
  const [selectedRoot, setSelectedRoot] = useState<Category | null>(null);
  const [searchQuery,  setSearchQuery]  = useState('');

  useEffect(() => {
    categoriesService.getTree()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  function selectCategory(id: string) {
    setValue('categoryId', id, { shouldValidate: true });
    onCategorySelected();
  }

  function handleRootClick(cat: Category) {
    setSelectedRoot(cat);
    setSearchQuery('');
    if (!cat.children?.length) {
      selectCategory(cat.id);
    } else {
      setValue('categoryId', '', { shouldValidate: false });
    }
  }

  function handleSearchSelect(cat: Category) {
    selectCategory(cat.id);
    setSearchQuery('');
    setSelectedRoot(findAncestorRoot(categories, cat.id) ?? null);
  }

  const searchResults = searchQuery.trim().length > 0
    ? flattenCats(categories)
        .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 15)
    : [];

  const selectedCatName = categoryId
    ? (flattenCats(categories).find((c) => c.id === categoryId)?.name ?? categoryId.slice(-8).toUpperCase())
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">اختر الفئة</h2>
        <p className="text-sm text-gray-500 mt-1">
          اختر الفئة المناسبة لإعلانك — سينتقل النموذج تلقائياً للخطوة التالية.
        </p>
      </div>

      {catLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[100px] bg-gray-200 rounded-xl border-t-4 border-t-gray-300" />
          ))}
        </div>

      ) : !selectedRoot ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat, idx) => (
              <RootCard
                key={cat.id}
                cat={cat}
                idx={idx}
                onClick={() => handleRootClick(cat)}
              />
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400 font-medium shrink-0 px-1">أو</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-2">ابحث عن الفئة بكلمة</p>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب كلمات تصف إعلانك للبحث عن الفئة المناسبة."
                className="w-full ps-9 pe-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-100 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-lg leading-none text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            {searchQuery.trim().length > 0 && (
              <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {searchResults.length > 0 ? (
                  searchResults.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSearchSelect(cat)}
                      className="w-full text-start px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      {cat.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج.</p>
                )}
              </div>
            )}
          </div>
        </>

      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setSelectedRoot(null);
                setSearchQuery('');
                setValue('categoryId', '', { shouldValidate: false });
              }}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium shrink-0 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              كل الفئات
            </button>
            <span className="text-gray-300 select-none">/</span>
            <span className="text-sm font-semibold text-gray-700 truncate">{selectedRoot.name}</span>
          </div>

          {selectedRoot.children?.length ? (
            <div className="p-3 max-h-72 overflow-y-auto">
              <CategorySelector
                categories={selectedRoot.children}
                allLabel="← العودة لكل الفئات"
                onSelect={(cat) => {
                  if (cat) {
                    selectCategory(cat.id);
                  } else {
                    setSelectedRoot(null);
                    setValue('categoryId', '', { shouldValidate: false });
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-green-700 bg-green-50">
              <Check className="w-4 h-4 shrink-0" />
              تم الاختيار: <strong className="ms-1">{selectedRoot.name}</strong>
            </div>
          )}
        </div>
      )}

      {errors.categoryId && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{errors.categoryId.message}
        </p>
      )}
      {selectedCatName && (
        <p className="mt-1.5 text-xs text-blue-600 font-medium">
          ✓ تم اختيار الفئة: {selectedCatName}
        </p>
      )}
    </div>
  );
}
