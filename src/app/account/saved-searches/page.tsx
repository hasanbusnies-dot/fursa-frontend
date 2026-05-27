'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Search, Trash2, AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { savedSearchesService, type SavedSearch } from '@/services/saved-searches.service';
import { useAuthStore } from '@/store/auth.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function describeQuery(qs: string): string {
  if (!qs) return 'كل الإعلانات';
  const p = new URLSearchParams(qs.startsWith('?') ? qs.slice(1) : qs);
  const parts: string[] = [];
  const make  = p.get('make');
  const model = p.get('model');
  const city  = p.get('city');
  const query = p.get('query');
  if (query) parts.push(`"${query}"`);
  if (make)  parts.push(make);
  if (model) parts.push(model);
  if (city)  parts.push(city);
  const minP = p.get('minPrice');
  const maxP = p.get('maxPrice');
  const cur  = p.get('currency') ?? 'SYP';
  if (minP || maxP) {
    parts.push([minP, maxP].filter(Boolean).join('–') + ' ' + cur);
  }
  const minY = p.get('minYear');
  const maxY = p.get('maxYear');
  if (minY || maxY) {
    parts.push([minY || '…', maxY || '…'].join('–') + ' سنة');
  }
  return parts.length > 0 ? parts.join(' · ') : 'كل الإعلانات';
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  name, onConfirm, onCancel, loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">حذف البحث</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          هل أنت متأكد أنك تريد حذف بحث <span className="font-medium text-gray-700">"{name}"</span> بشكل نهائي؟
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'جارٍ الحذف…' : 'احذف'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/5" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
      </div>
      <div className="h-8 w-28 bg-gray-200 rounded-xl shrink-0" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SavedSearchesPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mounted         = useAuthStore((s) => !!s.user || s.isAuthenticated !== undefined);

  const [searches, setSearches]   = useState<SavedSearch[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [toDelete, setToDelete]   = useState<SavedSearch | null>(null);

  // Auth gate — wait for hydration before redirecting
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    savedSearchesService.getAll()
      .then(setSearches)
      .catch(() => toast.error('تعذّر تحميل عمليات البحث المحفوظة.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleDelete = async (search: SavedSearch) => {
    setDeleting(search.id);
    try {
      await savedSearchesService.delete(search.id);
      setSearches((prev) => prev.filter((s) => s.id !== search.id));
      toast.success(`تم حذف "${search.name}".`);
    } catch {
      toast.error('تعذّر حذف البحث.');
    } finally {
      setDeleting(null);
      setToDelete(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
    <div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Bookmark className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">عمليات البحث المفضلة</h1>
            <p className="text-sm text-gray-500">
              تابع عمليات البحث المحفوظة من هنا.
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-blue-600 transition-colors">الصفحة الرئيسية</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-blue-600 transition-colors">الإعلانات</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">عمليات البحث المفضلة</span>
        </nav>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : searches.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-orange-300" />
            </div>
            <h2 className="text-base font-bold text-gray-800 mb-1">لا توجد عمليات بحث محفوظة بعد</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              ابحث في صفحة الإعلانات وانقر على زر "حفظ البحث".
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Search className="w-4 h-4" />
              اذهب إلى الإعلانات
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 text-orange-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{search.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {describeQuery(search.queryString)}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(search.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/listings${search.queryString.startsWith('?') ? search.queryString : `?${search.queryString}`}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl hover:bg-orange-100 transition-colors"
                  >
                    الذهاب للبحث
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setToDelete(search)}
                    disabled={deleting === search.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        {searches.length > 0 && (
          <div className="mt-6 text-center">
            <Link href="/listings" className="text-sm text-orange-500 hover:text-orange-700 font-medium">
              العودة إلى الإعلانات →
            </Link>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {toDelete && (
        <DeleteModal
          name={toDelete.name}
          loading={deleting === toDelete.id}
          onConfirm={() => handleDelete(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
