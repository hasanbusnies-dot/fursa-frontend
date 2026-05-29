'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, MapPin, Building2, Home, ChevronLeft,
  ArrowLeft, ImageOff, PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SYRIAN_GOVERNORATES } from '@/components/listings/wizard/schema';
import { listingsService } from '@/services/listings.service';
import { categoriesService } from '@/services/categories.service';
import { api } from '@/services/api';
import type { ApiResponse, Category } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

// Mirrors whatever the backend returns for GET /projects/featured.
// Extend as the API evolves.
interface FeaturedProject {
  id: string;
  name?: string;
  title?: string;
  city?: string;
  district?: string;
  priceFrom?: number;
  priceTo?: number;
  currency?: 'SYP' | 'USD';
  coverImage?: string;
  status?: string;
  unitCount?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenTree(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...flattenTree(c.children ?? [])]);
}

function formatPrice(price: number, currency: 'SYP' | 'USD' = 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_COUNTS = [
  'استوديو (1+0)', '1+1', '1.5+1', '2+0', '2+1', '2.5+1', '2+2',
  '3+0', '3+1', '3.5+1', '3+2', '3+3', '4+0', '4+1', '4.5+1',
  '4.5+2', '4+2', '4+3', '4+4', '5+1', '5.5+1', '5+2', '5+3',
  '5+4', '6+1', '6+2', '6.5+1', '6+3', '6+4', '7+1', '7+2',
  '7+3', '8+1', '8+2', '8+3', '8+4', '9+1', '9+2', '9+3',
  '9+4', '9+5', '9+6', '10+1', '10+2', '10 وما فوق',
] as const;

const PROJECT_STATUSES = [
  { value: 'ongoing',   label: 'مستمر (قيد الإنشاء)' },
  { value: 'completed', label: 'مكتمل (جاهز)' },
] as const;

// No hardcoded counts — fetched live from the API
const FEATURED_CITIES: { name: string; colorFrom: string; colorTo: string }[] = [
  { name: 'دمشق',     colorFrom: 'from-blue-600',   colorTo: 'to-blue-800'   },
  { name: 'ريف دمشق', colorFrom: 'from-indigo-500', colorTo: 'to-indigo-700' },
  { name: 'حلب',      colorFrom: 'from-orange-500', colorTo: 'to-orange-700' },
  { name: 'اللاذقية', colorFrom: 'from-teal-500',   colorTo: 'to-teal-700'   },
  { name: 'طرطوس',    colorFrom: 'from-cyan-500',   colorTo: 'to-cyan-700'   },
  { name: 'حمص',      colorFrom: 'from-rose-500',   colorTo: 'to-rose-700'   },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectBox({
  value, onChange, placeholder, children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-w-[140px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm pr-8',
          'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors',
          value ? 'text-gray-900 font-medium' : 'text-gray-400',
        )}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

function CountBadge({ count, loading }: { count: number; loading: boolean }) {
  if (loading) {
    return <span className="inline-block h-3 w-12 rounded bg-white/20 animate-pulse" />;
  }
  return <span className="text-[11px] text-white/80 font-medium">{count} إعلان</span>;
}

function SkeletonProjectCard() {
  return (
    <div className="flex-shrink-0 w-[240px] lg:w-auto bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

function FeaturedProjectCard({ project }: { project: FeaturedProject }) {
  const label  = project.name ?? project.title ?? 'مشروع سكني';
  const location = [project.city, project.district].filter(Boolean).join(' — ');

  return (
    <Link href={`/listings/${project.id}`} className="group flex-shrink-0 w-[240px] lg:w-auto">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-200 h-full flex flex-col">
        <div className="relative h-36 bg-gray-100 flex items-center justify-center shrink-0">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <ImageOff className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <div className="p-3 flex flex-col gap-1 flex-1">
          <p className="text-[13px] font-extrabold text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
            {label}
          </p>
          {location && (
            <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          )}
          {project.priceFrom != null && (
            <div className="mt-auto pt-2 border-t border-gray-100">
              <p className="text-[11px] text-gray-500">السعر من</p>
              <p className="text-sm font-extrabold text-blue-600 tabular-nums">
                {formatPrice(project.priceFrom, project.currency)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyShowcase() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center bg-white rounded-2xl border border-dashed border-gray-200">
      <Building2 className="w-10 h-10 text-gray-300" />
      <div>
        <p className="text-base font-semibold text-gray-500">لا توجد مشاريع حالياً</p>
        <p className="text-sm text-gray-400 mt-0.5">كن أول من يضيف مشروعه السكني</p>
      </div>
      <Link
        href="/listings/create"
        prefetch={false}
        className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        أضف مشروعك الآن
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectsLandingPage() {
  const router = useRouter();

  // Quick-search state
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [rooms,    setRooms]    = useState('');
  const [status,   setStatus]   = useState('');

  // Live data
  const [cityCounts,      setCityCounts]      = useState<Record<string, number>>({});
  const [countsLoading,   setCountsLoading]   = useState(true);
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>([]);
  const [projectsLoading,  setProjectsLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;

    // ── City counts ────────────────────────────────────────────────────────────
    async function loadCityCounts() {
      let catId: string | undefined;
      try {
        const tree = await categoriesService.getTree();
        const flat = flattenTree(tree);
        const cat  = flat.find(
          (c) => c.name === 'مشاريع سكنية' || c.slug === 'projects' || c.slug?.endsWith('/projects'),
        );
        catId = cat?.id;
      } catch { /* proceed without category filter */ }

      if (cancelled) return;

      const results = await Promise.all(
        FEATURED_CITIES.map(async (city) => {
          try {
            const r = await listingsService.getListings({ categoryId: catId, city: city.name, limit: 1, page: 1 });
            return { name: city.name, count: r.total };
          } catch {
            return { name: city.name, count: 0 };
          }
        }),
      );

      if (cancelled) return;
      const counts: Record<string, number> = {};
      results.forEach((r) => { counts[r.name] = r.count; });
      setCityCounts(counts);
      setCountsLoading(false);
    }

    // ── Featured projects from dedicated endpoint ───────────────────────────────
    async function loadFeaturedProjects() {
      try {
        const raw = await api.get<ApiResponse<FeaturedProject[]>>('/projects/featured');
        if (cancelled) return;
        const projects = Array.isArray(raw.data) ? raw.data : [];
        setFeaturedProjects(projects);
      } catch {
        if (!cancelled) setFeaturedProjects([]);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }

    loadCityCounts();
    loadFeaturedProjects();

    return () => { cancelled = true; };
  }, []);

  function handleSearch() {
    const qs = new URLSearchParams();
    if (province) qs.set('city',     province);
    if (district) qs.set('district', district);
    if (rooms)    qs.set('rooms',    rooms);
    if (status)   qs.set('status',   status);
    const q = qs.toString();
    router.push(`/category/real-estate/projects/search${q ? `?${q}` : ''}`);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb ── */}
      <nav className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
          <Link href="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
            <Home className="w-3.5 h-3.5" /> الرئيسية
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <Link href="/category/real-estate" className="hover:text-blue-600 transition-colors">عقارات</Link>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="text-gray-700 font-medium">مشاريع سكنية</span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/beautiful-architecture-building.jpg')",
          minHeight: 440,
        }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-4 py-16 text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-white border border-white/20 text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-sm">
            <Building2 className="w-3.5 h-3.5" />
            مشاريع سكنية مميزة في سوريا
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-lg">
            ابحث عن مشروعك السكني المثالي
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg drop-shadow">
            آلاف الوحدات السكنية من أفضل مطوري العقارات في سوريا
          </p>

          {/* ── Quick search bar ── */}
          <div className="w-full max-w-4xl mt-2">
            <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-wrap gap-2.5 items-center">
              <SelectBox value={province} onChange={setProvince} placeholder="المحافظة">
                {SYRIAN_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </SelectBox>

              <div className="relative flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="المنطقة / الحي"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors placeholder:text-gray-400"
                />
              </div>

              <SelectBox value={rooms} onChange={setRooms} placeholder="عدد الغرف">
                {ROOM_COUNTS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </SelectBox>

              <SelectBox value={status} onChange={setStatus} placeholder="حالة المشروع">
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </SelectBox>

              <button
                onClick={handleSearch}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shrink-0 shadow-md shadow-orange-500/30"
              >
                <Search className="w-4 h-4" />
                بحث
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA Banner — immediately below hero ── */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div>
            <h3 className="text-xl font-extrabold text-white">هل أنت مطوّر عقاري؟</h3>
            <p className="text-orange-100 text-sm mt-1">سجّل مشروعك على فرصة واوصل إلى آلاف المشترين المحتملين</p>
          </div>
          <Link
            href="/listings/create"
            prefetch={false}
            className="shrink-0 bg-white text-orange-600 font-extrabold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors shadow-lg shadow-orange-700/20 whitespace-nowrap"
          >
            أضف مشروعك الآن
          </Link>
        </div>
      </section>

      {/* ── Featured Cities ── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">مدن مميزة</h2>
            <p className="text-sm text-gray-500 mt-0.5">تصفّح المشاريع حسب المدينة</p>
          </div>
          <Link
            href="/category/real-estate/projects/search"
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURED_CITIES.map((city) => (
            <Link
              key={city.name}
              href={`/category/real-estate/projects/search?city=${encodeURIComponent(city.name)}`}
              className="group"
            >
              <div className={cn(
                'relative rounded-2xl overflow-hidden p-5 flex flex-col items-center justify-center gap-2 text-center aspect-square',
                'bg-gradient-to-br', city.colorFrom, city.colorTo,
                'transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-xl',
              )}>
                <MapPin className="w-6 h-6 text-white/70" />
                <p className="font-bold text-white text-base leading-tight">{city.name}</p>
                <CountBadge count={cityCounts[city.name] ?? 0} loading={countsLoading} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Projects (from /projects/featured API) ── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">مشاريع سكنية مميزة</h2>
            <p className="text-sm text-gray-500 mt-0.5">أبرز المشاريع المتاحة حالياً</p>
          </div>
          <Link
            href="/category/real-estate/projects/search"
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonProjectCard key={i} />)}
          </div>
        ) : featuredProjects.length === 0 ? (
          <EmptyShowcase />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {featuredProjects.map((project) => (
              <FeaturedProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
